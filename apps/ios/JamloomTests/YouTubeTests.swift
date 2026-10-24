import XCTest
@testable import Jamloom

@MainActor final class YouTubeTests: XCTestCase {
    private let link = "https://music.youtube.com/playlist?list=PL1234567890"
    private func data(_ value: Any) throws -> Data { try JSONSerialization.data(withJSONObject: value) }
    private func item(_ number: Int, _ title: String) -> [String: String] {
        ["title": title, "url": "https://www.youtube.com/watch?v=abcdefghij\(number)", "artist": "Artist"]
    }
    private func match() throws -> Data { try data(["suggestions": [["reference": "Song — Artist", "kind": "Track", "metadata": ["reference": "Song — Artist", "genre": "Jazz", "source": "itunes", "id": 1]]]]) }
    func testPlaylistBoundaryAndMatchedMergePreserveLocalPreferences() throws {
        XCTAssertEqual(try YouTubePlaylistPage.canonical(link), "https://www.youtube.com/playlist?list=PL1234567890")
        for url in ["http://youtube.com/playlist?list=PL1234567890", "https://youtube.com.evil.test/playlist?list=PL1234567890", "https://user@youtube.com/playlist?list=PL1234567890", "https://youtube.com:443/playlist?list=PL1234567890", "https://youtu.be/abcdefghijk", "https://music.youtube.com/playlist?list=short"] {
            XCTAssertThrowsError(try YouTubePlaylistPage.canonical(url))
        }
        let invalid = try JSONDecoder().decode(YouTubePlaylistPage.self, from: data(["items": [["title": "Song", "url": "https://evil.test/song"]], "skipped": 0, "next": NSNull()]))
        XCTAssertThrowsError(try invalid.validate())
        var original = TasteProfile(); original.references = ["Existing"]
        original.songPreferences = [SongPreference(reference: "Existing", aspects: ["piano"], weight: 4)]
        let songs = try JSONDecoder().decode(MusicSearchResult.self, from: match()).validated()
        let merged = try original.adding(songs + songs)
        XCTAssertEqual(merged.1, 1); XCTAssertEqual(merged.0.references, ["Existing", "Song — Artist"])
        XCTAssertEqual(merged.0.referenceMetadata?.first?.source, "itunes"); XCTAssertEqual(merged.0.songPreferences, original.songPreferences)
        XCTAssertEqual(original.references, ["Existing"])
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: file) }
        try merged.0.save(to: file); XCTAssertEqual(try TasteProfile.load(from: file), merged.0)
        original.references = (0..<5000).map { "Existing \($0)" }; original.songPreferences = nil
        XCTAssertThrowsError(try original.adding(songs)); XCTAssertEqual(original.references.count, 5000)
    }
    func testWholePlaylistPaginationQuotaWaitMatchingAndDeduplication() async throws {
        var reads = 0, matches = 0, waits = 0, limited = true
        let importer = YouTubeFavorites(request: { path, bytes in
            let body = try JSONSerialization.jsonObject(with: bytes) as! [String: Any]
            if path == "/api/playlist-import" {
                reads += 1
                if reads == 1 { return try self.data(["items": [self.item(1, "Song"), self.item(2, "Unmatched")], "next": "second", "skipped": 1]) }
                XCTAssertEqual(body["pageToken"] as? String, "second")
                return try self.data(["items": [self.item(1, "Song"), self.item(3, "Same song")], "next": NSNull(), "skipped": 0])
            }
            XCTAssertEqual(path, "/api/music-search")
            if limited { limited = false; throw SongRequestError(status: 429, message: "Wait") }
            matches += 1
            let title = (body["playlistItem"] as! [String: String])["title"]!
            return title == "Unmatched" ? try self.data(["suggestions": []]) : try self.match()
        }, pause: { waits += 1 })
        await importer.load(link)
        XCTAssertTrue(importer.complete); XCTAssertFalse(importer.busy)
        XCTAssertEqual(reads, 2); XCTAssertEqual(matches, 3); XCTAssertEqual(waits, 1)
        XCTAssertEqual(importer.count, 3); XCTAssertEqual(importer.checked, 3)
        XCTAssertEqual(importer.songs.count, 1); XCTAssertEqual(importer.unmatched.first?.title, "Unmatched")
        await importer.load(link); XCTAssertEqual(reads, 2); XCTAssertEqual(matches, 3)
    }
    func testCancellationCanResumeButCyclicOrUnmatchedDataCannotSave() async throws {
        var reads = 0, cancel = true
        let importer = YouTubeFavorites(request: { path, _ in
            if path == "/api/playlist-import" { reads += 1; return try self.data(["items": [self.item(1, "Song")], "next": NSNull(), "skipped": 0]) }
            if cancel { cancel = false; throw CancellationError() }
            return try self.match()
        })
        await importer.load(link); XCTAssertFalse(importer.complete); XCTAssertTrue(importer.songs.isEmpty)
        await importer.load(link); XCTAssertTrue(importer.complete); XCTAssertEqual(reads, 1)
        let cycle = YouTubeFavorites(request: { _, _ in try self.data(["items": [], "next": "same", "skipped": 0]) })
        await cycle.load(link); XCTAssertFalse(cycle.complete); XCTAssertTrue(cycle.songs.isEmpty)
        let untrusted = YouTubeFavorites(request: { path, _ in
            if path == "/api/playlist-import" { return try self.data(["items": [self.item(1, "Raw title")], "next": NSNull(), "skipped": 0]) }
            return try self.data(["suggestions": [["reference": "Raw title", "kind": "Track"]]])
        })
        await untrusted.load(link); XCTAssertFalse(untrusted.complete); XCTAssertTrue(untrusted.songs.isEmpty)
    }
}
