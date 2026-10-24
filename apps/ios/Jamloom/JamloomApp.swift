import SwiftUI
import UniformTypeIdentifiers
import AVFoundation

@main
struct JamloomApp: App {
    @StateObject private var model = AppModel()
    @StateObject private var account = AccountModel()
    @StateObject private var decks = DJModel()
    @StateObject private var dnaCloud = CloudSongModel(product: .musicDNA)
    @State private var showError = false
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene { WindowGroup {
        TabView {
            RemixView(account: account, model: model, clearDecks: { decks.clear(); dnaCloud.clearDownloadedAudio() }).tabItem { Label("Improvise", systemImage: "waveform") }
            MusicDNAView(model: model, account: account, cloud: dnaCloud).tabItem { Label("Music DNA", systemImage: "music.note.list") }
            DJDeckView(decks: decks, model: model).tabItem { Label("DJ Deck", systemImage: "opticaldisc") }
        }
            .onChange(of: scenePhase) { _, phase in
                model.foreground = phase == .active
                if phase == .background { model.suspendAudio(cancelRender: true); decks.stop() }
            }
            .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)) { _ in
                model.suspendAudio(cancelRender: false)
                decks.stop()
            }
            .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)) { note in
                let reason = (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.uintValue
                if reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue || reason == AVAudioSession.RouteChangeReason.noSuitableRouteForCategory.rawValue {
                    model.suspendAudio(cancelRender: false)
                    decks.stop()
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.mediaServicesWereResetNotification)) { _ in
                model.suspendAudio(cancelRender: true)
                decks.stop()
            }
            .onChange(of: model.error, initial: true) { _, error in if error != nil { showError = true } }
            .alert("Jamloom", isPresented: $showError) {
                Button("OK") { model.error = nil }
            } message: { Text(model.error ?? "") }
    } }
}

struct RemixView: View {
    @ObservedObject var account: AccountModel
    @StateObject private var cloud = CloudSongModel()
    @State private var showCloud = false
    @State private var showAccount = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ObservedObject var model: AppModel
    var clearDecks: () -> Void = {}
    @State private var importing = false
    @State private var deleteAll = false
    @State private var privacy = false
    private let accent = Color(red: 0.78, green: 0.96, blue: 0.32)

