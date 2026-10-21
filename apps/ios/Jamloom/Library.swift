import Foundation

struct RemixSession: Codable, Identifiable, Sendable {
    let id: UUID
    let created: Date
    let seed: UInt32
    let styles: [String]
    let generationSeconds: Double
    var saved: Bool
}

struct RemixLibrary: Sendable {
    let root: URL
    static func application() throws -> Self {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            var root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Jamloom-UI-Tests")
            if let run = ProcessInfo.processInfo.environment["JAMLOOM_UI_TEST_LIBRARY"], let id = UUID(uuidString: run) {
                root.appendPathComponent(id.uuidString)
            }
            return try Self(root: root)
        }
        #endif
        return try Self()
    }
    init(root: URL? = nil) throws {
        // Keep the on-device directory so existing recordings remain available.
        self.root = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Djayvo", isDirectory: true)
        try FileManager.default.createDirectory(at: self.root, withIntermediateDirectories: true)
        var location = self.root
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try location.setResourceValues(values)
    }
    func folder(_ id: UUID) -> URL { root.appendingPathComponent(id.uuidString, isDirectory: true) }
    func prefix(_ id: UUID) -> URL { folder(id).appendingPathComponent("remix") }
    func wav(_ session: RemixSession, style: String) -> URL {
        folder(session.id).appendingPathComponent("remix.\(style).wav")
    }
    func save(_ session: RemixSession) throws {
        try JSONEncoder().encode(session).write(to: folder(session.id).appendingPathComponent("session.json"), options: .atomic)
    }
    func load() throws -> (sessions: [RemixSession], incomplete: Int) {
        let folders = try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: [.isSymbolicLinkKey])
        var sessions: [RemixSession] = []
        var incomplete = 0
        for folder in folders where UUID(uuidString: folder.lastPathComponent) != nil {
            do {
                guard try folder.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink != true else { throw RemixError.message("Invalid saved folder.") }
                let metadata = folder.appendingPathComponent("session.json")
                guard (try metadata.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 65537) <= 65536 else { throw RemixError.message("Invalid session record.") }
                let session = try JSONDecoder().decode(RemixSession.self, from: Data(contentsOf: metadata))
                guard session.id.uuidString == folder.lastPathComponent,
                      session.styles == RemixEngine.styles || session.styles == ["club"] else { throw RemixError.message("Invalid saved session.") }
                try RemixEngine.verify(source: folder.appendingPathComponent("source.wav"), prefix: prefix(session.id), styles: session.styles)
                sessions.append(session)
            } catch { incomplete += 1 }
        }
        return (sessions.sorted { $0.created > $1.created }, incomplete)
    }
    func generate(input: AudioInput, start: Double, end: Double, seed: UInt32, consent: Bool,
                  club: Bool, cancellation: RenderCancellation) throws -> RemixSession {
        guard consent else { throw RemixError.message("Confirm permission to process this sound first.") }
        let entries = try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)
        guard entries.filter({ UUID(uuidString: $0.lastPathComponent) != nil }).count < 50 else {
            throw RemixError.message("Your library has 50 sessions. Delete a session before making more music.")
        }
        let id = UUID()
        let directory = folder(id)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        do {
            let started = ProcessInfo.processInfo.systemUptime
            let source = directory.appendingPathComponent("source.wav")
            try input.writeTrimmed(to: source, start: start, end: end)
            try RemixEngine.render(source: source, prefix: prefix(id), seed: seed, consent: consent, club: club, cancellation: cancellation)
            guard !cancellation.isCancelled else { throw RemixError.cancelled }
            let session = RemixSession(id: id, created: Date(), seed: seed,
                styles: club ? ["club"] : RemixEngine.styles,
                generationSeconds: ProcessInfo.processInfo.systemUptime - started, saved: false)
            try save(session)
            return session
        } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
    }
    func removeAbandonedCaptures() throws {
        for url in try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil) {
            let name = url.deletingPathExtension().lastPathComponent
            if url.pathExtension == "wav", name.hasPrefix("capture-"), UUID(uuidString: String(name.dropFirst(8))) != nil {
                try FileManager.default.removeItem(at: url)
            }
        }
    }
    func delete(_ session: RemixSession) throws { try FileManager.default.removeItem(at: folder(session.id)) }
    func deleteAll() throws {
        // Only this app's private library is removed; exported copies belong to the user.
        try FileManager.default.removeItem(at: root)
        _ = try RemixLibrary(root: root)
    }
}
