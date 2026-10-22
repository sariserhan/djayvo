import Foundation

struct TasteRecipe: Codable, Equatable, Sendable {
    let profile: TasteProfile
    let seconds: Int
    var direction: Int? = nil
    func validate() throws {
        try profile.validate()
        guard (30...180).contains(seconds), (0...2).contains(direction ?? 0), mask != 0 else {
            throw RemixError.message("Choose at least one non-voice instrument and 30–180 seconds. Voice needs a recording in Improvise.")
        }
    }
    var mask: UInt32 {
        ["piano", "guitar", "bass", "drums", "synth"].enumerated().reduce(0) {
            $0 | (profile.instruments.contains($1.element) ? UInt32(1 << $1.offset) : 0)
        }
    }
}
struct TasteArtifact: Codable, Sendable {
    let path: String
    let sha256: String
}

extension RemixLibrary {
    func generateTaste(recipe: TasteRecipe, seed: UInt32, cancellation: RenderCancellation) throws -> RemixSession {
        try recipe.validate()
        guard try FileManager.default.contentsOfDirectory(atPath: root.path).filter({ UUID(uuidString: $0) != nil }).count < 50 else {
            throw RemixError.message("Your library has 50 sessions. Delete a session before making more music.")
        }
        let id = UUID(), started = ProcessInfo.processInfo.systemUptime
        try FileManager.default.createDirectory(at: folder(id), withIntermediateDirectories: false)
        do {
            var session = RemixSession(id: id, created: Date(), seed: seed, styles: ["taste_a", "taste_b"],
                generationSeconds: 0, saved: false, taste: recipe)
            var artifacts: [TasteArtifact] = []
            for (index, style) in session.styles.enumerated() {
                var error = [CChar](repeating: 0, count: 1024)
                let result = folder(id).appendingPathComponent(style).path.withCString { directory in
                    jamloom_render_taste(directory, seed &+ UInt32(index), UInt32(recipe.profile.tempo),
                        UInt32(["gentle", "balanced", "intense"].firstIndex(of: recipe.profile.energy)!),
                        recipe.mask, UInt32(recipe.profile.novelty), UInt32(recipe.seconds), UInt32(((recipe.direction ?? 0) + index) % 3), { context in
                            guard let context else { return 1 }
                            return Unmanaged<RenderCancellation>.fromOpaque(context).takeUnretainedValue().isCancelled ? 1 : 0
                        }, Unmanaged.passUnretained(cancellation).toOpaque(), &error, error.count)
                }
                if result == 4 { throw RemixError.cancelled }
                guard result == 0 else { throw RemixError.message(String(cString: error)) }
                for suffix in ["wav", "score.json", "report.json"] {
                    let path = "\(style)/music.\(suffix)"
                    artifacts.append(TasteArtifact(path: path, sha256: RemixEngine.hash(try Data(contentsOf: folder(id).appendingPathComponent(path)))))
                }
            }
            if cancellation.isCancelled { throw RemixError.cancelled }
            session = RemixSession(id: id, created: session.created, seed: seed, styles: session.styles,
                generationSeconds: ProcessInfo.processInfo.systemUptime - started, saved: false, taste: recipe, artifacts: artifacts)
            try verifyTaste(session)
            try save(session)
            return session
        } catch {
            try? FileManager.default.removeItem(at: folder(id))
            throw error
        }
    }

    func verifyTaste(_ session: RemixSession) throws {
        guard let recipe = session.taste, let artifacts = session.artifacts,
              session.styles == ["taste_a", "taste_b"] else { throw RemixError.message("Incomplete composition.") }
        try recipe.validate()
        let expected = Set(session.styles.flatMap { style in ["wav", "score.json", "report.json"].map { "\(style)/music.\($0)" } })
        guard artifacts.count == expected.count, Set(artifacts.map(\.path)) == expected else { throw RemixError.message("Incomplete composition.") }
        for style in session.styles {
            let values = try folder(session.id).appendingPathComponent(style).resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
            guard values.isDirectory == true, values.isSymbolicLink != true else { throw RemixError.message("Invalid composition folder.") }
        }
        for artifact in artifacts {
            let file = folder(session.id).appendingPathComponent(artifact.path)
            let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
            guard values.isRegularFile == true, values.isSymbolicLink != true,
                  let size = values.fileSize, size > 0, size <= 64 * 1024 * 1024,
                  RemixEngine.hash(try Data(contentsOf: file)) == artifact.sha256 else {
                throw RemixError.message("A saved composition is missing or has changed.")
            }
        }
    }
}
