import XCTest
import AVFoundation
@testable import Djayvo

final class RemixTests: XCTestCase {
    private func fixture() throws -> URL { try XCTUnwrap(Bundle.main.url(forResource: "synthetic-speech", withExtension: "wav")) }
    private func library() throws -> RemixLibrary {
        try RemixLibrary(root: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
    }
    func testInputAndTrimBounds() throws {
        let input = try AudioInput.read(fixture())
        XCTAssertEqual(input.duration, 3.21129, accuracy: 0.001)
        XCTAssertEqual(input.waveform.count, 100)
        let store = try library(); defer { try? FileManager.default.removeItem(at: store.root) }
        let file = store.root.appendingPathComponent("trim.wav")
        XCTAssertThrowsError(try input.writeTrimmed(to: file, start: -1, end: 2))
        XCTAssertThrowsError(try input.writeTrimmed(to: file, start: 0, end: 1))
        XCTAssertThrowsError(try input.writeTrimmed(to: file, start: 0, end: .nan))
        try input.writeTrimmed(to: file, start: 0.2, end: 2.7)
        XCTAssertEqual(try AudioInput.read(file).duration, 2.5, accuracy: 1 / input.rate)
        XCTAssertThrowsError(try input.writeTrimmed(to: file, start: 0.2, end: 2.7))
        for start in [0.01, 0.03, 0.11] {
            let boundary = store.root.appendingPathComponent("boundary-\(start).wav")
            try input.writeTrimmed(to: boundary, start: start, end: start + 2)
            XCTAssertEqual(try AudioInput.read(boundary).duration, 2, accuracy: 0.000001)
        }
    }
    func testOversizedAndCorruptImportsAreRejected() throws {
        let store = try library(); defer { try? FileManager.default.removeItem(at: store.root) }
        let file = store.root.appendingPathComponent("invalid.wav")
        try Data("RIFFbroken".utf8).write(to: file)
        XCTAssertThrowsError(try AudioInput.read(file))
        let handle = try FileHandle(forWritingTo: file)
        try handle.truncate(atOffset: 64 * 1024 * 1024 + 1); try handle.close()
        XCTAssertThrowsError(try AudioInput.read(file))
        let scratch = store.root.appendingPathComponent("capture-\(UUID().uuidString).wav")
        try Data([1]).write(to: scratch)
        try store.removeAbandonedCaptures()
        XCTAssertFalse(FileManager.default.fileExists(atPath: scratch.path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: file.path))
    }
    func testConsentCancellationAndIncompleteRecovery() throws {
        let store = try library(); defer { try? FileManager.default.removeItem(at: store.root) }
        let input = try AudioInput.read(fixture())
        let cancellation = RenderCancellation()
        XCTAssertThrowsError(try store.generate(input: input, start: 0, end: 3, seed: 4123, consent: false, club: false, cancellation: cancellation))
        cancellation.cancel()
        XCTAssertThrowsError(try store.generate(input: input, start: 0, end: 3, seed: 4123, consent: true, club: false, cancellation: cancellation))
        XCTAssertEqual(try store.load().sessions.count, 0)
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: store.root.path).count, 0)
        try FileManager.default.createDirectory(at: store.folder(UUID()), withIntermediateDirectories: false)
        XCTAssertEqual(try store.load().incomplete, 1)
        try store.deleteAll()
        XCTAssertEqual(try store.load().incomplete, 0)
    }
    func testThreeStylesPersistenceTamperAndDeletion() async throws {
        let store = try library(); defer { try? FileManager.default.removeItem(at: store.root) }
        let input = try AudioInput.read(fixture())
        var session = try await Task.detached {
            try store.generate(input: input, start: 0, end: 3, seed: 4123, consent: true, club: false, cancellation: RenderCancellation())
        }.value
        XCTAssertEqual(session.styles, ["hiphop", "reggae", "experimental"])
        for style in session.styles {
            let file = try AVAudioFile(forReading: store.wav(session, style: style))
            XCTAssertEqual(file.processingFormat.sampleRate, 48000)
            XCTAssertEqual(file.processingFormat.channelCount, 2)
            XCTAssertTrue((20...40).contains(Double(file.length) / 48000))
        }
        session.saved = true; try store.save(session)
        XCTAssertTrue(try XCTUnwrap(store.load().sessions.first).saved)
        let device = await MainActor.run { (UIDevice.current.model, UIDevice.current.systemVersion) }
        let evidence: [String: Any] = ["status": "PASS", "generation_seconds": session.generationSeconds,
            "device": device.0, "os": device.1,
            "styles": session.styles, "seed": session.seed, "listening": "NOT RUN"]
        let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: evidence, options: .prettyPrinted), uniformTypeIdentifier: "public.json")
        attachment.name = "device-render-report"; attachment.lifetime = .keepAlways; add(attachment)
        // Preserve synthetic-only artifacts for actual device/Mac waveform and event comparison.
        let artifacts = ["source.wav"] + session.styles.flatMap { style in
            ["wav", "score.json", "events.tsv"].map { "remix.\(style).\($0)" }
        }
        for name in artifacts {
            let file = XCTAttachment(contentsOfFile: store.folder(session.id).appendingPathComponent(name))
            file.name = name; file.lifetime = .keepAlways; add(file)
        }
        try Data([0, 1, 2]).write(to: store.wav(session, style: "hiphop"))
        XCTAssertEqual(try store.load().sessions.count, 0)
        XCTAssertEqual(try store.load().incomplete, 1)
        try store.delete(session)
        XCTAssertEqual(try store.load().incomplete, 0)
    }
    func testWorkerCancellationRemovesUnpublishedFiles() async throws {
        let store = try library(); defer { try? FileManager.default.removeItem(at: store.root) }
        let input = try AudioInput.read(fixture())
        let token = RenderCancellation()
        let worker = Task.detached {
            try store.generate(input: input, start: 0, end: 3, seed: 4123, consent: true, club: false, cancellation: token)
        }
        try await Task.sleep(nanoseconds: 50_000_000)
        token.cancel()
        do { _ = try await worker.value; XCTFail("Expected cancellation") }
        catch RemixError.cancelled { }
        XCTAssertTrue(try FileManager.default.contentsOfDirectory(atPath: store.root.path).isEmpty)
    }
    func testClubAndSameSeedAreDeterministic() throws {
        let store = try library(); defer { try? FileManager.default.removeItem(at: store.root) }
        let input = try AudioInput.read(fixture())
        let a = try store.generate(input: input, start: 0, end: 3, seed: 4123, consent: true, club: true, cancellation: RenderCancellation())
        let b = try store.generate(input: input, start: 0, end: 3, seed: 4123, consent: true, club: true, cancellation: RenderCancellation())
        XCTAssertNotEqual(a.id, b.id)
        XCTAssertEqual(try Data(contentsOf: store.wav(a, style: "club")), try Data(contentsOf: store.wav(b, style: "club")))
        XCTAssertEqual(try store.load().sessions.count, 2)
    }
}
