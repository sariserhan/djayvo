import XCTest
import MusicKit
@testable import Jamloom

final class AppleMusicTests: XCTestCase {
    private let songs = Data(#"{"data":[{"type":"library-songs","attributes":{"name":"Tune","artistName":"Artist","inFavorites":true,"genreNames":["Jazz"]}},{"type":"library-songs","attributes":{"name":"Unstarred","artistName":"Artist","inFavorites":false}},{"type":"library-songs","attributes":{"name":"Unknown","artistName":"Artist"}}],"next":"/v1/me/library/songs?offset=100"}"#.utf8)
    private let artists = Data(#"{"data":[{"type":"library-artists","attributes":{"name":"Björk","inFavorites":true},"relationships":{"catalog":{"data":[{"type":"artists","attributes":{"name":"Björk","genreNames":["Alternative"]}}]}}}]}"#.utf8)
    func testOnlyStarredNamesAndGenresAreImportedAndPaginationStaysAtApple() throws {
        let (page, favorites, skipped) = try AppleMusicPage.decode(songs, kind: "songs")
        XCTAssertEqual(favorites, [AppleMusicFavorite(reference: "Tune — Artist", genre: "Jazz", artist: false)])
        XCTAssertEqual(skipped, 0)
        let next = try AppleMusicPage.url(XCTUnwrap(page.next), kind: "songs")
        let query = URLComponents(url: next, resolvingAgainstBaseURL: false)!.queryItems!
        XCTAssertTrue(query.contains(URLQueryItem(name: "offset", value: "100")))
        XCTAssertTrue(query.contains(URLQueryItem(name: "extend", value: "inFavorites")))
        XCTAssertEqual(try AppleMusicPage.decode(artists, kind: "artists").1, [AppleMusicFavorite(reference: "Björk", genre: "Alternative", artist: true)])
        for url in ["https://evil.example/v1/me/library/songs", "//evil.example/v1/me/library/songs", "http://api.music.apple.com/v1/me/library/songs", "https://user@api.music.apple.com/v1/me/library/songs", "/v1/me/library/artists", "/v1/me/library/songs#fragment"] {
            XCTAssertThrowsError(try AppleMusicPage.url(url, kind: "songs"))
        }
        XCTAssertThrowsError(try AppleMusicPage.decode(Data(#"{"data":[],"next":"https://evil.example/"}"#.utf8), kind: "songs"))
        XCTAssertThrowsError(try AppleMusicPage.decode(artists, kind: "songs"))
        XCTAssertThrowsError(try AppleMusicPage.decode(Data(repeating: 0, count: 4 * 1024 * 1024 + 1), kind: "songs"))
        let invalidName = try AppleMusicPage.decode(Data(#"{"data":[{"type":"library-songs","attributes":{"name":" ","artistName":"Artist","inFavorites":true}}]}"#.utf8), kind: "songs")
        XCTAssertTrue(invalidName.1.isEmpty); XCTAssertEqual(invalidName.2, 1)
    }
    func testMergePreservesExistingPreferencesDeduplicatesAndEnforcesCapacity() throws {
        var original = TasteProfile(); original.references = ["BJORK"]
        original.songPreferences = [SongPreference(reference: "BJORK", aspects: ["piano"], weight: 3)]
        let imported = try AppleMusicPage.decode(artists, kind: "artists").1 + AppleMusicPage.decode(songs, kind: "songs").1
        let (merged, count) = try AppleMusicPage.merge(imported + imported, into: original)
        XCTAssertEqual(count, 1); XCTAssertEqual(merged.references, ["BJORK", "Tune — Artist"])
        XCTAssertEqual(merged.songPreferences, original.songPreferences); XCTAssertEqual(original.references, ["BJORK"])
        XCTAssertEqual(merged.referenceMetadata?.first?.source, "apple-music")
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: file) }
        try merged.save(to: file); XCTAssertEqual(try TasteProfile.load(from: file), merged)
        original.references = (0..<4999).map { "Existing \($0)" }; original.songPreferences = nil
        let (full, added) = try AppleMusicPage.merge(imported, into: original)
        XCTAssertEqual(full.references.count, 5000); XCTAssertEqual(added, 1)
        XCTAssertEqual(Array(full.references.prefix(4999)), original.references)
    }
    @MainActor func testExplicitAuthorizationDenialNeverFetchesAndOpeningDoesNotAuthorize() async {
        var requested = 0, fetched = 0
        let library = AppleMusicFavorites(authorize: { requested += 1; return .denied }, fetch: { _ in fetched += 1; return Data() })
        XCTAssertEqual(requested, 0); XCTAssertEqual(fetched, 0)
        await library.load()
        XCTAssertEqual(requested, 1); XCTAssertEqual(fetched, 0); XCTAssertTrue(library.denied); XCTAssertFalse(library.busy)
    }
    @MainActor func testPagingNetworkRetryAndCancellationRetainPreview() async {
        var calls = 0, fail = true
        let library = AppleMusicFavorites(authorize: { .authorized }, fetch: { request in
            calls += 1
            if request.url!.path.hasSuffix("artists") {
                if fail { fail = false; throw URLError(.notConnectedToInternet) }
                return self.artists
            }
            return request.url!.query!.contains("offset") ? Data(#"{"data":[]}"#.utf8) : self.songs
        })
        await library.load(); XCTAssertEqual(calls, 2); XCTAssertEqual(library.favorites.count, 1); XCTAssertTrue(library.canLoad)
        await library.load(); XCTAssertEqual(calls, 4); XCTAssertEqual(library.favorites.count, 2); XCTAssertFalse(library.canLoad)
        await library.load(); XCTAssertEqual(calls, 4)
        let cancelled = AppleMusicFavorites(authorize: { .authorized }, fetch: { _ in throw CancellationError() })
        await cancelled.load(); XCTAssertTrue(cancelled.favorites.isEmpty); XCTAssertFalse(cancelled.busy); XCTAssertTrue(cancelled.canLoad)
    }
}
