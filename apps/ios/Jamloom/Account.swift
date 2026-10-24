import SwiftUI
import StoreKit
import CryptoKit

// Keep login cookies in memory; never follow a redirect with credentials or private preferences.
final class AccountTransport: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    private struct Failure: Decodable { let error: String }
    let base: URL
    private(set) var session: URLSession!
    init(base: URL = URL(string: "https://www.jamloom.com")!, configuration: URLSessionConfiguration = .ephemeral) {
        self.base = base
        super.init()
        configuration.urlCache = nil
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 30
        session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func clearCookies() { session.configuration.httpCookieStorage?.removeCookies(since: .distantPast) }
    private func requestURL(_ path: String, query: [String: String]) throws -> URL {
        var allowed = base.absoluteString == "https://www.jamloom.com"
        #if DEBUG
        allowed = allowed || (base.scheme == "http" && base.host == "127.0.0.1" && base.path.isEmpty && base.user == nil && base.password == nil && base.query == nil && base.fragment == nil)
        #endif
        guard allowed, path.hasPrefix("/api/"), !path.contains(".."), !path.contains("?"),
              query.isEmpty || (path == "/api/improvise/song" && query.keys.allSatisfy({ ["id", "file"].contains($0) }) &&
                query["id"]?.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil &&
                (query["file"] == nil || query["file"] == "audio")) else {
            throw RemixError.message("Invalid account request.")
        }
        var url = URLComponents(url: base.appendingPathComponent(String(path.dropFirst())), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { url.queryItems = query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) } }
        return url.url!
    }
    func request<T: Decodable>(_ path: String, method: String = "GET", body: Data? = nil, query: [String: String] = [:]) async throws -> T {
        guard (body?.count ?? 0) <= 65536 else { throw RemixError.message("Account request is too large.") }
        var request = URLRequest(url: try requestURL(path, query: query))
        request.httpMethod = method; request.httpBody = body
        request.setValue(base.absoluteString, forHTTPHeaderField: "Origin")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let song = path == "/api/improvise/song"
        if song { request.setValue("1", forHTTPHeaderField: "X-Jamloom-DNA") }
        let (stream, response) = try await session.bytes(for: request)
        defer { stream.task.cancel() }
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        if http.statusCode == 401 { clearCookies(); throw AccountError.signedOut }
        if http.statusCode == 409 && !song { throw AccountError.conflict }
        guard response.mimeType == "application/json", response.expectedContentLength <= 65536 else {
            throw RemixError.message("Account service unavailable. Check your sign-in details or try again later. Local music is unchanged.")
        }
        var data = Data()
        for try await byte in stream {
            guard data.count < 65536 else { throw URLError(.dataLengthExceedsMaximum) }
            data.append(byte)
        }
        guard http.statusCode == 200 || (song && http.statusCode == 202) else {
            let message = (try? JSONDecoder().decode(Failure.self, from: data).error) ?? "Song service unavailable. Check your song before trying again."
            if song { throw SongRequestError(status: http.statusCode, message: message) }
            throw RemixError.message("Account service unavailable. Try again later.")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func songAudio(_ id: String) async throws -> URL {
        let url = try requestURL("/api/improvise/song", query: ["id": id, "file": "audio"])
        var (stream, response) = try await session.bytes(from: url)
        var storage: URLSession?
        var digest: String?
        defer { stream.task.cancel(); storage?.invalidateAndCancel() }
        if let http = response as? HTTPURLResponse, http.statusCode == 307 {
            stream.task.cancel()
            guard let location = http.value(forHTTPHeaderField: "Location"), let target = URL(string: location),
                  Self.signedStorageURL(target), target.path.range(of: "^/[a-z0-9-]+/improvise/(private|public)/\(id)/[a-f0-9]{64}\\.wav$", options: .regularExpression) != nil else { throw URLError(.badURL) }
            digest = target.deletingPathExtension().lastPathComponent
            storage = storageSession()
            (stream, response) = try await storage!.bytes(from: target)
        }
        guard (response as? HTTPURLResponse)?.statusCode == 200, ["audio/wav", "audio/x-wav"].contains(response.mimeType ?? ""), response.expectedContentLength <= 64 * 1024 * 1024 else { throw RemixError.message("Your song could not be downloaded. Try again.") }
        var data = Data()
        for try await byte in stream { guard data.count < 64 * 1024 * 1024 else { throw URLError(.dataLengthExceedsMaximum) }; data.append(byte) }
        guard data.count > 44, digest == nil || digest == SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() else { throw RemixError.message("The song download is incomplete. Try again.") }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("jamloom-\(id).wav")
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        return file
    }
    func uploadSong(_ data: Data, to url: URL) async throws {
        guard data.count > 44, data.count <= 960044,
              Self.signedStorageURL(url), url.path.range(of: "^/[a-z0-9-]+/uploads/[a-f0-9-]{36}\\.wav$", options: .regularExpression) != nil else { throw URLError(.badURL) }
        let upload = storageSession()
        defer { upload.invalidateAndCancel() }
        var request = URLRequest(url: url); request.httpMethod = "PUT"; request.setValue("audio/wav", forHTTPHeaderField: "Content-Type")
        let (_, response) = try await upload.upload(for: request, from: data)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw RemixError.message("Upload did not finish. Your recording is still here.") }
    }
    private static func signedStorageURL(_ url: URL) -> Bool {
        url.scheme == "https" && url.user == nil && url.password == nil && url.port == nil && url.fragment == nil &&
        url.host?.range(of: "^[a-f0-9]{32}\\.r2\\.cloudflarestorage\\.com$", options: .regularExpression) != nil &&
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains(where: { $0.name == "X-Amz-Signature" && !($0.value ?? "").isEmpty }) == true
    }
    private func storageSession() -> URLSession {
        // A separate cookie-free session keeps account credentials away from object storage.
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = session.configuration.protocolClasses
        configuration.httpCookieStorage = nil; configuration.httpShouldSetCookies = false
        configuration.timeoutIntervalForRequest = 30; configuration.timeoutIntervalForResource = 60
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }
}
struct SongRequestError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}
enum AccountError: LocalizedError {
    case signedOut, conflict
    var errorDescription: String? {
        self == .signedOut ? "Your session ended. Sign in again." : "The account profile changed. Load the account version before saving. Your local copy is unchanged."
    }
}
struct AccountUser: Decodable, Equatable { let id: String; let email: String }
struct AccountSnapshot: Decodable {
    struct Balance: Decodable { let available: Int; let reserved: Int }
    let user: AccountUser
    let balance: Balance
    let purchasesReleased: Bool
}
struct AccountTaste: Decodable { let profile: TasteProfile; let revision: Int }

