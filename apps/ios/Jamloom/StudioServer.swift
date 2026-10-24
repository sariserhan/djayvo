import Foundation
import Network

// Serves only audited application resources, never imported tracks or the user's library.
final class StudioServer {
    private let root: URL
    private let token = UUID().uuidString
    private let queue = DispatchQueue(label: "com.jamloom.studio-assets")
    private var listener: NWListener?
    private var connections: [UUID: NWConnection] = [:]
    init(root: URL) { self.root = root.resolvingSymlinksInPath() }

    func start(ready: @escaping (Result<URL, Error>) -> Void) throws {
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
        let listener = try NWListener(using: parameters)
        self.listener = listener
        listener.stateUpdateHandler = { [weak self, weak listener] state in
            guard let self else { return }
            switch state {
            case .ready:
                if let port = listener?.port { ready(.success(URL(string: "http://127.0.0.1:\(port.rawValue)/\(self.token)/dj.html")!)) }
            case .failed(let error): ready(.failure(error))
            default: break
            }
        }
        listener.newConnectionHandler = { [weak self] connection in
            guard let self, self.connections.count < 32 else { connection.cancel(); return }
            let id = UUID(); self.connections[id] = connection
            connection.start(queue: self.queue)
            self.queue.asyncAfter(deadline: .now() + 15) { [weak self] in self?.finish(id) }
            self.receive(connection, id: id, data: Data())
        }
        listener.start(queue: queue)
    }
    private func finish(_ id: UUID) { connections.removeValue(forKey: id)?.cancel() }
    private func receive(_ connection: NWConnection, id: UUID, data: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] chunk, _, complete, error in
            guard let self, self.connections[id] != nil else { return }
            var next = data; if let chunk { next.append(chunk) }
            if next.count > 8192 { self.finish(id); return }
            if next.range(of: Data("\r\n\r\n".utf8)) != nil {
                let port = self.listener?.port?.rawValue ?? 0
                let response = Self.response(next, root: self.root, prefix: "/\(self.token)/", authority: "127.0.0.1:\(port)")
                connection.send(content: response, completion: .contentProcessed { [weak self] _ in self?.finish(id) })
            } else if complete || error != nil { self.finish(id) }
            else { self.receive(connection, id: id, data: next) }
        }
    }
    static func response(_ request: Data, root: URL, prefix: String, authority: String) -> Data {
        func reply(_ status: Int, _ body: Data = Data(), mime: String = "text/plain", head: Bool = false) -> Data {
            let csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
            let headers = "HTTP/1.1 \(status) Result\r\nConnection: close\r\nContent-Type: \(mime)\r\nContent-Length: \(body.count)\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: \(csp)\r\nCross-Origin-Resource-Policy: same-origin\r\nPermissions-Policy: camera=(), microphone=(), geolocation=()\r\n\r\n"
            return Data(headers.utf8) + (head ? Data() : body)
        }
        guard request.count <= 8192, let end = request.range(of: Data("\r\n\r\n".utf8)), end.upperBound == request.count,
              let text = String(data: request[..<end.lowerBound], encoding: .utf8) else { return reply(400) }
        let lines = text.components(separatedBy: "\r\n"), first = lines[0].split(separator: " ")
        guard first.count == 3, first[2] == "HTTP/1.1", ["GET", "HEAD"].contains(first[0]) else { return reply(405) }
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            guard let colon = line.firstIndex(of: ":"), !line.hasPrefix(" "), !line.hasPrefix("\t") else { return reply(400) }
            let key = line[..<colon].lowercased()
            guard !key.isEmpty, headers[key] == nil else { return reply(400) }
            headers[key] = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
        }
        guard headers["host"] == authority, headers["transfer-encoding"] == nil,
              headers["content-length"] == nil || headers["content-length"] == "0",
              headers["origin"] == nil || headers["origin"] == "http://\(authority)",
              headers["sec-fetch-site"] != "cross-site" else { return reply(403) }
        let rawPath = String(first[1].split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)[0])
        guard let path = rawPath.removingPercentEncoding, path.hasPrefix(prefix), !path.contains("\\"), !path.contains("\0") else { return reply(404) }
        let relative = String(path.dropFirst(prefix.count))
        guard !relative.isEmpty, !relative.split(separator: "/", omittingEmptySubsequences: false).contains(where: { $0.isEmpty || $0 == "." || $0 == ".." }) else { return reply(404) }
        let root = root.resolvingSymlinksInPath(), file = root.appendingPathComponent(relative).resolvingSymlinksInPath()
        let types = ["html":"text/html; charset=utf-8", "js":"text/javascript", "mjs":"text/javascript", "css":"text/css", "wasm":"application/wasm", "json":"application/json", "svg":"image/svg+xml", "png":"image/png", "mp3":"audio/mpeg", "txt":"text/plain; charset=utf-8"]
        guard file.path.hasPrefix(root.path + "/"), let mime = types[file.pathExtension],
              let size = try? file.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey]), size.isRegularFile == true,
              let count = size.fileSize, count <= 32 * 1024 * 1024, let body = try? Data(contentsOf: file, options: .mappedIfSafe) else { return reply(404) }
        return reply(200, body, mime: mime, head: first[0] == "HEAD")
    }
    deinit { listener?.cancel(); connections.values.forEach { $0.cancel() } }
}
