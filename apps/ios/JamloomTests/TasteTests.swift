import XCTest
import AVFoundation
@testable import Jamloom

final class TasteTests: XCTestCase {
    func testLocalRoundTripAndBounds() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".json")
        defer { try? FileManager.default.removeItem(at: url) }
        var value = TasteProfile(); value.references = ["Original song — Artist"]
        try value.save(to: url); XCTAssertEqual(try TasteProfile.load(from: url), value)
        value.tempo = 0; XCTAssertThrowsError(try value.save(to: url))
        XCTAssertEqual(try TasteProfile.load(from: url).tempo, 110)
        value.tempo = 110; value.instruments = []; XCTAssertThrowsError(try value.validate())
        value.instruments = ["piano"]; value.references = [String(repeating: "x", count: 161)]
        XCTAssertThrowsError(try value.validate())
        value.references = [String(repeating: "🎵", count: 80)]
        XCTAssertNoThrow(try value.validate())
        value.references = [String(repeating: "🎵", count: 81)]
        XCTAssertThrowsError(try value.validate())
    }
    func testLargeWebProfileRetainsMetadataAndLanguageWithoutTruncation() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".json")
        defer { try? FileManager.default.removeItem(at: url) }
        var profile = TasteProfile(); profile.references = (0..<5000).map { "Favorite \($0) — Artist" }; profile.vocalLanguage = "en"
        profile.referenceMetadata = profile.references.enumerated().map { TasteReferenceMetadata(reference: $0.element, genre: "Jazz", source: "itunes", id: $0.offset + 1) }
        try profile.save(to: url); XCTAssertEqual(try TasteProfile.load(from: url), profile)
        profile.references.append("Too many"); XCTAssertThrowsError(try profile.validate()); profile.references.removeLast()
        profile.referenceMetadata!.append(profile.referenceMetadata![0]); XCTAssertThrowsError(try profile.validate()); profile.referenceMetadata!.removeLast()
        profile.vocalLanguage = "unknown"; XCTAssertThrowsError(try profile.validate()); profile.vocalLanguage = "auto"
        profile.setReferences(profile.references[0]); XCTAssertEqual(profile.referenceMetadata?.count, 1); XCTAssertNoThrow(try profile.validate())
    }
    func testCatalogueProfileRoundTripAndEvidence() throws {
        let track = try XCTUnwrap(TasteCatalogue.tracks.first)
        var profile = TasteProfile(); profile.catalogue = [TasteChoice(id: track.id, rating: "love", weight: 4)]
        try profile.validate()
        XCTAssertEqual(TasteCatalogue.scores(profile.catalogue!).first?.score, 8)
        XCTAssertEqual(try JSONDecoder().decode(TasteProfile.self, from: JSONEncoder().encode(profile)), profile)
        profile.catalogue!.append(profile.catalogue![0]); XCTAssertThrowsError(try profile.validate())
        profile.catalogue = [TasteChoice(id: "unknown", rating: "love", weight: 1)]; XCTAssertThrowsError(try profile.validate())
    }
    func testWebSongPreferencesSurviveNativeRoundTrip() throws {
        let json = #"{"version":1,"references":["Favorite song"],"energy":"gentle","tempo":80,"instruments":["piano"],"novelty":50,"direction":1,"songPreferences":[{"reference":"Favorite song","aspects":["gentle","slow","piano","melody"],"weight":5}]}"#
        var profile = try JSONDecoder().decode(TasteProfile.self, from: Data(json.utf8))
        try profile.validate()
        XCTAssertEqual(try JSONDecoder().decode(TasteProfile.self, from: JSONEncoder().encode(profile)), profile)
        XCTAssertEqual(profile.direction, 1)
        profile.songPreferences![0].aspects = ["voice"]; XCTAssertThrowsError(try profile.validate())
        profile.setReferences("Another song"); XCTAssertEqual(profile.songPreferences, [])
        XCTAssertNoThrow(try profile.validate())
        profile.direction = 3; XCTAssertThrowsError(try profile.validate())
    }
    func testCompositionRecoveryDeterminismCancellationAndTamper() throws {
        let store = try RemixLibrary(root: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.root) }
        var profile = TasteProfile(); profile.references = (0..<5000).map { "Favorite song \($0) — Artist" }
        let recipe = TasteRecipe(profile: profile, seconds: 30)
        let a = try store.generateTaste(recipe: recipe, seed: 4123, cancellation: RenderCancellation())
        let b = try store.generateTaste(recipe: recipe, seed: 4123, cancellation: RenderCancellation())
        XCTAssertEqual(try store.load().sessions.count, 2)
        for style in a.styles {
            let wav = store.wav(a, style: style), file = try AVAudioFile(forReading: wav)
            XCTAssertEqual(file.processingFormat.sampleRate, 48000)
            XCTAssertEqual(file.processingFormat.channelCount, 2)
            XCTAssertTrue((28...33).contains(Double(file.length) / 48000))
            XCTAssertEqual(try Data(contentsOf: wav), try Data(contentsOf: store.wav(b, style: style)))
            let attachment = XCTAttachment(contentsOfFile: wav); attachment.name = style
            attachment.lifetime = .keepAlways; add(attachment)
        }
        XCTAssertNotEqual(try Data(contentsOf: store.wav(a, style: "taste_a")), try Data(contentsOf: store.wav(a, style: "taste_b")))
        var voice = TasteProfile(); voice.instruments = ["voice"]
        XCTAssertThrowsError(try store.generateTaste(recipe: TasteRecipe(profile: voice, seconds: 30), seed: 1, cancellation: RenderCancellation()))
        XCTAssertThrowsError(try TasteRecipe(profile: TasteProfile(), seconds: 181).validate())
        let cancelled = RenderCancellation(); cancelled.cancel()
        XCTAssertThrowsError(try store.generateTaste(recipe: recipe, seed: 1, cancellation: cancelled))
        XCTAssertEqual(try store.load().incomplete, 0)
        try Data([0]).write(to: store.wav(a, style: "taste_a"))
        XCTAssertEqual(try store.load().sessions.count, 1)
        XCTAssertEqual(try store.load().incomplete, 1)
        try store.delete(a); try store.delete(b)
        XCTAssertTrue(try store.load().sessions.isEmpty)
    }
    func testCompositionCancellationDuringRender() async throws {
        let store = try RemixLibrary(root: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.root) }
        let token = RenderCancellation()
        let worker = Task.detached { try store.generateTaste(recipe: TasteRecipe(profile: TasteProfile(), seconds: 180), seed: 4123, cancellation: token) }
        try await Task.sleep(nanoseconds: 50_000_000); token.cancel()
        do { _ = try await worker.value; XCTFail("Expected cancellation") } catch RemixError.cancelled { }
        XCTAssertTrue(try FileManager.default.contentsOfDirectory(atPath: store.root.path).isEmpty)
    }
    @MainActor func testPurchasesClosedBeforeQualityAndServerDelivery() async {
        XCTAssertFalse(CreditPurchases.released)
        let account = AccountModel(); XCTAssertFalse(account.canPurchase)
        await account.loadProducts(); XCTAssertTrue(account.creditProducts.isEmpty)
    }
}
