import SwiftUI
import AVFoundation
import CryptoKit

enum CloudRecording {
    static func wav(_ input: AudioInput, start: Double, end: Double) throws -> Data {
        guard start.isFinite, end.isFinite, start >= 0, end <= input.duration + 0.000001,
              (0.999999...15.000001).contains(end - start),
              let sourceFormat = AVAudioFormat(standardFormatWithSampleRate: input.rate, channels: 1),
              let targetFormat = AVAudioFormat(standardFormatWithSampleRate: 16000, channels: 1),
              let converter = AVAudioConverter(from: sourceFormat, to: targetFormat) else { throw RemixError.message("Choose a recording of 1–15 seconds.") }
        let first = Int((start * input.rate).rounded()), count = min(input.samples.count - first, Int(((end - start) * input.rate).rounded()))
        guard count > 0, let source = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: AVAudioFrameCount(count)),
              let output = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: AVAudioFrameCount(ceil(Double(count) * 16000 / input.rate)) + 64) else { throw RemixError.message("This recording could not be prepared.") }
        source.frameLength = AVAudioFrameCount(count)
        for i in 0..<count { source.floatChannelData![0][i] = input.samples[first + i] }
        var supplied = false, failure: NSError?
        let status = converter.convert(to: output, error: &failure) { _, state in
            if supplied { state.pointee = .endOfStream; return nil }
            supplied = true; state.pointee = .haveData; return source
        }
        guard failure == nil, status != .error, output.frameLength > 0 else { throw RemixError.message("This recording could not be converted.") }
        let frames = Int(output.frameLength)
        var data = Data()
        func text(_ string: String) { data.append(contentsOf: string.utf8) }
        func integer<T: FixedWidthInteger>(_ value: T) { var little = value.littleEndian; withUnsafeBytes(of: &little) { data.append(contentsOf: $0) } }
        text("RIFF"); integer(UInt32(36 + frames * 2)); text("WAVEfmt "); integer(UInt32(16)); integer(UInt16(1)); integer(UInt16(1))
        integer(UInt32(16000)); integer(UInt32(32000)); integer(UInt16(2)); integer(UInt16(16)); text("data"); integer(UInt32(frames * 2))
        for i in 0..<frames {
            let sample = output.floatChannelData![0][i]
            guard sample.isFinite else { throw RemixError.message("This recording contains invalid audio.") }
            integer(Int16((min(1, max(-1, sample)) * 32767).rounded()))
        }
        return data
    }
}