@MainActor final class AccountModel: ObservableObject {
    @Published private(set) var snapshot: AccountSnapshot?
    @Published private(set) var busy = false
    @Published var message = ""
    private var revision: Int? = nil
    private let purchases = CreditPurchases()
    private var updates: Task<Void, Never>?
    let transport: AccountTransport
    init(transport: AccountTransport = AccountTransport()) {
        self.transport = transport
        updates = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard !Task.isCancelled else { return }
                guard let self, self.snapshot != nil, !self.busy else { continue }
                await self.perform { try await self.deliverPurchase(result) }
            }
        }
    }
    deinit { updates?.cancel(); transport.session.invalidateAndCancel() }
    func reset() { snapshot = nil; revision = nil; transport.clearCookies() }
    func perform(_ work: () async throws -> Void) async {
        guard !busy else { return }; busy = true; message = ""
        defer { busy = false }
        do { try await work() }
        catch { if case AccountError.signedOut = error { reset() }; message = error.localizedDescription }
    }
    func signIn(email: String, password: String) async {
        await perform {
            reset()
            guard !email.isEmpty, email.utf8.count <= 254, (1...128).contains(password.count) else {
                throw RemixError.message("Enter your account email and password.")
            }
            struct Login: Decodable { let user: AccountUser }
            let _: Login = try await transport.request("/api/auth/sign-in/email", method: "POST", body: JSONSerialization.data(withJSONObject: ["email": email, "password": password, "rememberMe": false]))
            try await fetchSnapshot()
        }
    }
    private func fetchSnapshot() async throws {
        let result: AccountSnapshot = try await transport.request("/api/account")
        guard result.balance.available >= 0, result.balance.reserved >= 0, !result.user.id.isEmpty,
              snapshot == nil || snapshot?.user == result.user else { reset(); throw AccountError.signedOut }
        snapshot = result
    }
    func refresh() async { await perform { try await fetchSnapshot() } }
    func signOut() async {
        await perform {
            defer { reset() }
            struct Ack: Decodable { let success: Bool }
            let _: Ack = try await transport.request("/api/auth/sign-out", method: "POST", body: Data("{}".utf8))
        }
    }
    private func purchaseToken() async throws -> UUID {
        guard snapshot != nil else { throw AccountError.signedOut }
        struct Token: Decodable { let appAccountToken: UUID }
        let token: Token = try await transport.request("/api/payments/apple", method: "POST", body: Data("{\"action\":\"account-token\"}".utf8))
        return token.appAccountToken
    }
    private func acknowledgePurchase(_ jws: String, _ token: UUID) async throws {
        struct Receipt: Decodable { let delivered: Bool; let lotId: String }
        let response: Receipt = try await transport.request("/api/payments/apple", method: "POST", body: JSONSerialization.data(withJSONObject: ["action": "verify", "signedTransaction": jws]))
        guard response.delivered, UUID(uuidString: response.lotId) != nil else { throw URLError(.cannotParseResponse) }
    }
    private func deliverPurchase(_ result: VerificationResult<StoreKit.Transaction>) async throws {
        let token = try await purchaseToken()
        try await purchases.deliverVerified(result, accountToken: token, deliver: acknowledgePurchase)
        try await fetchSnapshot()
    }
    func retryPurchases() async {
        await perform {
            let token = try await purchaseToken()
            try await purchases.reconcileUnfinished(accountToken: token, deliver: acknowledgePurchase)
            try await fetchSnapshot()
            message = "Pending purchases checked against your account."
        }
    }
    func loadTaste() async throws -> TasteProfile? {
        guard snapshot != nil else { throw AccountError.signedOut }
        struct Response: Decodable { let saved: AccountTaste? }
        let response: Response = try await transport.request("/api/taste")
        if let saved = response.saved { try saved.profile.validate(); guard saved.revision > 0 else { throw URLError(.cannotParseResponse) } }
        revision = response.saved?.revision ?? 0
        return response.saved?.profile
    }
    func saveTaste(_ profile: TasteProfile) async throws {
        guard snapshot != nil else { throw AccountError.signedOut }
        guard let revision else { throw RemixError.message("Load the account profile before saving to avoid overwriting another device's changes.") }
        try profile.validate()
        struct Save: Encodable { let profile: TasteProfile; let revision: Int }
        struct Response: Decodable { let revision: Int }
        let result: Response = try await transport.request("/api/taste", method: "POST", body: JSONEncoder().encode(Save(profile: profile, revision: revision)))
        guard result.revision > 0 else { throw URLError(.cannotParseResponse) }
        self.revision = result.revision
    }
    func deleteTaste() async throws {
        guard snapshot != nil, let revision, revision > 0 else { throw RemixError.message("Load the account profile before deleting it.") }
        struct Response: Decodable { let deleted: Bool }
        let response: Response = try await transport.request("/api/taste", method: "DELETE", body: JSONSerialization.data(withJSONObject: ["revision": revision]))
        guard response.deleted else { throw URLError(.cannotParseResponse) }; self.revision = 0
    }
}

