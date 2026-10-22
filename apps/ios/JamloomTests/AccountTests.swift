import XCTest
@testable import Jamloom

private final class AccountProtocol: URLProtocol {
    static var handle: ((URLRequest) throws -> (Int, Data))!
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.handle(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
@MainActor final class AccountTests: XCTestCase {
    func transport() -> AccountTransport {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [AccountProtocol.self]
        return AccountTransport(configuration: config)
    }
    func testAccountBalanceTasteConflictAndSignout() async throws {
        let transport = transport(), account = AccountModel(transport: transport)
        var conflict = false, saves = 0
        AccountProtocol.handle = { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), "https://www.jamloom.com")
            let body: String
            switch request.url!.path {
            case "/api/auth/sign-in/email": body = "{\"user\":{\"id\":\"one\",\"email\":\"one@example.test\"}}"
            case "/api/account": body = "{\"user\":{\"id\":\"one\",\"email\":\"one@example.test\"},\"balance\":{\"available\":10,\"reserved\":2},\"purchasesReleased\":false}"
            case "/api/taste":
                if request.httpMethod == "GET" { return (200, try JSONEncoder().encode(TasteResponse(saved: Saved(profile: TasteProfile(), revision: 7)))) }
                saves += 1
                if conflict { return (409, Data("{}".utf8)) }
                body = "{\"revision\":8}"
            case "/api/auth/sign-out": body = "{\"success\":true}"
            default: throw URLError(.badURL)
            }
            return (200, Data(body.utf8))
        }
        await account.signIn(email: "one@example.test", password: "local-test-password")
        XCTAssertEqual(account.snapshot?.balance.available, 10)
        do { try await account.saveTaste(TasteProfile()); XCTFail("Must load revision first") } catch { }
        XCTAssertEqual(saves, 0)
        let loaded = try await account.loadTaste(); XCTAssertEqual(loaded, TasteProfile())
        try await account.saveTaste(TasteProfile()); XCTAssertEqual(saves, 1)
        conflict = true
        do { try await account.saveTaste(TasteProfile()); XCTFail("Must surface conflict") } catch AccountError.conflict { }
        await account.signOut(); XCTAssertNil(account.snapshot)
        do { _ = try await account.loadTaste(); XCTFail("Must require account") } catch AccountError.signedOut { }
    }
    func testOversizedUnauthorizedAndInvalidEndpointResponses() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel() }
        AccountProtocol.handle = { _ in (200, Data(repeating: 32, count: 65537)) }
        do { let _: AccountSnapshot = try await transport.request("/api/account"); XCTFail("Expected byte cap") } catch { }
        AccountProtocol.handle = { _ in (401, Data("{}".utf8)) }
        do { let _: AccountSnapshot = try await transport.request("/api/account"); XCTFail("Expected session expiry") } catch AccountError.signedOut { }
        let foreign = AccountTransport(base: URL(string: "https://foreign.example")!)
        defer { foreign.session.invalidateAndCancel() }
        do { let _: AccountSnapshot = try await foreign.request("/api/account"); XCTFail("Expected origin restriction") } catch { }
    }
    func testActualLocalAccountAndProfileSync() async throws {
        guard let origin = ProcessInfo.processInfo.environment["JAMLOOM_ACCOUNT_TEST_ORIGIN"] else { throw XCTSkip("Run the disposable local account harness for HTTP integration.") }
        let base = try XCTUnwrap(URL(string: origin))
        XCTAssertEqual(base.host, "127.0.0.1")
        let account = AccountModel(transport: AccountTransport(base: base))
        await account.signIn(email: "native@example.test", password: "Jamloom-native-test-password-739")
        XCTAssertEqual(account.snapshot?.user.email, "native@example.test", account.message)
        XCTAssertEqual(account.snapshot?.balance.available, 10)
        let first = try await account.loadTaste(); XCTAssertNil(first)
        var profile = TasteProfile(); profile.references = ["Native test preference"]
        profile.catalogue = [TasteChoice(id: try XCTUnwrap(TasteCatalogue.tracks.first).id, rating: "love", weight: 3)]
        try await account.saveTaste(profile)
        let loaded = try await account.loadTaste(); XCTAssertEqual(loaded, profile)
        try await account.deleteTaste()
        let deleted = try await account.loadTaste(); XCTAssertNil(deleted)
        await account.signOut(); XCTAssertNil(account.snapshot)
        do { let _: AccountSnapshot = try await account.transport.request("/api/account"); XCTFail("Sign-out must revoke the session") } catch AccountError.signedOut { }
    }
    private struct Saved: Encodable { let profile: TasteProfile; let revision: Int }
    private struct TasteResponse: Encodable { let saved: Saved }
}
