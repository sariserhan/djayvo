import SwiftUI

struct YouTubePlaylistPage: Decodable {
    struct Item: Decodable, Identifiable {
        let title: String
        let url: String
        let artist: String?
        var id: String { url }
    }
    let items: [Item]
    let next: String?
    let skipped: Int
    static func canonical(_ input: String) throws -> String {
        guard input.utf8.count <= 2048, let parts = URLComponents(string: input.trimmingCharacters(in: .whitespacesAndNewlines)),
              parts.scheme == "https", ["youtube.com", "www.youtube.com", "music.youtube.com", "m.youtube.com"].contains(parts.host ?? ""),
              parts.user == nil, parts.password == nil, parts.port == nil, ["/playlist", "/watch"].contains(parts.path),
              let id = parts.queryItems?.first(where: { $0.name == "list" })?.value,
              id.range(of: "^[A-Za-z0-9_-]{10,100}$", options: .regularExpression) != nil else {
            throw RemixError.message("Paste a public or unlisted YouTube Music playlist link.")
        }
        return "https://www.youtube.com/playlist?list=\(id)"
    }
    func validate() throws {
        guard items.count <= 50, (0...50).contains(skipped), next == nil || (!(next?.isEmpty ?? true) && next!.utf8.count <= 2048 && next!.rangeOfCharacter(from: .whitespacesAndNewlines.union(.controlCharacters)) == nil),
              items.allSatisfy({ !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.title.utf16.count <= 160 && $0.title.rangeOfCharacter(from: .controlCharacters) == nil &&
                  $0.url.range(of: "^https://www\\.youtube\\.com/watch\\?v=[A-Za-z0-9_-]{11}$", options: .regularExpression) != nil &&
                  ($0.artist == nil || (!$0.artist!.isEmpty && $0.artist!.utf16.count <= 160 && $0.artist!.rangeOfCharacter(from: .controlCharacters) == nil)) }) else { throw URLError(.cannotParseResponse) }
    }
}

@MainActor final class YouTubeFavorites: ObservableObject {
    @Published private(set) var songs: [MusicSuggestion] = []
    @Published private(set) var unmatched: [YouTubePlaylistPage.Item] = []
    @Published private(set) var busy = false
    @Published private(set) var complete = false
    @Published private(set) var message = ""
    @Published private(set) var checked = 0
    @Published private(set) var count = 0
    private(set) var url: String?
    private var items: [YouTubePlaylistPage.Item] = [], seenItems = Set<String>(), pages = Set<String>(), names = Set<String>()
    private var next: String?, readComplete = false, skipped = 0
    private let request: (String, Data) async throws -> Data
    private let pause: () async throws -> Void
    init(request: @escaping (String, Data) async throws -> Data,
         pause: @escaping () async throws -> Void = { try await Task.sleep(nanoseconds: 60_000_000_000) }) {
        self.request = request; self.pause = pause
    }
    convenience init(transport: AccountTransport) {
        self.init(request: { path, body in try await transport.requestData(path, method: "POST", body: body) })
    }