@MainActor final class CloudImproviseModel: ObservableObject {
    struct Availability: Decodable, Sendable { let creditsEnabled: Bool?; let signedIn: Bool?; let active: String? }
    struct Quote: Decodable, Sendable { let credits: Int; let token: String; let expiresAt: Double }
    struct Job: Decodable, Sendable { let id: String?; let state: String?; let phase: String?; let cancelling: Bool? }
    @Published var genre = "surprise"
    @Published var voice = "surprise"
    @Published var consent = false
    @Published private(set) var available = false
    @Published private(set) var busy = false
    @Published private(set) var quote: Quote?
    @Published private(set) var job: String?
    @Published private(set) var state = ""
    @Published private(set) var message = ""
    @Published private(set) var audio: URL?
    private var source: String?
    private var sourceDigest: String?
    private var requestID: String?
    private var owner: String?
    private var polling: Task<Void, Never>?
    private var transport: AccountTransport?
    private var profile: [String: Any] { ["sourceId": source ?? "", "genre": genre, "voice": voice, "phrase": "", "consent": true] }
    private var historyKey: String { "jamloom-native-improvise-\(owner ?? "")" }
    var active: Bool { job != nil && !["completed", "failed", "cancelled"].contains(state) }
    var controlsLocked: Bool { busy || active }
    func invalidateQuote() { quote = nil; requestID = nil }
    func recordingChanged() { if !active { source = nil; sourceDigest = nil; invalidateQuote() } }
    func clearDownloadedAudio() { if let audio { try? FileManager.default.removeItem(at: audio) }; audio = nil }
    func newSong() {
        guard !active, !busy else { return }
        UserDefaults.standard.removeObject(forKey: historyKey)
        job = nil; state = ""; source = nil; sourceDigest = nil; clearDownloadedAudio(); invalidateQuote(); consent = false
    }
    func connect(_ account: AccountModel) async {
        guard !busy else { return }
        if owner != account.snapshot?.user.id {
            clearDownloadedAudio()
            polling?.cancel(); polling = nil; job = nil; source = nil; sourceDigest = nil; quote = nil; audio = nil; requestID = nil; state = ""; consent = false
        }
        owner = account.snapshot?.user.id; transport = account.transport
        do {
            let status: Availability = try await account.transport.request("/api/improvise/song")
            available = status.creditsEnabled == true
            if owner != nil {
                let saved = status.active ?? UserDefaults.standard.string(forKey: historyKey)
                if let saved, saved.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil { job = saved; state = "reconnecting"; watch() }
            }
            if !available { message = "Cloud song creation is not open yet. Your recording stays here."; return }
            guard owner != nil, status.signedIn == true else { message = "Sign in to make a cloud song."; return }
            message = ""
        } catch { available = false; message = error.localizedDescription }
    }
    func review(input: AudioInput, start: Double, end: Double) async {
        guard consent, available, owner != nil, !controlsLocked, let transport else { return }
        busy = true; message = "Preparing your recording…"
        defer { busy = false }
        do {
            let data = try await Task.detached { try CloudRecording.wav(input, start: start, end: end) }.value
            let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            if source == nil || sourceDigest != digest {
                struct Grant: Decodable, Sendable { let id: String; let url: URL }
                let grant: Grant = try await post(["action": "upload", "bytes": data.count, "sha256": digest, "consent": true])
                guard grant.id.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil else { throw URLError(.badURL) }
                try await transport.uploadSong(data, to: grant.url)
                source = grant.id; sourceDigest = digest
            }
            let price: Quote = try await post(["action": "quote", "profile": profile, "visibility": "private", "publicConsent": false])
            guard price.credits > 0, price.expiresAt > Date().timeIntervalSince1970 * 1000 else { throw RemixError.message("Refresh the price and try again.") }
            quote = price; message = "Private song. Review the price before creating."
        } catch { message = error.localizedDescription }
    }
    func submit() async {
        guard consent, !controlsLocked, let quote else { return }
        guard quote.expiresAt > Date().timeIntervalSince1970 * 1000 else { invalidateQuote(); message = "Refresh the price before creating."; return }
        busy = true
        defer { busy = false }
        let id = requestID ?? UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        requestID = id; UserDefaults.standard.set(id, forKey: historyKey)
        // Persist before submitting: an interrupted response must never trigger a second charge.
        job = id; state = "reconnecting"; message = ""
        do {
            let result: Job = try await post(["action": "submit", "requestId": id, "profile": profile, "visibility": "private", "publicConsent": false, "token": quote.token])
            guard result.id == id else { throw URLError(.cannotParseResponse) }
            state = result.state ?? "queued"
        } catch { message = "Checking whether your song started. Do not submit again." }
        watch()
    }
    func cancel() async {
        guard active, let job, let transport else { return }
        do { let _: Job = try await transport.request("/api/improvise/song", method: "DELETE", query: ["id": job]); state = "cancelling"; message = "Waiting for cancellation confirmation…" }
        catch { message = "Cancellation is not confirmed. Check again before leaving." }
    }
    private func post<T: Decodable & Sendable>(_ body: [String: Any]) async throws -> T {
        guard let transport else { throw AccountError.signedOut }
        return try await transport.request("/api/improvise/song", method: "POST", body: JSONSerialization.data(withJSONObject: body))
    }
    private func watch() {
        polling?.cancel()
        guard let id = job, let transport else { return }
        let checkingUntil = Date().addingTimeInterval(60)
        polling = Task { [weak self] in
            while !Task.isCancelled {
                do {
                    let result: Job = try await transport.request("/api/improvise/song", query: ["id": id])
                    guard !Task.isCancelled, let self, self.job == id else { return }
                    self.state = result.cancelling == true ? "cancelling" : result.state ?? "reconnecting"
                    self.message = result.phase?.replacingOccurrences(of: "_", with: " ").capitalized ?? ""
                    if ["completed", "failed", "cancelled"].contains(self.state) {
                        self.quote = nil
                        if self.state == "completed" { self.message = "Your song is ready." }
                        else { self.message = self.state == "failed" ? "Your song could not finish. Check your account for released credits." : "Song cancelled." }
                        return
                    }
                } catch let error as SongRequestError where error.status == 404 && Date() > checkingUntil {
                    guard !Task.isCancelled, let self else { return }
                    self.job = nil; self.state = "failed"; self.invalidateQuote()
                    UserDefaults.standard.removeObject(forKey: self.historyKey)
                    self.message = "This song did not start or is no longer available. Review a new price to try again."
                    return
                } catch AccountError.signedOut {
                    if !Task.isCancelled { self?.message = "Your session ended. Close this screen and sign in again to check your song." }
                    return
                } catch { if !Task.isCancelled { self?.message = "Reconnecting to your song…" } }
                do { try await Task.sleep(for: .seconds(3)) } catch { return }
            }
        }
    }
    func download() async {
        guard state == "completed", !busy, let job, let transport else { return }
        busy = true; defer { busy = false }
        do { audio = try await transport.songAudio(job) } catch { message = error.localizedDescription }
    }
    func stopPolling() { polling?.cancel(); polling = nil }
}

