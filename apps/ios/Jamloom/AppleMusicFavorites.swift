import Foundation
import MusicKit
import SwiftUI

struct AppleMusicFavorite: Equatable, Identifiable {
    let reference: String
    let genre: String?
    let artist: Bool
    var id: String { reference }
}

struct AppleMusicPage: Decodable {
    struct Entry: Decodable {
        struct Attributes: Decodable {
            let name: String
            let artistName: String?
            let genreNames: [String]?
            let inFavorites: Bool?
        }
        struct Related: Decodable { let data: [Entry] }
        let type: String
        let attributes: Attributes?
        let relationships: [String: Related]?
    }
    let data: [Entry]
    let next: String?
    static func url(_ path: String, kind: String) throws -> URL {
        guard ["songs", "artists"].contains(kind), path.utf8.count <= 2048,
              let url = URL(string: path, relativeTo: URL(string: "https://api.music.apple.com")!)?.absoluteURL,
              url.scheme == "https", url.host == "api.music.apple.com", url.port == nil,
              url.user == nil, url.password == nil, url.fragment == nil,
              url.path == "/v1/me/library/\(kind)" else { throw URLError(.badURL) }
        var parts = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        var query = parts.queryItems ?? []
        // Apple pagination links may omit the extended favorite flag and catalog genres.
        query.removeAll { ["extend", "include"].contains($0.name) }
        query += [URLQueryItem(name: "extend", value: "inFavorites"), URLQueryItem(name: "include", value: "catalog")]
        parts.queryItems = query
        return parts.url!
    }
    static func decode(_ bytes: Data, kind: String) throws -> (AppleMusicPage, [AppleMusicFavorite], Int) {
        guard bytes.count <= 4 * 1024 * 1024 else { throw URLError(.dataLengthExceedsMaximum) }
        let page = try JSONDecoder().decode(Self.self, from: bytes)
        guard page.data.count <= 1000 else { throw URLError(.cannotParseResponse) }
        if let next = page.next { _ = try url(next, kind: kind) }
        var favorites: [AppleMusicFavorite] = [], skipped = 0
        for entry in page.data {
            guard entry.type == "library-\(kind)" else { throw URLError(.cannotParseResponse) }
            guard let item = entry.attributes, item.inFavorites == true else { continue }
            let artist = kind == "artists"
            let reference = (artist ? item.name : "\(item.name) — \(item.artistName ?? "")").trimmingCharacters(in: .whitespacesAndNewlines)
            guard !item.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !reference.isEmpty, reference.utf16.count <= 160, reference.rangeOfCharacter(from: .controlCharacters) == nil,
                  artist || !(item.artistName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true) else { skipped += 1; continue }
            let genre = (item.genreNames ?? entry.relationships?["catalog"]?.data.first?.attributes?.genreNames)?.first { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.utf16.count <= 80 && $0.rangeOfCharacter(from: .controlCharacters) == nil }
            favorites.append(AppleMusicFavorite(reference: reference, genre: genre, artist: artist))
        }
        return (page, favorites, skipped)
    }
    static func merge(_ favorites: [AppleMusicFavorite], into original: TasteProfile) throws -> (TasteProfile, Int) {
        var profile = original, metadata = original.referenceMetadata ?? [], seen = Set(profile.references.map { $0.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX")) }), added = 0
        for item in favorites {
            let key = item.reference.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            guard !seen.contains(key), profile.references.count < TasteProfile.maximumReferences else { continue }
            seen.insert(key); profile.references.append(item.reference); added += 1
            if let genre = item.genre { metadata.append(TasteReferenceMetadata(reference: item.reference, genre: genre, source: "apple-music", id: nil)) }
        }
        if !metadata.isEmpty { profile.referenceMetadata = metadata }; try profile.validate(); return (profile, added)
    }
}

@MainActor final class AppleMusicFavorites: ObservableObject {
    @Published private(set) var favorites: [AppleMusicFavorite] = []
    @Published private(set) var busy = false
    @Published private(set) var message = ""
    @Published private(set) var denied = false
    private var pending = ["songs", "artists"].map { (kind: $0, path: "/v1/me/library/\($0)?limit=100&extend=inFavorites&include=catalog") }
    private var visited = Set<URL>(), seen = Set<String>(), scanned = 0, skipped = 0
    private let authorize: () async -> MusicAuthorization.Status
    private let fetch: (URLRequest) async throws -> Data
    var canLoad: Bool { !pending.isEmpty && favorites.count < TasteProfile.maximumReferences }
    init(authorize: @escaping () async -> MusicAuthorization.Status = { await MusicAuthorization.request() },
         fetch: @escaping (URLRequest) async throws -> Data = { try await MusicDataRequest(urlRequest: $0).response().data }) {
        self.authorize = authorize; self.fetch = fetch
    }
    func load() async {
        guard !busy, canLoad else { return }; busy = true; denied = false
        defer { busy = false }
        guard await authorize() == .authorized else { denied = true; message = "Allow Apple Music access in Settings to load your favorites."; return }
        do {
            // Bound each import pass; the next pass resumes without discarding favorites.
            for _ in 0..<100 {
                try Task.checkCancellation()
                guard canLoad, let cursor = pending.first else { break }
                let url = try AppleMusicPage.url(cursor.path, kind: cursor.kind)
                guard !visited.contains(url) else { throw URLError(.cannotParseResponse) }
                var request = URLRequest(url: url); request.timeoutInterval = 20
                let bytes = try await fetch(request); try Task.checkCancellation()
                let (page, items, rejected) = try AppleMusicPage.decode(bytes, kind: cursor.kind)
                pending.removeFirst(); visited.insert(url); scanned += page.data.count; skipped += rejected
                for item in items where seen.insert(item.reference).inserted && favorites.count < TasteProfile.maximumReferences { favorites.append(item) }
                if let next = page.next { pending.append((cursor.kind, next)) }
                message = "\(favorites.count) favorites found · \(scanned) items checked"
            }
            message = favorites.isEmpty ? "No starred songs or artists found in your Apple Music library." : "\(favorites.count) favorites ready to review."
            if canLoad { message += " More library items are available; continue loading to check them." }
            else if !pending.isEmpty { message += " The 5,000-favorite import limit was reached; remaining library items were not checked." }
            if skipped > 0 { message += " \(skipped) names exceed the supported length or format." }
        } catch is CancellationError { message = "Loading stopped. Your saved favorites are unchanged." }
        catch { message = "Apple Music could not finish loading. Check your connection and Apple Music account, then try again. Your saved favorites are unchanged." }
    }
}

struct AppleMusicFavoritesView: View {
    @StateObject private var library = AppleMusicFavorites()
    @State private var loading: Task<Void, Never>?
    @Environment(\.dismiss) private var dismiss
    let profile: TasteProfile
    let save: (TasteProfile, Int) throws -> Void
    @State private var error = ""
    private var merged: (TasteProfile, Int)? { try? AppleMusicPage.merge(library.favorites, into: profile) }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Label("Your Apple Music favorites", systemImage: "star.circle.fill").font(.title2.bold())
                    Text("Import starred song and artist names for your Music DNA preferences. Review them before adding. Cloud creation asks for separate consent.").font(.footnote)
                    Button(library.favorites.isEmpty ? "Connect & load favorites" : "Load more", systemImage: "music.note") { loading = Task { await library.load() } }
                        .disabled(library.busy || !library.canLoad).accessibilityIdentifier("loadAppleFavorites")
                    if library.busy { ProgressView(); Button("Stop loading") { loading?.cancel() } }
                    if !library.message.isEmpty { Text(library.message).font(.footnote).accessibilityIdentifier("appleFavoritesStatus") }
                    if library.denied { Link("Open Settings", destination: URL(string: UIApplication.openSettingsURLString)!) }
                    Link("Open Apple Music", destination: URL(string: "music://music.apple.com/library")!)
                }
                Section("Import preview") {
                    ForEach(library.favorites) { item in Label(item.reference, systemImage: item.artist ? "person.fill" : "music.note").font(.body) }
                }
                if !error.isEmpty { Text(error) }
            }.navigationTitle("Apple Music").preferredColorScheme(.dark).tint(.mint)
                .safeAreaInset(edge: .bottom) {
                    if let merged, merged.1 > 0 { VStack(spacing: 8) {
                        Button("Add \(merged.1) favorites", systemImage: "plus.circle.fill") {
                            do { try save(merged.0, merged.1); dismiss() } catch { self.error = "Favorites could not be saved. Try again." }
                        }.buttonStyle(.borderedProminent).disabled(library.busy).accessibilityIdentifier("addAppleFavorites")
                        Text("Existing favorites stay. Maximum 5,000 names in total.").font(.caption)
                    }.frame(maxWidth: .infinity).padding().background(.regularMaterial) }
                }
                .toolbar { Button("Cancel") { loading?.cancel(); dismiss() } }
                .onDisappear { loading?.cancel() }
        }
    }
}
