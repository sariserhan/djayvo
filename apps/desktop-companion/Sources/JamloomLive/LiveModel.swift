import AppKit
import SwiftUI
import LiveAudio

final class LiveModel: ObservableObject {
    @Published var sources: [[String: Any]] = []
    @Published var outputs: [[String: Any]] = []
    @Published var process: UInt32 = 0
    @Published var output: UInt32 = 0
    @Published var consent = false
    @Published var active = false
    @Published var message = "Select a permitted app that is currently playing audio."
    @Published var pairing = "Website control is disconnected."
    @Published var controls = LiveControls() { didSet { if controls != oldValue { apply() } } }
    @Published var telemetry: [String: Any] = [:]
    let audio: JLLiveAudio
    let server = ControlServer()
    private var timer: Timer?, started = Date.distantPast, heardAudio = false
    private var sourceName = "", outputName = ""
    init(audio: JLLiveAudio = JLLiveAudio()) {
        self.audio = audio
        server.status = { [weak self] in self?.snapshot() ?? [:] }
        server.apply = { [weak self] value in self?.controls=value }
        server.stop = { [weak self] in self?.stop() }
        server.connectionChanged = { [weak self] text in self?.pairing=text }
        do { try server.start() } catch { pairing="Website connection unavailable. Native controls still work." }
        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in self?.poll() }
        NSWorkspace.shared.notificationCenter.addObserver(forName:NSWorkspace.willSleepNotification,object:nil,queue:.main) { [weak self] _ in self?.stop();self?.server.revoke() }
    }
    func refresh() { sources=JLLiveAudio.sources();outputs=JLLiveAudio.outputs() }
    func start() {
        guard consent, !active, process != 0, output != 0 else { return }
        controls.roll=false; controls.percussion=false;apply()
        if let error=audio.startProcess(process, output:output) { message=error;return }
        sourceName=sources.first { ($0["id"] as? NSNumber)?.uint32Value == process }?["name"] as? String ?? "Selected source"
        outputName=outputs.first { ($0["id"] as? NSNumber)?.uint32Value == output }?["name"] as? String ?? "Selected output"
        active=true;started=Date();heardAudio=false;apply()
        message="Capture active. The selected app's original output is suppressed while this route is running."
    }
    func stop() { audio.stop();active=false;controls.roll=false;controls.percussion=false;message="Capture stopped. The selected app's original output has been released." }
    func updateEffect(_ update: (inout LiveControls) -> Void) {
        var next = controls
        update(&next)
        next.bypass = false
        guard next.valid else { return }
        controls = next
    }
    func apply() {
        guard controls.valid else { return }
        if !audio.setLevel(controls.level, low:controls.low, mid:controls.mid, high:controls.high, tone:controls.tone, echo:controls.echo, bypass:controls.bypass, roll:controls.roll, percussion:controls.percussion) {
            message="The audio engine rejected this control change. Stop and reconnect the source."
        }
    }
    func poll() {
        server.tick();telemetry=audio.status()
        if active && !(telemetry["active"] as? Bool ?? false) { active=false;message=telemetry["error"] as? String ?? "Capture ended." }
        if active {
            if (telemetry["inputPeak"] as? Double ?? 0) > 0.0001 { heardAudio=true }
            if !heardAudio && Date().timeIntervalSince(started)>10 { stop();message="No audio received. The source may be silent, protected, or permission denied. Select a permitted playing source." }
        }
    }
    func snapshot() -> [String:Any] {
        telemetry.merging(["active":active,"message":message,"source":sourceName,"output":outputName,"controls":controls.dictionary]) { _,new in new }
    }
    func pair(origin: String = "https://www.jamloom.com") {
        do {
            let token=try server.pair(origin:origin)
            let item=NSPasteboardItem();item.setString(token,forType:.string);item.setString("",forType:NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
            NSPasteboard.general.clearContents();NSPasteboard.general.writeObjects([item])
            NSWorkspace.shared.open(URL(string:origin+"/live-dj")!)
            pairing="Pairing code copied. Paste it into the website and choose Connect. Valid for 15 minutes. No audio leaves this app."
        } catch { pairing="Could not create a secure pairing. Try again." }
    }
    func shutdown() { stop();server.shutdown();timer?.invalidate() }
}

