import SwiftUI
import WebKit

@MainActor
final class DJModel: NSObject, ObservableObject, WKNavigationDelegate, WKScriptMessageHandler {
    @Published var error: String?
    @Published var savedDeck: String?
    @Published var importing = false
    let webView: WKWebView
    private var server: StudioServer?
    private var studioURL: URL?
    private var started = false
    private var divisions: [CGRect] = []
    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            config.userContentController.addUserScript(WKUserScript(source: "window.jamloomMobileMuted = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        #endif
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        config.userContentController.add(self, name: "savedSongs")
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.035, green: 0.05, blue: 0.075, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
    }
    func start() {
        guard !started else { return }
        started = true
        guard let root = Bundle.main.url(forResource: "Studio", withExtension: nil) else { error = "The DJ studio is missing. Reinstall Jamloom."; return }
        let server = StudioServer(root: root); self.server = server
        do {
            try server.start { [weak self] result in Task { @MainActor in
                guard let self else { return }
                switch result {
                case .success(let url): self.studioURL = url; self.webView.load(URLRequest(url: url))
                case .failure: self.error = "The DJ studio could not open. Close and reopen Jamloom."
                }
            } }
        } catch { self.error = "The DJ studio could not open. Close and reopen Jamloom." }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url, let studioURL,
              url.scheme == studioURL.scheme, url.host == studioURL.host, url.port == studioURL.port, url.path == studioURL.path,
              let deck = message.body as? String, ["a", "b"].contains(deck) else { return }
        savedDeck = deck
    }
    func loadSaved(_ url: URL, name: String) async {
        guard let deck = savedDeck, !importing else { return }
        importing = true; defer { importing = false }
        do {
            let encoded = try await Task.detached {
                let info = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey, .isSymbolicLinkKey])
                guard url.isFileURL, info.isRegularFile == true, info.isSymbolicLink != true,
                      let size = info.fileSize, size > 0, size <= 32 * 1024 * 1024 else { throw RemixError.message("This saved mix is too large to load into a deck.") }
                let data = try Data(contentsOf: url, options: .mappedIfSafe)
                guard data.count == size else { throw RemixError.message("This mix changed while loading.") }
                return data.base64EncodedString()
            }.value
            _ = try await webView.callAsyncJavaScript("return await window.jamloomMobileLoad(deck, name, encoded)", arguments: ["deck": deck, "name": name, "encoded": encoded], in: nil, contentWorld: .page)
            savedDeck = nil; error = nil
        } catch { self.error = "This mix could not load. Pause the deck and try again." }
    }
    func layout(divisions: [CGRect]) {
        guard self.divisions != divisions else { return }
        self.divisions = divisions
        applyLayout()
    }
    private func applyLayout() {
        let values = divisions.map { ["x": $0.minX, "y": $0.minY, "width": $0.width, "height": $0.height] }
        guard let data = try? JSONSerialization.data(withJSONObject: values), let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.jamloomMobileRegions = \(json); window.jamloomMobileLayout?.()", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { applyLayout() }
    func stop() {
        webView.evaluateJavaScript("window.jamloomMobileStop?.()", completionHandler: nil)
        webView.pauseAllMediaPlayback(completionHandler: nil)
    }
    func clear() { stop(); if let studioURL { webView.load(URLRequest(url: studioURL)) } }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.navigationType == .linkActivated, let url = action.request.url, url.scheme == "https" {
            UIApplication.shared.open(url); decisionHandler(.cancel); return
        }
        guard let url = action.request.url, let studioURL,
              url.scheme == studioURL.scheme, url.host == studioURL.host, url.port == studioURL.port,
              url.path == studioURL.path, action.targetFrame?.isMainFrame == true else { decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { self.error = "The DJ studio could not load. Close and reopen Jamloom." }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        error = "The studio stopped to free memory. Reopen the deck and load your tracks again."
        started = false
    }
}

private struct StudioWebView: UIViewRepresentable {
    let model: DJModel
    var divisions: [CGRect] = []
    func makeUIView(context: Context) -> WKWebView { model.start(); return model.webView }
    func updateUIView(_ view: WKWebView, context: Context) { model.layout(divisions: divisions) }
}
struct DJDeckView: View {
    @ObservedObject var decks: DJModel
    @ObservedObject var model: AppModel
    private func divisions(in geometry: GeometryProxy) -> [CGRect] {
        #if compiler(>=6.4)
        if #available(iOS 27.1, *) {
            return geometry.reservedRegions(kind: .division).filter(\.isActive).map { region in
                CGRect(x: region.frame.minX - region.margins.leading, y: region.frame.minY - region.margins.top,
                       width: region.frame.width + region.margins.leading + region.margins.trailing,
                       height: region.frame.height + region.margins.top + region.margins.bottom)
            }
        }
        #endif
        return []
    }
    var body: some View {
        VStack(spacing: 0) {
            if let error = decks.error { Text(error).padding().accessibilityIdentifier("deckError") }
            GeometryReader { geometry in
                StudioWebView(model: decks, divisions: divisions(in: geometry))
            }
        }
        .background(Color(red: 0.035, green: 0.05, blue: 0.075))
        .onAppear { model.suspendAudio(cancelRender: false) }
        .onDisappear { decks.stop() }
        .sheet(isPresented: Binding(get: { decks.savedDeck != nil }, set: { if !$0 { decks.savedDeck = nil } })) {
            NavigationStack {
                List {
                    if let error = decks.error { Text(error).foregroundStyle(.red) }
                    if model.sessions.isEmpty { ContentUnavailableView("No saved mixes", systemImage: "music.note", description: Text("Create a mix in Improvise or Music DNA first.")) }
                    ForEach(model.sessions) { session in
                        Section(session.created.formatted(date: .abbreviated, time: .shortened)) {
                            ForEach(session.styles, id: \.self) { style in
                                Button { if let url = model.library?.wav(session, style: style) { Task { await decks.loadSaved(url, name: "Jamloom \(style).wav") } } }
                                label: { Label(style.capitalized, systemImage: "waveform") }
                                .disabled(decks.importing)
                                .accessibilityIdentifier("loadSaved-\(style)")
                            }
                        }
                    }
                    if decks.importing { ProgressView("Loading mix…") }
                }
                .navigationTitle("Load deck \(decks.savedDeck?.uppercased() ?? "")")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel", systemImage: "xmark") { decks.savedDeck = nil }.disabled(decks.importing) } }
                .task { await model.loadLibrary() }
            }
        }
    }
}