    private func standardLayout(_ geometry: GeometryProxy) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                introduction
                LazyVGrid(columns: dynamicTypeSize.isAccessibilitySize || model.input == nil ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: min(320, max(1, geometry.size.width - 40))), alignment: .top)], alignment: .leading, spacing: 24) {
                    captureCard
                    if let input = model.input { trimCard(input) }
                }
                generationProgress
                savedMixes
            }.padding(20).frame(maxWidth: 1120).frame(maxWidth: .infinity)
        }
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                #if compiler(>=6.4)
                if #available(iOS 27.1, *), geometry.size.width >= 620, !dynamicTypeSize.isAccessibilitySize {
                    ArrangementView {
                        ScrollView { VStack(alignment: .leading, spacing: 24) { introduction; captureCard; if let input = model.input { trimCard(input) }; generationProgress }.padding(20) }
                    } secondary: {
                        ScrollView { savedMixes.padding(20) }
                    }.arrangementViewStyle(.split)
                } else { standardLayout(geometry) }
                #else
                standardLayout(geometry)
                #endif
            }
            .background(Color(red: 0.055, green: 0.07, blue: 0.075))
            .navigationTitle("Jamloom").navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Account", systemImage: "person.crop.circle") { model.suspendAudio(cancelRender: false); showAccount = true } }
            .sheet(isPresented: $showAccount) { AccountView(account: account) }
            .sheet(isPresented: $showCloud) { CloudImproviseView(cloud: cloud, account: account, model: model) }
            .onChange(of: model.trimStart) { _, _ in cloud.recordingChanged() }
            .onChange(of: model.trimEnd) { _, _ in cloud.recordingChanged() }
            .onChange(of: model.inputRevision) { _, _ in cloud.recordingChanged() }
            .tint(accent).preferredColorScheme(.dark)
            .task { await model.loadLibrary() }
            .onDisappear { model.suspendAudio(cancelRender: true) }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.audio]) { result in
                switch result {
                case .success(let url): Task { await model.importAudio(url) }
                case .failure(let error): model.error = error.localizedDescription
                }
            }
            .confirmationDialog("Delete all recordings and mixes from Jamloom? Exported copies stay where you shared them.", isPresented: $deleteAll, titleVisibility: .visible) {
                Button("Delete all local data", role: .destructive) { model.deleteAll(); clearDecks(); cloud.clearDownloadedAudio() }
            }
            .sheet(isPresented: $privacy) {
                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Your recordings stay here").font(.title.bold())
                            Text("Jamloom records only after you tap Record and allow microphone access. Capture stops after fifteen seconds, when you stop it, or when the app goes into the background.")
                            Text("Local previews are processed on this device. Create a full song uses the same cloud engine as the website, when available. It uploads only after you explicitly consent, and shows a credit quote before creating your private song. Audio is never automatically uploaded. Optional sign-in can sync your preferences and account balance. Purchases remain closed. There is no advertising or analytics. Its private library is excluded from device backups.")
                            Text("Record and import only sounds you have permission to use. Get permission from recognizable speakers before recording or sharing them. Take special care with children's voices and private information.")
                            Text("Sessions stay in the app until you delete them or uninstall it. Save marks a favorite; every completed session already stays in your library. Share exports only the selected WAV through an app you choose. Copies you share are outside Jamloom's control.")
                            Text("Instrument credits").font(.headline)
                            Text("Acoustic notes and drums: VSCO 2 CE and VCSL, Versilian Studios / Sam Gossner, Ivy Audio / Simon Dalzell and contributors. Electric guitar: Brian Wood / Karoryfer Lecolds, Black And Green Guitars. Used under CC0. Electronic sounds and arrangements are original Jamloom material.")
                            ForEach(["VSCO-2-CE-LICENSE", "VCSL-LICENSE", "BLACK-AND-GREEN-GUITARS-CC0"], id: \.self) { name in
                                if let url = Bundle.main.url(forResource: name, withExtension: "txt", subdirectory: "licenses"), let notice = try? String(contentsOf: url, encoding: .utf8) {
                                    DisclosureGroup(name) { Text(notice).font(.caption).textSelection(.enabled) }
                                }
                            }
                            Text("Musical quality is still being evaluated. Local previews are instrumental. Cloud creation can transform your recorded voice; use only voices you have permission to process.")
                        }.padding()
                    }.navigationTitle("Privacy").toolbar { Button("Done") { privacy = false } }
                }.preferredColorScheme(.dark)
            }
        }
    }
    private var introduction: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Make it yours.").font(.largeTitle.bold())
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 16) {
                    Label("Record", systemImage: "mic.fill")
                    Image(systemName: "chevron.right").accessibilityHidden(true)
                    Label("Create", systemImage: "sparkles")
                    Image(systemName: "chevron.right").accessibilityHidden(true)
                    Label("Play", systemImage: "play.fill")
                }
                Text("Record · Create · Play")
            }.font(.caption).foregroundStyle(.secondary)
        }
    }
    @ViewBuilder private var generationProgress: some View {
        if model.busy {
            HStack { ProgressView(); Text(model.activity); Spacer(); if model.canCancel { Button("Cancel", action: model.cancel) } }
                .accessibilityIdentifier("generationProgress")
        }
    }
    private var savedMixes: some View {
        VStack(alignment: .leading, spacing: 20) {
            if model.sessions.contains(where: { !$0.isTaste }) {
                Text("Your mixes").font(.title2.bold())
                ForEach(model.sessions.filter { !$0.isTaste }) { session in SavedSessionView(model: model, session: session) }
            }
            if model.incomplete > 0 {
                Text("\(model.incomplete) incomplete or changed sessions were kept out of playback. Delete all local data to remove them.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Button("Privacy & your recordings") { privacy = true }
            Button("Delete all local data", role: .destructive) { deleteAll = true }.disabled(!model.editable)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private var captureCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Start with a sound", systemImage: "waveform").font(.headline)
            Button {
                if model.recording { model.stopRecording() } else { Task { await model.startRecording() } }
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: model.recording ? "stop.circle.fill" : "mic.circle.fill").font(.system(size: 80))
                    Text(model.recording ? "Stop" : "Record").font(.headline)
                }.foregroundStyle(model.recording ? .red : accent).frame(maxWidth: .infinity).padding(.vertical, 12)
            }.buttonStyle(.plain).accessibilityLabel(model.recording ? "Stop" : "Record")
                .disabled(!model.consent || (!model.recording && !model.editable))
            HStack {
                Text("I have permission to use this sound.").accessibilityHidden(true)
                Spacer()
                Toggle("I have permission to use this sound.", isOn: $model.consent).labelsHidden().fixedSize()
                    .accessibilityIdentifier("consentToggle").disabled(!model.editable)
            }
            Text("1–15 seconds. Stays here until you choose to upload.").font(.footnote).foregroundStyle(.secondary)
            if model.recording {
                HStack {
                    Label(String(format: "Recording · %.1f / 15 seconds", model.recordingSeconds), systemImage: "record.circle.fill").foregroundStyle(.red)
                    Spacer()
                }
            } else {
                (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 12))) {
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
            Slider(value: $model.trimStart, in: 0...max(0, input.duration - 1), step: 0.01) {
                Text("Clip start")
            }.onChange(of: model.trimStart) { _, value in
                model.trimEnd = min(input.duration, max(value + 1, min(model.trimEnd, value + 15)))
            }.accessibilityIdentifier("trimStart")
            Slider(value: $model.trimEnd, in: min(input.duration, model.trimStart + 1)...min(input.duration, model.trimStart + 15), step: 0.01) {
                Text("Clip end")
            }.onChange(of: model.trimEnd) { _, value in model.trimEnd = min(input.duration, value) }
            Picker("Output length", selection: $model.outputSeconds) {
                ForEach([15, 30, 45, 60], id: \.self) { Text("\($0) seconds").tag($0) }
            }.accessibilityIdentifier("outputSeconds")
            Text("Arrangements end on a musical boundary; the exact length may vary slightly.").font(.caption)
            Button { model.stopPlayback(); showCloud = true } label: {
                Label("Create a full song", systemImage: "sparkles").frame(maxWidth: .infinity, minHeight: 32)
            }.buttonStyle(.borderedProminent).foregroundStyle(.black).disabled(!model.validSelection || !model.consent)
            Label("Local instrumental previews", systemImage: "iphone").font(.caption).foregroundStyle(.secondary)
            Button { Task { await model.generate() } } label: {
                Label(model.sessions.isEmpty ? "Make Music" : "Remix Again", systemImage: "sparkles").frame(maxWidth: .infinity)
            }.buttonStyle(.bordered).accessibilityIdentifier("makeMusic")
                .disabled(!model.validSelection || !model.consent)
            Button("Make a club mix") { Task { await model.generate(club: true) } }
                .disabled(!model.validSelection || !model.consent)
        }.disabled(!model.editable)
    }
}

