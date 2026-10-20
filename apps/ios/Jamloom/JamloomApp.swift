import SwiftUI
import UniformTypeIdentifiers
import AVFoundation

@main
struct JamloomApp: App {
    var body: some Scene { WindowGroup { RemixView() } }
}

struct RemixView: View {
    @StateObject private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var importing = false
    @State private var deletion: RemixSession?
    @State private var showDeleteSession = false
    @State private var deleteAll = false
    @State private var share: ShareItem?
    @State private var privacy = false
    @State private var showError = false
    private let accent = Color(red: 0.78, green: 0.96, blue: 0.32)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your sound.\nA new groove.").font(.largeTitle.bold())
                        Text("A phrase, a laugh, a small surprise. Make it music.")
                            .foregroundStyle(.secondary)
                    }
                    captureCard
                    if let input = model.input { trimCard(input) }
                    if model.busy {
                        HStack { ProgressView(); Text(model.activity); Spacer(); if model.canCancel { Button("Cancel", action: model.cancel) } }
                            .accessibilityIdentifier("generationProgress")
                    }
                    if !model.sessions.isEmpty {
                        Text("Your mixes").font(.title2.bold())
                        ForEach(model.sessions) { session in sessionCard(session) }
                    }
                    if model.incomplete > 0 {
                        Text("\(model.incomplete) incomplete or changed sessions were kept out of playback. Delete all local data to remove them.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Button("Privacy & your recordings") { privacy = true }
                    Button("Delete all local data", role: .destructive) { deleteAll = true }.disabled(!model.editable)
                }.padding(20).frame(maxWidth: 680)
                    .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.055, green: 0.07, blue: 0.075))
            .navigationTitle("Jamloom").navigationBarTitleDisplayMode(.inline)
            .tint(accent).preferredColorScheme(.dark)
            .task { await model.loadLibrary() }
            .onChange(of: scenePhase) { _, phase in
                model.foreground = phase == .active
                if phase == .background { model.suspendAudio(cancelRender: true) }
            }
            .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)) { _ in
                model.suspendAudio(cancelRender: false)
            }
            .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)) { note in
                let reason = (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.uintValue
                if reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue || reason == AVAudioSession.RouteChangeReason.noSuitableRouteForCategory.rawValue {
                    model.suspendAudio(cancelRender: false)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.mediaServicesWereResetNotification)) { _ in
                model.suspendAudio(cancelRender: true)
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.audio]) { result in
                switch result {
                case .success(let url): Task { await model.importAudio(url) }
                case .failure(let error): model.error = error.localizedDescription
                }
            }
            .onChange(of: model.error, initial: true) { _, error in if error != nil { showError = true } }
            .alert("Jamloom", isPresented: $showError) {
                Button("OK") { model.error = nil }
            } message: { Text(model.error ?? "") }
            .confirmationDialog("Delete this session and its recording?", isPresented: $showDeleteSession, titleVisibility: .visible, presenting: deletion) { session in
                Button("Delete session", role: .destructive) { model.delete(session); deletion = nil }
                    .accessibilityIdentifier("confirmDeleteSession")
            }
            .confirmationDialog("Delete all recordings and mixes from Jamloom? Exported copies stay where you shared them.", isPresented: $deleteAll, titleVisibility: .visible) {
                Button("Delete all local data", role: .destructive) { model.deleteAll() }
            }
            .sheet(item: $share) { item in ShareSheet(url: item.url) }
            .sheet(isPresented: $privacy) {
                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Your recordings stay here").font(.title.bold())
                            Text("Jamloom records only after you tap Record and allow microphone access. Capture stops after five seconds, when you stop it, or when the app goes into the background.")
                            Text("Audio is processed on this device. This version has no accounts, cloud generation, advertising, analytics or automatic uploads. Its private library is excluded from device backups.")
                            Text("Record and import only sounds you have permission to use. Get permission from recognizable speakers before recording or sharing them. Take special care with children's voices and private information.")
                            Text("Sessions stay in the app until you delete them or uninstall it. Save marks a favorite; every completed session already stays in your library. Share exports only the selected WAV through an app you choose. Copies you share are outside Jamloom's control.")
                            Text("Instrument credits").font(.headline)
                            Text("Acoustic notes and drums: VSCO 2 CE and VCSL, Versilian Studios / Sam Gossner, Ivy Audio / Simon Dalzell and contributors. Electric guitar: Brian Wood / Karoryfer Lecolds, Black And Green Guitars. Used under CC0. Electronic sounds and arrangements are original Jamloom material.")
                            ForEach(["VSCO-2-CE-LICENSE", "VCSL-LICENSE", "BLACK-AND-GREEN-GUITARS-CC0"], id: \.self) { name in
                                if let url = Bundle.main.url(forResource: name, withExtension: "txt", subdirectory: "licenses"), let notice = try? String(contentsOf: url, encoding: .utf8) {
                                    DisclosureGroup(name) { Text(notice).font(.caption).textSelection(.enabled) }
                                }
                            }
                            Text("This is a local prototype. Musical quality is still being evaluated; it does not clone voices or imitate a performer.")
                        }.padding()
                    }.navigationTitle("Privacy").toolbar { Button("Done") { privacy = false } }
                }.preferredColorScheme(.dark)
            }
        }
    }
    private var captureCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Start with a sound", systemImage: "waveform").font(.headline)
            Toggle("I have permission to record and remix this sound.", isOn: $model.consent)
                .accessibilityIdentifier("consentToggle").disabled(!model.editable)
            Text("2–5 seconds. Processed on your device.").font(.footnote).foregroundStyle(.secondary)
            if model.recording {
                HStack {
                    Label(String(format: "Recording · %.1f / 5 seconds", model.recordingSeconds), systemImage: "record.circle.fill").foregroundStyle(.red)
                    Spacer()
                    Button("Stop", action: model.stopRecording).buttonStyle(.bordered)
                }
            } else {
                HStack {
                    Button { Task { await model.startRecording() } } label: { Label("Record", systemImage: "mic.fill") }
                        .buttonStyle(.borderedProminent).foregroundStyle(.black)
                    Button { importing = true } label: { Label("Import", systemImage: "square.and.arrow.down") }.buttonStyle(.bordered)
                }.disabled(!model.consent || !model.editable)
                if model.permissionPending { Text("Waiting for microphone permission…").font(.footnote) }
            }
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
                Button("Load test clip") {
                    if let url = Bundle.main.url(forResource: "synthetic-speech", withExtension: "wav") { Task { await model.importAudio(url) } }
                }.disabled(!model.consent || !model.editable)
            }
            #endif
        }.padding().background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 20))
    }
    private func trimCard(_ input: AudioInput) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Choose your moment").font(.headline)
            Waveform(bars: input.waveform, start: model.trimStart / input.duration, end: model.trimEnd / input.duration)
                .frame(height: 64).accessibilityLabel("Recording waveform")
            Text(String(format: "%.2f – %.2f seconds · %.2f seconds selected", model.trimStart, model.trimEnd, model.trimEnd - model.trimStart))
                .font(.caption.monospacedDigit())
            Slider(value: $model.trimStart, in: 0...max(0, input.duration - 2), step: 0.01) {
                Text("Clip start")
            }.onChange(of: model.trimStart) { _, value in
                model.trimEnd = min(input.duration, max(value + 2, min(model.trimEnd, value + 5)))
            }.accessibilityIdentifier("trimStart")
            Slider(value: $model.trimEnd, in: min(input.duration, model.trimStart + 2)...min(input.duration, model.trimStart + 5), step: 0.01) {
                Text("Clip end")
            }.onChange(of: model.trimEnd) { _, value in model.trimEnd = min(input.duration, value) }
            Button { Task { await model.generate() } } label: {
                Label(model.sessions.isEmpty ? "Make Music" : "Remix Again", systemImage: "sparkles").frame(maxWidth: .infinity)
            }.buttonStyle(.borderedProminent).foregroundStyle(.black).accessibilityIdentifier("makeMusic")
                .disabled(!model.validSelection || !model.consent)
            Button("Make a club mix") { Task { await model.generate(club: true) } }
                .disabled(!model.validSelection || !model.consent)
        }.disabled(!model.editable)
    }
    private func sessionCard(_ session: RemixSession) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(session.created, format: .dateTime.month().day().hour().minute()).font(.headline)
                Spacer()
                Button { model.save(session) } label: {
                    Label(session.saved ? "Saved" : "Save", systemImage: session.saved ? "bookmark.fill" : "bookmark")
                }.disabled(!model.editable)
            }
            ForEach(session.styles, id: \.self) { style in
                if let url = model.library?.wav(session, style: style) {
                    HStack {
                        Button { Task { await model.play(url) } } label: {
                            Label(style == "hiphop" ? "Hip-hop" : style.capitalized,
                                  systemImage: model.playing == url ? "stop.circle.fill" : "play.circle.fill")
                                .frame(minHeight: 44)
                        }.accessibilityIdentifier("play-\(style)")
                        Spacer()
                        Button { model.stopPlayback(); share = ShareItem(url: url) } label: { Label("Share", systemImage: "square.and.arrow.up").frame(minHeight: 44) }
                            .accessibilityIdentifier("share-\(style)")
                    }.disabled(!model.editable)
                }
            }
            Text("Share only with permission from the people you recorded.").font(.caption).foregroundStyle(.secondary)
            Button("Remix this sound") {
                if let source = model.library?.folder(session.id).appendingPathComponent("source.wav") { Task { await model.importAudio(source) } }
            }.disabled(!model.editable || !model.consent)
            Button("Delete session", role: .destructive) { deletion = session; showDeleteSession = true }
                .font(.caption).disabled(!model.editable).accessibilityIdentifier("deleteSession")
        }.padding().background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 20))
    }
}

private struct Waveform: View {
    let bars: [Float]
    let start: Double
    let end: Double
    var body: some View {
        Canvas { context, size in
            for (i, amplitude) in bars.enumerated() {
                let position = Double(i) / Double(bars.count)
                let height = max(2, CGFloat(amplitude) * size.height)
                let rect = CGRect(x: CGFloat(position) * size.width, y: (size.height - height) / 2, width: max(1, size.width / CGFloat(bars.count) - 1), height: height)
                context.fill(Path(roundedRect: rect, cornerRadius: 1), with: .color(position >= start && position <= end ? .green : .gray.opacity(0.4)))
            }
        }
    }
}
private struct ShareItem: Identifiable { let id = UUID(); let url: URL }
private struct ShareSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: [url], applicationActivities: nil) }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