struct CloudImproviseView: View {
    @ObservedObject var cloud: CloudImproviseModel
    @ObservedObject var account: AccountModel
    @ObservedObject var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var showAccount = false
    private var styles: [String: String] {
        guard let url = Bundle.main.url(forResource: "improvise-styles", withExtension: "json"), let data = try? Data(contentsOf: url), let styles = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }
        return styles
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Label("Create a full song", systemImage: "sparkles").font(.title.bold())
                    Text("The same song engine as Jamloom on the web.").foregroundStyle(.secondary)
                    if account.snapshot == nil { Button("Sign in", systemImage: "person.crop.circle") { showAccount = true }.buttonStyle(.borderedProminent) }
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 110))], spacing: 10) {
                        ForEach(["surprise", "jazz", "reggae", "edm", "hiphop", "acousticpop"], id: \.self) { genre in
                            Button { cloud.genre = genre } label: {
                                VStack(spacing: 8) {
                                    Image(systemName: cloud.genre == genre ? "checkmark.circle.fill" : ["surprise": "sparkles", "jazz": "pianokeys", "reggae": "sun.max", "edm": "bolt.fill", "hiphop": "headphones", "acousticpop": "guitars"][genre] ?? "music.note").font(.title2)
                                    Text(styles[genre] ?? "Surprise me")
                                }.font(.callout).frame(maxWidth: .infinity, minHeight: 64)
                            }.buttonStyle(.bordered).tint(cloud.genre == genre ? .mint : .gray).accessibilityAddTraits(cloud.genre == genre ? .isSelected : [])
                        }
                    }.disabled(cloud.controlsLocked || cloud.quote != nil)
                    HStack {
                        Text("All styles").font(.headline); Spacer()
                        Picker("All styles", selection: $cloud.genre) {
                            Text("Surprise me").tag("surprise")
                            ForEach(styles.keys.sorted(), id: \.self) { Text(styles[$0] ?? $0).tag($0) }
                        }.labelsHidden().fixedSize()
                    }.disabled(cloud.controlsLocked || cloud.quote != nil)
                    HStack {
                        Text("Voice").font(.headline); Spacer()
                        Picker("Voice", selection: $cloud.voice) {
                            Text("Surprise me").tag("surprise"); Text("Female").tag("female"); Text("Male").tag("male")
                        }.labelsHidden().fixedSize()
                    }.disabled(cloud.controlsLocked || cloud.quote != nil)
                    HStack {
                        Text("Send this clip for cloud processing").accessibilityHidden(true)
                        Spacer()
                        Toggle("Send this clip for cloud processing", isOn: $cloud.consent).labelsHidden().fixedSize().disabled(cloud.controlsLocked)
                    }
                    Text("Only your selected clip is uploaded. Your song stays private. Credits are used only after you confirm the price.").font(.footnote).foregroundStyle(.secondary)
                    if !cloud.message.isEmpty { Text(cloud.message).accessibilityIdentifier("cloudSongStatus") }
                    if cloud.active {
                        ProgressView(cloud.state.capitalized)
                        Button("Cancel song", role: .destructive) { Task { await cloud.cancel() } }
                    } else if cloud.state == "completed" {
                        if let audio = cloud.audio {
                            Button("Play song", systemImage: "play.circle.fill") { Task { await model.play(audio) } }.buttonStyle(.borderedProminent)
                            ShareLink("Save or share song", item: audio)
                        } else { Button("Download song", systemImage: "arrow.down.circle") { Task { await cloud.download() } }.disabled(cloud.busy) }
                        Button("Make another song") { cloud.newSong() }
                    } else if ["failed", "cancelled"].contains(cloud.state) {
                        Button("Try another song") { cloud.newSong() }
                    } else if let price = cloud.quote {
                        Button("Create song · \(price.credits) credits", systemImage: "sparkles") { Task { await cloud.submit() } }.buttonStyle(.borderedProminent).disabled(cloud.controlsLocked || !cloud.consent)
                        Button("Change style") { cloud.invalidateQuote() }
                    } else {
                        Button("Upload clip & review price", systemImage: "arrow.up.circle") {
                            if let input = model.input { Task { await cloud.review(input: input, start: model.trimStart, end: model.trimEnd) } }
                        }.buttonStyle(.borderedProminent).disabled(!cloud.available || !cloud.consent || account.snapshot == nil || cloud.controlsLocked)
                    }
                    if cloud.busy { ProgressView() }
                }.padding().frame(maxWidth: 760).frame(maxWidth: .infinity)
            }.navigationTitle("Improvise").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done", systemImage: "checkmark") { dismiss() } } }
                .sheet(isPresented: $showAccount, onDismiss: { Task { await cloud.connect(account) } }) { AccountView(account: account) }
                .task { await cloud.connect(account) }
                .onDisappear { cloud.stopPolling(); model.stopPlayback() }
        }.preferredColorScheme(.dark).tint(.mint)
    }
}
