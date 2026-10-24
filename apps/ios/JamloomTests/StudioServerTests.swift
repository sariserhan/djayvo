import XCTest
@testable import Jamloom

final class StudioServerTests: XCTestCase {
    func testOnlyBundledAssetsCanBeReadThroughExactLoopbackAuthority() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try Data("console".utf8).write(to: root.appendingPathComponent("dj.html"))
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("escape.txt"), withDestinationURL: URL(fileURLWithPath: "/etc/hosts"))
        func response(_ path: String, method: String = "GET", host: String = "127.0.0.1:1234", extra: String = "") -> String {
            let request = "\(method) \(path) HTTP/1.1\r\nHost: \(host)\r\n\(extra)\r\n"
            return String(decoding: StudioServer.response(Data(request.utf8), root: root, prefix: "/token/", authority: "127.0.0.1:1234"), as: UTF8.self)
        }
        XCTAssertTrue(response("/token/dj.html").hasPrefix("HTTP/1.1 200"))
        XCTAssertTrue(response("/token/dj.html").hasSuffix("console"))
        XCTAssertTrue(response("/token/dj.html").contains("connect-src 'self' blob:"))
        XCTAssertFalse(response("/token/dj.html", method: "HEAD").hasSuffix("console"))
        for path in ["?", "????", "/dj.html", "/wrong/dj.html", "/token/../dj.html", "/token/%2e%2e/dj.html", "/token/escape.txt", "/token/missing.js", "/token//dj.html"] {
            XCTAssertTrue(response(path).hasPrefix("HTTP/1.1 404"), path)
        }
        XCTAssertTrue(response("/token/dj.html", method: "POST").hasPrefix("HTTP/1.1 405"))
        for extra in ["Origin: https://example.com\r\n", "Sec-Fetch-Site: cross-site\r\n", "Content-Length: 1\r\n", "Transfer-Encoding: chunked\r\n"] {
            XCTAssertTrue(response("/token/dj.html", extra: extra).hasPrefix("HTTP/1.1 403"))
        }
        XCTAssertTrue(response("/token/dj.html", host: "attacker.invalid:1234").hasPrefix("HTTP/1.1 403"))
        XCTAssertTrue(response("/token/dj.html", extra: "Host: localhost\r\n").hasPrefix("HTTP/1.1 400"))
    }
}
