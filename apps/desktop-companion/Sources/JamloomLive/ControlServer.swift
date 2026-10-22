import Foundation
import Network
import Security

struct LiveControls: Codable, Equatable {
    var level = 0.7, low = 0.0, mid = 0.0, high = 0.0, tone = 18000.0, echo = 0.0
    var bypass = false, roll = false, percussion = false
    var highpass = 20.0, echoSeconds = 0.3, loopBeats = 1.0, tempo = 120.0, scratchRate = 0.0
    var reverse = false, scratch = false, mute = false
    var valid: Bool {
        level.isFinite && (0...0.8).contains(level) && [low,mid,high].allSatisfy { $0.isFinite && (-24...6).contains($0) } && tone.isFinite && (100...18000).contains(tone) && echo.isFinite && (0...0.4).contains(echo) &&
        highpass.isFinite && (20...4000).contains(highpass) && echoSeconds.isFinite && (0.05...1).contains(echoSeconds) && [0.25,0.5,1,2,4].contains(loopBeats) && tempo.isFinite && (60...200).contains(tempo) && scratchRate.isFinite && (-2...2).contains(scratchRate)
    }
    var dictionary: [String: Any] { (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(self))) as? [String: Any] ?? [:] }
    mutating func returnLive() { roll=false;reverse=false;scratch=false;scratchRate=0 }
}
struct MixControls: Codable, Equatable {
    var decks = [LiveControls(),LiveControls()]
    var crossfader = 0.5, master = 0.9
    var valid: Bool { decks.count==2 && decks.allSatisfy(\.valid) && crossfader.isFinite && (0...1).contains(crossfader) && master.isFinite && (0...1).contains(master) }
    var dictionary: [String: Any] { (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(self))) as? [String: Any] ?? [:] }
    func gain(_ deck:Int) -> Double {
        // Each native route is capped at half scale, including crossfade transients.
        master*0.5*(deck==0 ? cos(crossfader * .pi/2) : sin(crossfader * .pi/2))
    }
    static func decode(_ data: Data) -> MixControls? {
        guard let object=try? JSONSerialization.jsonObject(with:data) as? [String:Any],Set(object.keys)==Set(["decks","crossfader","master"]),
              let decks=object["decks"] as? [[String:Any]],decks.count==2,decks.allSatisfy({Set($0.keys)==Set(LiveControls().dictionary.keys)}),
              let value=try? JSONDecoder().decode(Self.self,from:data),value.valid else { return nil }
        return value
    }
}

struct SampleAction:Codable {
    let action:String
    var deck:Int?=nil
    static func decode(_ data:Data)->SampleAction? {
        guard let object=try? JSONSerialization.jsonObject(with:data) as? [String:Any],let value=try? JSONDecoder().decode(Self.self,from:data) else { return nil }
        if value.action=="play" { guard Set(object.keys)==Set(["action","deck"]),let deck=value.deck,(0..<2).contains(deck) else { return nil } }
        else { guard ["stop","clear"].contains(value.action),Set(object.keys)==Set(["action"]) else { return nil } }
        return value
    }
}

struct LocalRequest {
    let method: String, path: String, headers: [String: String], body: Data
    static func parse(_ data: Data) throws -> LocalRequest? {
        guard data.count <= 8192 else { throw URLError(.dataLengthExceedsMaximum) }
        guard let end = data.range(of: Data("\r\n\r\n".utf8)) else { return nil }
        guard end.upperBound <= 4096, let head = String(data: data[..<end.lowerBound], encoding: .utf8) else { throw URLError(.badServerResponse) }
        let lines = head.components(separatedBy: "\r\n"), start = lines[0].split(separator: " ")
        guard start.count == 3, start[2] == "HTTP/1.1" else { throw URLError(.badServerResponse) }
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            guard let colon = line.firstIndex(of: ":"), !line.hasPrefix(" "), !line.hasPrefix("\t") else { throw URLError(.badServerResponse) }
            let key = line[..<colon].lowercased(), value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
            guard !key.isEmpty, headers[key] == nil else { throw URLError(.badServerResponse) }
            headers[key] = value
        }
        guard headers["transfer-encoding"] == nil, let length = Int(headers["content-length"] ?? "0"), (0...2048).contains(length) else { throw URLError(.badServerResponse) }
        let total = end.upperBound + length
        if data.count < total { return nil }
        guard data.count == total else { throw URLError(.badServerResponse) }
        return LocalRequest(method: String(start[0]), path: String(start[1]), headers: headers, body: data[end.upperBound...])
    }
}

