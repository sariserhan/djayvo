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
    @Published var controls = LiveControls()
    @Published var telemetry: [String: Any] = [:]
    let audio = JLLiveAudio(), server = ControlServer()
    private var timer: Timer?, started = Date.distantPast, heardAudio = false
    private var sourceName = "", outputName = ""
    init() {
        server.status = { [weak self] in self?.snapshot() ?? [:] }
        server.apply = { [weak self] value in self?.controls=value; self?.apply() }
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
    func apply() {
        guard controls.valid else { return }
        _ = audio.setLevel(controls.level, low:controls.low, mid:controls.mid, high:controls.high, tone:controls.tone, echo:controls.echo, bypass:controls.bypass, roll:controls.roll, percussion:controls.percussion)
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
    func pair() {
        do {
            let token=try server.pair(origin:"https://www.jamloom.com")
            let item=NSPasteboardItem();item.setString(token,forType:.string);item.setString("",forType:NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
            NSPasteboard.general.clearContents();NSPasteboard.general.writeObjects([item])
            NSWorkspace.shared.open(URL(string:"https://www.jamloom.com/live-dj")!)
            pairing="Pairing code copied. Paste it into the website and choose Connect. Valid for 15 minutes. No audio leaves this app."
        } catch { pairing="Could not create a secure pairing. Try again." }
    }
    func shutdown() { stop();server.shutdown();timer?.invalidate() }
}

struct LiveView: View {
    @ObservedObject var model: LiveModel
    func slider(_ title:String,_ value:Binding<Double>,_ range:ClosedRange<Double>,_ step:Double=1) -> some View {
        VStack(alignment:.leading,spacing:3) {
            Text("\(title): \(value.wrappedValue, specifier: step < 1 ? "%.2f" : "%.0f")")
            Slider(value:value,in:range,step:step).accessibilityLabel(title)
        }
    }
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:16) {
                HStack { Text("Jamloom / Live Source").font(.title.bold());Spacer();Text(model.active ? "● CAPTURING" : "STOPPED").foregroundStyle(model.active ? .green : .secondary) }
                Text("Shape one app’s audio locally. No recording or cloud upload. macOS 14.2 or later.").foregroundStyle(.secondary)
                Toggle("I have permission to capture and process this source.",isOn:$model.consent).onChange(of:model.consent) { _,value in if !value { model.stop() } }
                Picker("Source audio process",selection:$model.process) {
                    Text("Choose a playing app").tag(UInt32(0))
                    ForEach(model.sources.indices,id:\.self) { i in Text(model.sources[i]["name"] as? String ?? "App").tag((model.sources[i]["id"] as? NSNumber)?.uint32Value ?? 0) }
                }.disabled(model.active)
                Picker("Stereo speaker output",selection:$model.output) {
                    Text("Choose an output").tag(UInt32(0))
                    ForEach(model.outputs.indices,id:\.self) { i in Text(model.outputs[i]["name"] as? String ?? "Output").tag((model.outputs[i]["id"] as? NSNumber)?.uint32Value ?? 0) }
                }.disabled(model.active)
                HStack {
                    Button("Refresh sources",action:model.refresh).disabled(model.active)
                    Button("Start Live Source",action:model.start).disabled(!model.consent || model.active || model.process==0 || model.output==0)
                    Button("Stop / Panic",role:.destructive,action:model.stop).keyboardShortcut(.escape,modifiers:[]).disabled(!model.active)
                }
                Text(model.message).font(.callout).accessibilityLabel("Capture status: "+model.message)
                Divider()
                VStack(spacing:12) {
                    slider("Output level",$model.controls.level,0...0.8,0.01)
                    HStack(spacing:20) { slider("Low EQ (dB)",$model.controls.low,-24...6);slider("Mid EQ (dB)",$model.controls.mid,-24...6);slider("High EQ (dB)",$model.controls.high,-24...6) }
                    slider("Low-pass (Hz)",$model.controls.tone,100...18000,100)
                    slider("Echo amount",$model.controls.echo,0...0.4,0.01)
                    HStack {
                        Toggle("Bypass effects",isOn:$model.controls.bypass)
                        Toggle("One-beat roll",isOn:$model.controls.roll)
                    }
                    Toggle("Follow a steady pulse with percussion",isOn:$model.controls.percussion)
                }.disabled(!model.active).onChange(of:model.controls) { model.apply() }
                let confidence=model.telemetry["confidence"] as? Double ?? 0
                Text(confidence>0.65 ? "Pulse estimate: \(model.telemetry["bpm"] as? Double ?? 0,specifier:"%.1f") BPM · confidence \(Int(confidence*100))%" : "Pulse: listening / uncertain. Percussion waits for a steady pulse.").font(.callout.monospacedDigit())
                Text("Peak \(model.telemetry["peak"] as? Double ?? 0,specifier:"%.3f") · processed \(model.telemetry["frames"] as? UInt64 ?? 0) frames · max callback \(model.telemetry["maxCallbackMs"] as? Double ?? 0,specifier:"%.2f") ms").font(.caption.monospacedDigit())
                Text("Pulse is an estimate, not a verified beat grid. Roll uses 120 BPM while uncertain. Stop restores the source route; it does not pause another app. Device changes stop capture. Start at a comfortable output level.").font(.caption).foregroundStyle(.secondary)
                Divider()
                HStack { Button("Copy pairing code and open website",action:model.pair);Button("Disconnect website") { model.server.revoke() } }
                Text(model.pairing).font(.callout)
                Text("Native effects run here; the website sends controls only. Closing a connected page stops capture within 5 seconds. Windows/Linux capture and multi-output cue routing are not included.").font(.caption).foregroundStyle(.secondary)
            }.padding(24)
        }.frame(minWidth:680,minHeight:730)
    }
}

final class Delegate: NSObject, NSApplicationDelegate {
    var model: LiveModel?
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification:Notification) { model?.shutdown() }
}

@main struct JamloomLiveApp: App {
    @NSApplicationDelegateAdaptor(Delegate.self) var delegate
    @StateObject private var model=LiveModel()
    var body: some Scene {
        Window("Jamloom Live Source",id:"live-source") {
            LiveView(model:model).preferredColorScheme(.dark).onAppear { delegate.model=model;NSApp.setActivationPolicy(.regular);NSApp.activate(ignoringOtherApps:true) }
        }.defaultSize(width:760,height:830)
    }
}