struct AccountView: View {
    @ObservedObject var account: AccountModel
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    var body: some View {
        NavigationStack {
            Form {
                if let snapshot = account.snapshot {
                    Section("Account") {
                        Text(snapshot.user.email)
                        Text("Available credits: \(snapshot.balance.available)")
                        Text("Reserved credits: \(snapshot.balance.reserved)")
                        Button("Refresh balance") { Task { await account.refresh() } }
                        Button("Retry pending purchases") { Task { await account.retryPurchases() } }
                        Button("Sign out") { Task { await account.signOut() } }
                    }
                } else {
                    Section("Sign in to your existing account") {
                        TextField("Email", text: $email).textContentType(.username).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        SecureField("Password", text: $password).textContentType(.password)
                        Link("Forgot password?", destination: URL(string: "https://www.jamloom.com/account/forgot-password")!)
                        Button("Sign in") {
                            let secret = password; password = ""
                            Task { await account.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: secret) }
                        }
                    }
                }
                Text("Signing in is optional. Account sync sends only preferences you choose to save. Audio stays on this device. Sign in again after closing the app.")
                Text("Purchases and paid generation remain closed while musical and billing checks are pending.")
                if account.busy { ProgressView("Contacting your account…") }
                if !account.message.isEmpty { Text(account.message).accessibilityIdentifier("accountStatus") }
            }.disabled(account.busy).navigationTitle("Jamloom account")
                .toolbar { Button("Done") { password = ""; dismiss() } }
        }
    }
}
