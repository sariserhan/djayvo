import XCTest
import CryptoKit
@testable import Jamloom

private final class AccountProtocol: URLProtocol {
    static var handle: ((URLRequest) throws -> (Int, Data))!
    static var headers = ["Content-Type": "application/json"]
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.handle(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: Self.headers)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
@MainActor final class AccountTests: XCTestCase {
    func testCloudDownloadFollowsOnlySignedSongStorageWithoutCredentials() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel(); AccountProtocol.headers = ["Content-Type": "application/json"] }
        let id = String(repeating: "b", count: 32), data = try CloudRecording.wav(AudioInput(samples: [Float](repeating: 0.1, count: 48000), rate: 48000), start: 0, end: 1)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        var location = "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com/test/improvise/private/\(id)/\(digest).wav?X-Amz-Signature=test"
        var downloads = 0, corrupt = false
        AccountProtocol.handle = { request in
            if request.url?.host == "www.jamloom.com" { AccountProtocol.headers = ["Location": location]; return (307, Data()) }
            downloads += 1
            XCTAssertNil(request.value(forHTTPHeaderField: "Cookie")); XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
            AccountProtocol.headers = ["Content-Type": "audio/wav"]
            return (200, corrupt ? Data(repeating: 0, count: data.count) : data)
        }
        let file = try await transport.songAudio(id); defer { try? FileManager.default.removeItem(at: file) }
        XCTAssertEqual(try Data(contentsOf: file), data); XCTAssertEqual(downloads, 1)
        corrupt = true
        do { _ = try await transport.songAudio(id); XCTFail("Must reject a corrupted download") } catch { }
        location = "https://example.com/recording.wav"
        do { _ = try await transport.songAudio(id); XCTFail("Must reject a foreign redirect") } catch { }
        XCTAssertEqual(downloads, 2)
        corrupt = false
        location = "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com/test/improvise/private/\(id)/\(digest).wav?X-Amz-Signature=test"
        do { _ = try await transport.songAudio(id, product: .musicDNA); XCTFail("Must reject another product's storage") } catch { }
        XCTAssertEqual(downloads, 2)
        location = location.replacingOccurrences(of: "/improvise/", with: "/music-dna/")
        let dnaFile = try await transport.songAudio(id, product: .musicDNA); defer { try? FileManager.default.removeItem(at: dnaFile) }
        XCTAssertEqual(try Data(contentsOf: dnaFile), data); XCTAssertEqual(downloads, 3)
    }
    func testMusicDNAQuotesCompleteFavoritesAndRecoversAnInterruptedSubmission() async throws {
        let transport = transport(), account = AccountModel(transport: transport), cloud = CloudSongModel(product: .musicDNA)
        let user = UUID().uuidString, key = "jamloom-native-music-dna-\(user)"
        defer { cloud.stopPolling(); UserDefaults.standard.removeObject(forKey: key); transport.session.invalidateAndCancel() }
        var submitted = "", quoted: [String: Any]?, actions: [String] = []
        var profile = TasteProfile(); profile.references = (0..<5000).map { "Favorite song \($0) — Artist" }; profile.vocalLanguage = "tr"
        profile.referenceMetadata = profile.references.enumerated().map { TasteReferenceMetadata(reference: $0.element, genre: "Rock", source: "itunes", id: $0.offset + 1) }
        AccountProtocol.handle = { request in
            let url = try XCTUnwrap(request.url)
            XCTAssertEqual(url.host, "www.jamloom.com", "DNA must not upload source audio")
            if url.path == "/api/auth/sign-in/email" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"}}".utf8)) }
            if url.path == "/api/account" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"},\"balance\":{\"available\":20,\"reserved\":0},\"purchasesReleased\":false}".utf8)) }
            XCTAssertEqual(url.path, "/api/taste/song")
            if request.httpMethod == "GET" { return (200, Data((url.query == nil ? "{\"creditsEnabled\":true,\"signedIn\":true}" : "{\"id\":\"\(submitted)\",\"state\":\"completed\"}").utf8)) }
            var data = request.httpBody ?? Data()
            if let stream = request.httpBodyStream { stream.open(); defer { stream.close() }; var bytes = [UInt8](repeating: 0, count: 4096); while stream.hasBytesAvailable { let count = stream.read(&bytes, maxLength: bytes.count); if count <= 0 { break }; data.append(contentsOf: bytes.prefix(count)) } }
            let body = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any]), input = try XCTUnwrap(body["profile"] as? [String: Any])
            XCTAssertEqual(body["visibility"] as? String, "private"); XCTAssertEqual(body["publicConsent"] as? Bool, false)
            let action = try XCTUnwrap(body["action"] as? String); actions.append(action)
            if action == "quote" {
                XCTAssertEqual((input["references"] as? [String])?.count, 5000); XCTAssertEqual((input["referenceMetadata"] as? [[String: Any]])?.count, 5000)
                XCTAssertEqual(input["vocalLanguage"] as? String, "tr"); quoted = input
                return (200, Data("{\"credits\":9,\"token\":\"dna-quote\",\"expiresAt\":\(Date().addingTimeInterval(300).timeIntervalSince1970 * 1000)}".utf8))
            }
            XCTAssertEqual(action, "submit"); XCTAssertEqual(input as NSDictionary, quoted! as NSDictionary)
            submitted = try XCTUnwrap(body["requestId"] as? String); XCTAssertEqual(UserDefaults.standard.string(forKey: key), submitted)
            XCTAssertEqual(body["token"] as? String, "dna-quote")
            throw URLError(.networkConnectionLost)
        }
        await account.signIn(email: "test@example.test", password: "test-password"); await cloud.connect(account)
        await cloud.reviewTaste(profile); XCTAssertTrue(actions.isEmpty)
        cloud.consent = true; await cloud.reviewTaste(profile); XCTAssertEqual(actions, ["quote"])
        await cloud.submit(); XCTAssertEqual(actions, ["quote", "submit"])
        for _ in 0..<50 { if cloud.state == "completed" { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertEqual(cloud.state, "completed"); XCTAssertEqual(cloud.job, submitted)
        let recovered = CloudSongModel(product: .musicDNA); defer { recovered.stopPolling() }
        await recovered.connect(account); XCTAssertEqual(recovered.job, submitted)
        await recovered.submit(); XCTAssertEqual(actions, ["quote", "submit"], "Recovery must never double submit")
    }

    func testNativeCloudFlowQuotesBeforeSubmissionAndKeepsStorageUnauthenticated() async throws {
        let transport = transport(), account = AccountModel(transport: transport), cloud = CloudSongModel()
        let user = UUID().uuidString
        defer { cloud.stopPolling(); UserDefaults.standard.removeObject(forKey: "jamloom-native-improvise-\(user)") }
        var uploads = 0, quotes = 0, submits = 0, submittedID = ""
        AccountProtocol.handle = { request in
            let url = request.url!
            if url.host != "www.jamloom.com" {
                uploads += 1
                XCTAssertEqual(request.httpMethod, "PUT"); XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "audio/wav")
                XCTAssertNil(request.value(forHTTPHeaderField: "Cookie")); XCTAssertNil(request.value(forHTTPHeaderField: "Origin")); XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
                return (200, Data())
            }
            if url.path == "/api/auth/sign-in/email" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"}}".utf8)) }
            if url.path == "/api/account" { return (200, Data("{\"user\":{\"id\":\"\(user)\",\"email\":\"test@example.test\"},\"balance\":{\"available\":20,\"reserved\":0},\"purchasesReleased\":false}".utf8)) }
            if request.httpMethod == "GET" {
                return (200, Data((url.query == nil ? "{\"creditsEnabled\":true,\"signedIn\":true}" : "{\"id\":\"\(submittedID)\",\"state\":\"completed\"}").utf8))
            }
            var data = request.httpBody ?? Data()
            if let stream = request.httpBodyStream { stream.open(); defer { stream.close() }; var bytes = [UInt8](repeating: 0, count: 4096); while stream.hasBytesAvailable { let count = stream.read(&bytes, maxLength: bytes.count); if count <= 0 { break }; data.append(contentsOf: bytes.prefix(count)) } }
            let body = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
            switch body["action"] as? String {
            case "upload":
                XCTAssertEqual(body["consent"] as? Bool, true)
                XCTAssertEqual((body["sha256"] as? String)?.count, 64)
                return (200, Data("{\"id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"url\":\"https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.cloudflarestorage.com/test/uploads/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.wav?X-Amz-Signature=test\"}".utf8))
            case "quote":
                quotes += 1; XCTAssertEqual(submits, 0); XCTAssertEqual(body["visibility"] as? String, "private")
                return (200, Data("{\"credits\":7,\"token\":\"test-quote\",\"expiresAt\":\(Date().addingTimeInterval(300).timeIntervalSince1970 * 1000)}".utf8))
            case "submit":
                submits += 1; submittedID = try XCTUnwrap(body["requestId"] as? String)
                XCTAssertEqual(UserDefaults.standard.string(forKey: "jamloom-native-improvise-\(user)"), submittedID)
                XCTAssertEqual(body["token"] as? String, "test-quote"); XCTAssertEqual(body["publicConsent"] as? Bool, false)
                return (202, Data("{\"id\":\"\(submittedID)\",\"state\":\"queued\"}".utf8))
            default: throw URLError(.badServerResponse)
            }
        }
        await account.signIn(email: "test@example.test", password: "test-password")
        await cloud.connect(account)
        let input = AudioInput(samples: [Float](repeating: 0.1, count: 48000), rate: 48000)
        await cloud.review(input: input, start: 0, end: 1); XCTAssertEqual(uploads, 0)
        cloud.consent = true
        await cloud.review(input: input, start: 0, end: 1)
        XCTAssertEqual(uploads, 1); XCTAssertEqual(quotes, 1); XCTAssertEqual(submits, 0); XCTAssertEqual(cloud.quote?.credits, 7, cloud.message)
        cloud.invalidateQuote(); await cloud.review(input: input, start: 0, end: 1)
        XCTAssertEqual(uploads, 1); XCTAssertEqual(quotes, 2)
        await cloud.submit()
        for _ in 0..<50 { if cloud.state == "completed" { break }; try await Task.sleep(for: .milliseconds(20)) }
        XCTAssertEqual(cloud.state, "completed"); XCTAssertEqual(submits, 1)
        await cloud.submit(); XCTAssertEqual(submits, 1)
        cloud.newSong(); XCTAssertNil(cloud.job); XCTAssertFalse(cloud.consent)
        AccountProtocol.handle = { _ in XCTFail("Unsafe upload destination must be rejected before transport"); return (200, Data()) }
        do { try await transport.uploadSong(Data(repeating: 0, count: 100), to: URL(string: "https://example.com/private")!); XCTFail("Expected storage restriction") } catch { }
    }
    func testSongTransportKeepsOriginQueryAndAcceptedResponseBoundaries() async throws {
        let transport = transport(); defer { transport.session.invalidateAndCancel() }
        let id = String(repeating: "a", count: 32)
        AccountProtocol.handle = { request in
            XCTAssertEqual(request.url?.host, "www.jamloom.com")
            XCTAssertEqual(request.value(forHTTPHeaderField: "X-Jamloom-DNA"), "1")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), "https://www.jamloom.com")
            return (202, Data("{\"id\":\"\(id)\",\"state\":\"queued\"}".utf8))
        }
        let accepted: CloudSongModel.Job = try await transport.request("/api/improvise/song", method: "POST", body: Data("{}".utf8))
        XCTAssertEqual(accepted.id, id)
        AccountProtocol.handle = { request in
            XCTAssertEqual(URLComponents(url: request.url!, resolvingAgainstBaseURL: false)?.queryItems, [URLQueryItem(name: "id", value: id)])
            return (200, Data("{\"id\":\"\(id)\",\"state\":\"completed\"}".utf8))
        }
        let done: CloudSongModel.Job = try await transport.request("/api/improvise/song", query: ["id": id]); XCTAssertEqual(done.state, "completed")
        AccountProtocol.handle = { _ in XCTFail("Invalid query must not leave device"); return (200, Data()) }
        for query in [["id": "../account"], ["id": id, "url": "https://example.com"], ["id": id, "file": "source"]] {
            do { let _: CloudSongModel.Job = try await transport.request("/api/improvise/song", query: query); XCTFail("Expected query restriction") } catch { }
        }
        do { let _: AccountSnapshot = try await transport.request("/api/account", query: ["id": id]); XCTFail("Account query must stay restricted") } catch { }
        AccountProtocol.handle = { _ in (402, Data("{\"error\":\"You need more credits.\"}".utf8)) }
        do { let _: CloudSongModel.Job = try await transport.request("/api/improvise/song", method: "POST"); XCTFail("Expected credit failure") }
        catch let error as SongRequestError { XCTAssertEqual(error.status, 402); XCTAssertEqual(error.message, "You need more credits.") }
    }
    func testCloudUnavailableAndNoConsentNeverUpload() async throws {
        let account = AccountModel(transport: transport()), cloud = CloudSongModel()
        var calls = 0
        AccountProtocol.handle = { request in
            calls += 1; XCTAssertEqual(request.httpMethod, "GET"); XCTAssertEqual(request.url?.path, "/api/improvise/song")
            return (200, Data("{\"available\":false,\"creditsEnabled\":false}".utf8))
        }
        await cloud.connect(account)
        XCTAssertFalse(cloud.available)
        let input = AudioInput(samples: [Float](repeating: 0.1, count: 48000), rate: 48000)
        await cloud.review(input: input, start: 0, end: 1)
        cloud.consent = true
        await cloud.review(input: input, start: 0, end: 1)
        await cloud.submit()
        XCTAssertEqual(calls, 1); XCTAssertNil(cloud.quote); XCTAssertNil(cloud.job)
    }
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
