import Foundation
import CryptoKit

enum RemixError: LocalizedError {
    case message(String), cancelled
    var errorDescription: String? {
        switch self { case .message(let text): return text; case .cancelled: return "Generation cancelled. Your earlier mixes are safe." }
    }
}

final class RenderCancellation: @unchecked Sendable {
    private let lock = NSLock()
    private var stopped = false
    func cancel() { lock.lock(); stopped = true; lock.unlock() }
    var isCancelled: Bool { lock.lock(); defer { lock.unlock() }; return stopped }
}

enum RemixEngine {
    static let styles = ["hiphop", "reggae", "experimental"]
    static func render(source: URL, prefix: URL, seed: UInt32, consent: Bool,
                       club: Bool = false, cancellation: RenderCancellation) throws {
        guard consent else { throw RemixError.message("Confirm permission to process this sound first.") }
        let context = Unmanaged.passUnretained(cancellation).toOpaque()
        var error = [CChar](repeating: 0, count: 1024)
        let result = source.path.withCString { input in
            prefix.path.withCString { output in
                var options = JamloomRenderOptions(struct_size: UInt32(MemoryLayout<JamloomRenderOptions>.size),
                    abi_version: JAMLOOM_ABI_VERSION, input_path: input, output_prefix: output,
                    sample_rate: 48000, seed: seed, block_size: 512, flags: JAMLOOM_CONSENT, strategy: club ? 5 : 0)
                return jamloom_render_file_cancellable(&options, { context in
                    guard let context else { return 1 }
                    return Unmanaged<RenderCancellation>.fromOpaque(context).takeUnretainedValue().isCancelled ? 1 : 0
                }, context, &error, error.count)
            }
        }
        if result == 4 { throw RemixError.cancelled }
        guard result == 0 else { throw RemixError.message(String(cString: error)) }
        if cancellation.isCancelled { throw RemixError.cancelled }
        try verify(source: source, prefix: prefix, styles: club ? ["club"] : styles)
    }

    struct Completion: Decodable {
        struct Artifact: Decodable { let suffix: String; let bytes: Int; let sha256: String }
        let schema_version: String
        let status: String
        let source_sha256: String
        let artifacts: [Artifact]
    }
    static func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
    static func verify(source: URL, prefix: URL, styles: [String]) throws {
        let sourceValues = try source.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey, .isSymbolicLinkKey])
        guard sourceValues.isRegularFile == true, sourceValues.isSymbolicLink != true,
              let sourceSize = sourceValues.fileSize, sourceSize > 0, sourceSize <= 64 * 1024 * 1024 else {
            throw RemixError.message("The saved source is missing or invalid.")
        }
        let marker = URL(fileURLWithPath: prefix.path + ".complete.json")
        let markerValues = try marker.resourceValues(forKeys: [.fileSizeKey, .isSymbolicLinkKey])
        guard markerValues.isSymbolicLink != true, (markerValues.fileSize ?? 65537) <= 65536 else {
            throw RemixError.message("Invalid export completion record.")
        }
        let record = try JSONDecoder().decode(Completion.self, from: Data(contentsOf: marker))
        let expected = Set(styles.flatMap { style in ["wav", "score.json", "report.json", "events.tsv"].map { ".\(style).\($0)" } })
        guard record.schema_version == "1.0-export", record.status == "complete",
              record.source_sha256 == hash(try Data(contentsOf: source)), record.artifacts.count == expected.count,
              Set(record.artifacts.map(\.suffix)) == expected else { throw RemixError.message("The export is incomplete.") }
        for artifact in record.artifacts {
            let url = URL(fileURLWithPath: prefix.path + artifact.suffix)
            let values = try url.resourceValues(forKeys: [.isSymbolicLinkKey, .isRegularFileKey, .fileSizeKey])
            guard values.isSymbolicLink != true, values.isRegularFile == true,
                  artifact.bytes > 0, artifact.bytes <= 64 * 1024 * 1024, values.fileSize == artifact.bytes,
                  hash(try Data(contentsOf: url)) == artifact.sha256 else { throw RemixError.message("A saved mix is missing or has changed.") }
        }
        for style in styles {
            let score = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: prefix.path + ".\(style).score.json"))) as? [String: Any]
            guard score?["source_asset_id"] as? String == "sha256:" + record.source_sha256 else {
                throw RemixError.message("The saved mix has inconsistent source information.")
            }
        }
    }
}