    private func post(_ path: String, _ body: [String: Any]) async throws -> Data {
        for attempt in 0..<4 {
            try Task.checkCancellation()
            do { return try await request(path, JSONSerialization.data(withJSONObject: body)) }
            catch let error as SongRequestError where error.status == 429 && attempt < 3 {
                message = "Waiting for the catalogue limit · \(checked) / \(count) checked"; try await pause()
            }
        }
        throw URLError(.resourceUnavailable)
    }
    func load(_ input: String) async {
        guard !busy else { return }; busy = true
        defer { busy = false }
        do {
            let target = try YouTubePlaylistPage.canonical(input)
            if url != target {
                url = target; items = []; seenItems = []; pages = []; names = []; songs = []; unmatched = []
                checked = 0; count = 0; next = nil; readComplete = false; complete = false; skipped = 0
            }
            guard !complete else { return }
            while !readComplete {
                try Task.checkCancellation(); message = "Reading playlist · \(count) songs"
                guard pages.count < 100, !pages.contains(next ?? "") else { throw RemixError.message("The playlist could not be read completely. Saved favorites are unchanged.") }
                let data = try await post("/api/playlist-import", ["url": target, "pageToken": next as Any? ?? NSNull()])
                try Task.checkCancellation()
                let page = try JSONDecoder().decode(YouTubePlaylistPage.self, from: data); try page.validate()
                pages.insert(next ?? ""); skipped += page.skipped
                for item in page.items {
                    if seenItems.insert(item.url).inserted { items.append(item) } else { skipped += 1 }
                }
                guard items.count <= TasteProfile.maximumReferences else { throw RemixError.message("Playlists can contain up to 5,000 songs. Saved favorites are unchanged.") }
                count = items.count; next = page.next; readComplete = next == nil
            }
            while checked < items.count {
                try Task.checkCancellation(); message = "Matching songs · \(checked) / \(count) checked"
                let item = items[checked]
                var fields = ["title": item.title]; if let artist = item.artist { fields["artist"] = artist }
                let data = try await post("/api/music-search", ["playlistItem": fields]); try Task.checkCancellation()
                let matches = try JSONDecoder().decode(MusicSearchResult.self, from: data).validated()
                guard matches.count <= 1, matches.allSatisfy({ $0.kind == "Track" && $0.metadata?.source == "itunes" }) else { throw URLError(.cannotParseResponse) }
                if let match = matches.first {
                    if names.insert(match.reference.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))).inserted { songs.append(match) }
                    else { skipped += 1 }
                } else { unmatched.append(item) }
                checked += 1
            }
            complete = true; message = "\(songs.count) matched · \(unmatched.count) unmatched · \(skipped) unavailable or repeated"
        } catch is CancellationError { message = "Stopped. Saved favorites are unchanged. Continue to finish checking." }
        catch { message = Task.isCancelled ? "Stopped. Saved favorites are unchanged. Continue to finish checking." : (error as? SongRequestError)?.message ?? (error as? RemixError)?.localizedDescription ?? "The playlist could not finish loading. Continue to retry; saved favorites are unchanged." }
    }
}

struct YouTubeFavoritesView: View {
    @StateObject private var library: YouTubeFavorites
    @State private var link = ""
    @State private var error = ""
    @State private var loading: Task<Void, Never>?
    @FocusState private var editing: Bool
    @Environment(\.dismiss) private var dismiss
    let profile: TasteProfile
    let save: (TasteProfile, Int) throws -> Void
    init(transport: AccountTransport, profile: TasteProfile, save: @escaping (TasteProfile, Int) throws -> Void) {
        _library = StateObject(wrappedValue: YouTubeFavorites(transport: transport)); self.profile = profile; self.save = save
    }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Paste a YouTube Music playlist link", text: $link).focused($editing).submitLabel(.done).onSubmit { editing = false }.keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled().disabled(library.busy).accessibilityIdentifier("youtubePlaylistLink")
                    Text("Public or unlisted playlists. Only catalogue-matched song names are saved; no audio is imported.").font(.footnote)
                    Button(library.count == 0 ? "Check playlist" : "Continue checking", systemImage: "list.bullet.rectangle") {
                        editing = false; loading = Task { await library.load(link) }
                    }.disabled(library.busy || link.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || (library.complete && (try? YouTubePlaylistPage.canonical(link)) == library.url)).accessibilityIdentifier("checkYouTubePlaylist")
                    if library.busy { ProgressView(); Button("Stop checking") { loading?.cancel() } }
                    if !library.message.isEmpty { Text(library.message).font(.footnote).accessibilityIdentifier("youtubeImportStatus") }
                }
                Section("Matched songs") { ForEach(library.songs, id: \.reference) { song in Label(song.reference, systemImage: "music.note") } }
                if !library.unmatched.isEmpty { DisclosureGroup("\(library.unmatched.count) songs need a match") {
                    ForEach(library.unmatched) { item in Link(item.title, destination: URL(string: item.url)!) }
                    Text("These titles were left out. You can search for them in Music DNA.").font(.footnote)
                } }
                if !error.isEmpty { Text(error) }
            }.navigationTitle("YouTube Music").navigationBarTitleDisplayMode(.inline).preferredColorScheme(.dark).tint(.mint)
                .safeAreaInset(edge: .bottom) {
                    if library.complete && (try? YouTubePlaylistPage.canonical(link)) == library.url && !library.songs.isEmpty { Button("Add matched songs", systemImage: "plus.circle.fill") {
                        do { let result = try profile.adding(library.songs); try save(result.0, result.1); dismiss() }
                        catch { self.error = error.localizedDescription }
                    }.buttonStyle(.borderedProminent).padding().frame(maxWidth: .infinity).background(.regularMaterial).accessibilityIdentifier("addYouTubeFavorites") }
                }
                .toolbar { Button("Cancel") { loading?.cancel(); dismiss() } }
                .onDisappear { loading?.cancel() }
        }
    }
}
