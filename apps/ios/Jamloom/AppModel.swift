import SwiftUI
import AVFoundation

@MainActor
final class AppModel: NSObject, ObservableObject, AVAudioRecorderDelegate, AVAudioPlayerDelegate {
    @Published var consent = false
    @Published var input: AudioInput?
    @Published var trimStart = 0.0
    @Published var trimEnd = 2.0
    @Published var recording = false
    @Published var recordingSeconds = 0.0
    @Published var busy = false
    @Published var activity = ""
    @Published var error: String?
    @Published var sessions: [RemixSession] = []
    @Published var incomplete = 0
    @Published var playing: URL?
    @Published var permissionPending = false
    @Published var audioPreparing = false
    var foreground = true
    private(set) var library: RemixLibrary?
    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private var timer: Timer?
    private var cancellation: RenderCancellation?
    private var pendingRecording: URL?
    var editable: Bool { !busy && !recording && !permissionPending && !audioPreparing }
    var canCancel: Bool { cancellation != nil }
    var validSelection: Bool { input != nil && trimEnd - trimStart >= 1.999999 && trimEnd - trimStart <= 5.000001 }

    override init() {
        super.init()
        do {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
                var root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Jamloom-UI-Tests")
                if let run = ProcessInfo.processInfo.environment["JAMLOOM_UI_TEST_LIBRARY"], let id = UUID(uuidString: run) {
                    root.appendPathComponent(id.uuidString)
                }
                library = try RemixLibrary(root: root)
            } else { library = try RemixLibrary() }
            #else
            library = try RemixLibrary()
            #endif
        } catch { self.error = error.localizedDescription }
    }
    func loadLibrary() async {
        guard let library, editable else { return }
        busy = true; activity = "Checking saved mixes…"
        do {
            let result = try await Task.detached { try library.removeAbandonedCaptures(); return try library.load() }.value
            sessions = result.sessions; incomplete = result.incomplete
        } catch { self.error = error.localizedDescription }
        busy = false
    }
    func importAudio(_ url: URL) async {
        guard editable, consent else { return }
        stopPlayback()
        busy = true; activity = "Reading your sound…"
        do {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            let sound = try await Task.detached { try AudioInput.read(url) }.value
            input = sound; trimStart = 0; trimEnd = min(5, sound.duration)
        } catch { self.error = error.localizedDescription }
        busy = false
    }
    func startRecording() async {
        guard editable, consent, foreground else { return }
        permissionPending = true
        let granted = await AVAudioApplication.requestRecordPermission()
        permissionPending = false
        guard granted else { error = "Microphone access is off. Enable it in Settings, or import a recording."; return }
        guard consent, foreground, editable, let library else { return }
        stopPlayback()
        do {
            audioPreparing = true
            defer { audioPreparing = false }
            try await AudioSession.activate(recording: true)
            guard foreground, consent else { AudioSession.deactivate(); return }
            let url = library.root.appendingPathComponent("capture-\(UUID().uuidString).wav")
            pendingRecording = url
            let recorder = try AVAudioRecorder(url: url, settings: [AVFormatIDKey: kAudioFormatLinearPCM,
                AVSampleRateKey: 48000, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false])
            recorder.delegate = self
            self.recorder = recorder
            guard recorder.record(forDuration: 5) else { throw RemixError.message("Recording could not start. Check the microphone route.") }
            recording = true; recordingSeconds = 0
            timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                Task { @MainActor in self?.recordingSeconds = self?.recorder?.currentTime ?? 0 }
            }
        } catch {
            recording = false; recorder = nil
            AudioSession.deactivate()
            if let pendingRecording { try? FileManager.default.removeItem(at: pendingRecording) }
            pendingRecording = nil
            self.error = error.localizedDescription
        }
    }
    func stopRecording() { recorder?.stop() }
    nonisolated func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        Task { @MainActor in await finishRecording(recorder, successfully: flag) }
    }
    private func finishRecording(_ finished: AVAudioRecorder, successfully flag: Bool) async {
        guard finished === recorder else { return }
        timer?.invalidate(); timer = nil; recording = false; recorder = nil
        AudioSession.deactivate()
        guard let url = pendingRecording else { return }
        pendingRecording = nil
        defer { try? FileManager.default.removeItem(at: url) }
        if flag { await importAudio(url) } else { error = "Recording was interrupted. Please try again." }
    }
    nonisolated func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        Task { @MainActor in
            guard recorder === self.recorder else { return }
            recorder.stop()
            await finishRecording(recorder, successfully: false)
        }
    }
    func generate(club: Bool = false) async {
        guard editable, consent, validSelection, let input, let library else { return }
        stopPlayback()
        let token = RenderCancellation()
        cancellation = token; busy = true
        activity = club ? "Making your club mix…" : "Making three variations…"
        let start = trimStart, end = trimEnd, seed = UInt32.random(in: 1...UInt32.max)
        do {
            let session = try await Task.detached(priority: .userInitiated) {
                try library.generate(input: input, start: start, end: end, seed: seed,
                    consent: true, club: club, cancellation: token)
            }.value
            sessions.insert(session, at: 0)
        } catch { self.error = error.localizedDescription }
        busy = false; cancellation = nil
    }
    func cancel() { cancellation?.cancel() }
    func play(_ url: URL) async {
        if playing == url { stopPlayback(); return }
        guard editable else { return }
        stopPlayback()
        do {
            audioPreparing = true
            defer { audioPreparing = false }
            try await AudioSession.activate(recording: false)
            guard foreground else { AudioSession.deactivate(); return }
            let prepared = try await AudioSession.preparePlayer(url)
            guard foreground else { AudioSession.deactivate(); return }
            player = prepared
            player?.delegate = self
            guard player?.play() == true else { throw RemixError.message("This mix could not play.") }
            playing = url
        } catch { stopPlayback(); self.error = error.localizedDescription }
    }
    func stopPlayback() {
        player?.stop(); player = nil; playing = nil
        if !recording { AudioSession.deactivate() }
    }
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            guard player === self.player else { return }
            stopPlayback(); if !flag { error = "Playback was interrupted." }
        }
    }
    func suspendAudio(cancelRender: Bool) {
        if recording { stopRecording() }
        stopPlayback()
        if cancelRender { cancel() }
    }
    func save(_ session: RemixSession) {
        guard editable, let library else { return }
        do {
            var updated = session; updated.saved.toggle()
            try library.save(updated)
            if let i = sessions.firstIndex(where: { $0.id == session.id }) { sessions[i] = updated }
        } catch { self.error = error.localizedDescription }
    }
    func delete(_ session: RemixSession) {
        guard editable, let library else { return }
        stopPlayback()
        do { try library.delete(session); sessions.removeAll { $0.id == session.id } }
        catch { self.error = error.localizedDescription }
    }
    func deleteAll() {
        guard editable, let library else { return }
        stopPlayback()
        do {
            try library.deleteAll(); sessions = []; input = nil; incomplete = 0; consent = false
        } catch { self.error = error.localizedDescription }
    }
}
