import XCTest
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
    @MainActor func testPurchasesClosedBeforeQualityAndServerDelivery() { XCTAssertFalse(CreditPurchases.released) }
}