// The browser sends controls only. Audio never traverses this listener.
final class ControlServer {
    static let port: UInt16 = 48191
    static let origins: Set<String> = ["https://www.jamloom.com", "https://jamloom.com", "http://127.0.0.1:3000", "http://127.0.0.1:4234"]
    var status: () -> [String: Any] = { [:] }, apply: (MixControls) -> Void = { _ in }, stop: () -> Void = {}
    var sample:(SampleAction)->Bool = { _ in false }
    var connectionChanged: (String) -> Void = { _ in }
    private var listener: NWListener?
    private var connections: [UUID: NWConnection] = [:]
    private(set) var token = "", origin = ""
    private(set) var expires = Date.distantPast, lastSeen = Date.distantPast
    private(set) var connected = false
    func pair(origin: String, now: Date = Date()) throws -> String {
        guard Self.origins.contains(origin) else { throw URLError(.unsupportedURL) }
        if connected { stop() }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw URLError(.unknown) }
        token = bytes.map { String(format: "%02x", $0) }.joined(); self.origin = origin
        expires = now.addingTimeInterval(900); lastSeen = .distantPast; connected = false
        return token
    }
    func revoke() {
        if connected { stop() }
        token = ""; connected = false; expires = .distantPast
        connectionChanged("Website disconnected. Pair again to reconnect.")
    }
    func tick(now: Date = Date()) {
        guard !token.isEmpty else { return }
        if now >= expires || (connected && now.timeIntervalSince(lastSeen) > 5) { revoke() }
    }
    func start() throws {
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: Self.port)!)
        let listener = try NWListener(using: parameters)
        listener.stateUpdateHandler = { [weak self] state in
            if case .failed = state { self?.revoke(); self?.connectionChanged("Website connection unavailable. Use the native controls.") }
        }
        listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
        self.listener = listener; listener.start(queue: .main)
    }
    func shutdown() { revoke(); listener?.cancel(); for c in connections.values { c.cancel() }; connections.removeAll() }
    func handle(_ request: LocalRequest, now: Date = Date()) -> (Int, [String: Any], String?) {
        guard request.headers["host"] == "127.0.0.1:\(Self.port)", let incoming = request.headers["origin"], incoming == origin, Self.origins.contains(incoming) else { return (403,["error":"Origin rejected"],nil) }
        guard ["/status", "/controls", "/stop", "/sampler"].contains(request.path) else { return (404,["error":"Unknown command"],incoming) }
        if request.method == "OPTIONS" {
            guard ["GET","POST"].contains(request.headers["access-control-request-method"] ?? ""), !token.isEmpty, now < expires else { return (403,["error":"Pair in the companion first"],incoming) }
            return (204,[:],incoming)
        }
        guard !token.isEmpty, now < expires, request.headers["authorization"] == "Bearer " + token else { return (401,["error":"Pairing expired. Reconnect from the companion."],incoming) }
        switch (request.method,request.path) {
        case ("GET","/status"):
            guard request.body.isEmpty else { return (400,["error":"Unexpected body"],incoming) }
        case ("POST","/controls"):
            guard request.headers["content-type"] == "application/json", let controls = MixControls.decode(request.body) else { return (400,["error":"Invalid controls"],incoming) }
            apply(controls)
        case ("POST","/sampler"):
            guard request.headers["content-type"]=="application/json",let action=SampleAction.decode(request.body) else { return (400,["error":"Invalid sample command"],incoming) }
            guard sample(action) else { return (409,["error":"Record a sample and start the selected deck in Jamloom Live."],incoming) }
        case ("POST","/stop"):
            guard request.body.isEmpty else { return (400,["error":"Unexpected body"],incoming) }
            stop()
        default: return (405,["error":"Unsupported command"],incoming)
        }
        if !connected { connectionChanged("Website connected. Closing the page stops native capture within 5 seconds.") }
        lastSeen = now; connected = true
        return (200,status().merging(["protocolVersion":2,"expiresAt":expires.timeIntervalSince1970]) { _,new in new },incoming)
    }
    private func accept(_ connection: NWConnection) {
        guard connections.count < 8 else { connection.cancel(); return }
        let id = UUID(); connections[id] = connection; connection.start(queue: .main)
        DispatchQueue.main.asyncAfter(deadline: .now()+3) { [weak self] in self?.finish(id) }
        receive(connection, id: id, data: Data())
    }
    private func finish(_ id: UUID) { connections.removeValue(forKey: id)?.cancel() }
    private func receive(_ connection: NWConnection, id: UUID, data: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8193-data.count) { [weak self] chunk,_,complete,error in
            guard let self, self.connections[id] != nil else { return }
            var next=data; if let chunk { next.append(chunk) }
            do {
                if let request = try LocalRequest.parse(next) { self.respond(connection,id:id,result:self.handle(request)); return }
                if complete || error != nil { self.finish(id) } else { self.receive(connection,id:id,data:next) }
            } catch { self.respond(connection,id:id,result:(400,["error":"Invalid request"],nil)) }
        }
    }
    private func respond(_ connection: NWConnection, id: UUID, result: (Int,[String:Any],String?)) {
        let (code,object,origin)=result
        let body = code == 204 ? Data() : (try? JSONSerialization.data(withJSONObject: object)) ?? Data()
        var head="HTTP/1.1 \(code) Result\r\nConnection: close\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Length: \(body.count)\r\n"
        if let origin {
            head += "Access-Control-Allow-Origin: \(origin)\r\nVary: Origin\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: authorization, content-type\r\nAccess-Control-Allow-Private-Network: true\r\n"
        }
        connection.send(content: Data((head+"\r\n").utf8)+body, completion: .contentProcessed { [weak self] _ in self?.finish(id) })
    }
}
