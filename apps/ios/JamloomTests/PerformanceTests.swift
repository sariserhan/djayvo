import XCTest
@testable import Jamloom

final class PerformanceTests: XCTestCase {
    func testThreeStyleGenerationMetrics() throws {
        let source = try XCTUnwrap(Bundle.main.url(forResource: "synthetic-speech", withExtension: "wav"))
        let input = try AudioInput.read(source)
        let options = XCTMeasureOptions()
        options.iterationCount = 3
        measure(metrics: [XCTClockMetric(), XCTCPUMetric(), XCTMemoryMetric()], options: options) {
            do {
                let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
                defer { try? FileManager.default.removeItem(at: root) }
                let library = try RemixLibrary(root: root)
                let session = try library.generate(input: input, start: 0, end: 3, seed: 4123,
                    consent: true, club: false, cancellation: RenderCancellation())
                XCTAssertEqual(session.styles.count, 3)
            } catch { XCTFail(error.localizedDescription) }
        }
    }
}