struct SavedSessionView: View {
    @ObservedObject var model: AppModel
    let session: RemixSession
    var prefer: ((String) -> Void)? = nil
    @State private var showDeleteSession = false
    @State private var share: ShareItem?
    var body: some View {
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
                            Label(style == "taste_a" ? "Variation A" : style == "taste_b" ? "Variation B" : style == "hiphop" ? "Hip-hop" : style.capitalized,
                                  systemImage: model.playing == url ? "stop.circle.fill" : "play.circle.fill")
                                .frame(minHeight: 44)
                        }.accessibilityIdentifier("play-\(style)")
                            .accessibilityValue(model.playing == url ? "Playing" : "Stopped")
                        Spacer()
                        Button { model.stopPlayback(); share = ShareItem(url: url) } label: { Label("Share", systemImage: "square.and.arrow.up").frame(minHeight: 44) }
                            .accessibilityIdentifier("share-\(style)")
                    }.disabled(!model.editable)
                    if let prefer { Button("Use \(style == "taste_a" ? "A" : "B") settings next time") { prefer(style) }.disabled(!model.editable) }
                }
            }
            if !session.isTaste {
            Text("Share only with permission from the people you recorded.").font(.caption).foregroundStyle(.secondary)
            Button("Remix this sound") {
                if let source = model.library?.folder(session.id).appendingPathComponent("source.wav") { Task { await model.importAudio(source) } }
            }.disabled(!model.editable || !model.consent)
            }
            Button("Delete session", role: .destructive) { showDeleteSession = true }
                .font(.caption).disabled(!model.editable).accessibilityIdentifier("deleteSession")
        }.buttonStyle(.borderless)
        .sheet(item: $share) { item in ShareSheet(url: item.url) }
        .confirmationDialog("Delete this session?", isPresented: $showDeleteSession, titleVisibility: .visible) {
            Button("Delete session", role: .destructive) { model.delete(session) }.accessibilityIdentifier("confirmDeleteSession")
        }.padding().background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 20))
    }
}

struct Waveform: View {
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
