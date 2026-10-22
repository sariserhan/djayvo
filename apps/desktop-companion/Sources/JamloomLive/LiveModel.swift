import AppKit
import SwiftUI
import LiveAudio

struct LiveDeck {
    var process: UInt32 = 0
    var active = false, heardAudio = false
    var message = "Choose a playing app.", source = "No source selected"
    var telemetry: [String:Any] = [:]
    var started = Date.distantPast, lastScratch = Date.distantPast
}
final class LiveModel: ObservableObject {
    @Published var sources: [[String: Any]] = []
    @Published var outputs: [[String: Any]] = []
    @Published var decks = [LiveDeck(),LiveDeck()]
    @Published var output: UInt32 = 0
    @Published var consent = false
    @Published var message = "Select two different playing apps, or start with one deck."
    @Published var pairing = "Website control is disconnected."
    @Published var controls = MixControls() { didSet { if controls != oldValue { apply(previous:oldValue) } } }
    let audio: [JLLiveAudio]
    let server = ControlServer()
    var active: Bool { decks.contains { $0.active } }
    private var timer: Timer?, sleepObserver: NSObjectProtocol?, focusObserver: NSObjectProtocol?
    init(audio: [JLLiveAudio] = [JLLiveAudio(),JLLiveAudio()]) {
        precondition(audio.count==2)
        self.audio=audio
        server.status = { [weak self] in self?.snapshot() ?? [:] }
        server.apply = { [weak self] value in
            guard let self else { return }
            for i in 0..<2 where value.decks[i].scratch { self.decks[i].lastScratch=Date() }
            self.controls=value
        }
        server.stop = { [weak self] in self?.stop() }
        server.connectionChanged = { [weak self] text in self?.pairing=text }
        do { try server.start() } catch { pairing="Website connection unavailable. Native controls still work." }
        refresh();apply()
        timer=Timer.scheduledTimer(withTimeInterval:0.1,repeats:true) { [weak self] _ in self?.poll() }
        sleepObserver=NSWorkspace.shared.notificationCenter.addObserver(forName:NSWorkspace.willSleepNotification,object:nil,queue:.main) { [weak self] _ in self?.stop();self?.server.revoke() }
        focusObserver=NotificationCenter.default.addObserver(forName:NSApplication.didResignActiveNotification,object:nil,queue:.main) { [weak self] _ in self?.releasePlatters() }
    }
    func refresh() { sources=JLLiveAudio.sources();outputs=JLLiveAudio.outputs() }
    func start(_ index:Int) {
        guard (0..<2).contains(index),consent,!decks[index].active,decks[index].process != 0,output != 0 else { return }
        guard decks[index].process != decks[1-index].process else { decks[index].message="Choose a different audio process for each deck.";return }
        controls.decks[index].returnLive();apply()
        if let error=audio[index].startProcess(decks[index].process,output:output) { decks[index].message=error;return }
        decks[index].source=sources.first { ($0["id"] as? NSNumber)?.uint32Value == decks[index].process }?["name"] as? String ?? "Selected source"
        decks[index].active=true;decks[index].started=Date();decks[index].heardAudio=false
        decks[index].message="Live. Drag the platter or use a loop to replay recent audio.";apply()
    }
    func stopDeck(_ index:Int) {
        guard (0..<2).contains(index) else { return }
        audio[index].stop();decks[index].active=false;controls.decks[index].returnLive()
        decks[index].message="Stopped. Original app audio is restored. Use Mute to silence a captured deck."
    }
    func stop() { for i in 0..<2 { stopDeck(i) };message="Both sources released. Playback remains in the source apps." }
    func returnLive(_ index:Int) { controls.decks[index].returnLive() }
    func releasePlatters() { for i in 0..<2 { controls.decks[i].scratch=false;controls.decks[i].scratchRate=0 } }
    func updateDeck(_ index:Int,effect:Bool=true,_ update: (inout LiveControls)->Void) {
        guard (0..<2).contains(index) else { return }
        var next=controls
        update(&next.decks[index]);if effect { next.decks[index].bypass=false }
        guard next.valid else { return }
        if next.decks[index].scratch { decks[index].lastScratch=Date() }
        controls=next
    }
    func apply(previous: MixControls? = nil) {
        guard controls.valid else { return }
        for i in 0..<2 {
            if let previous,previous.decks[i]==controls.decks[i],previous.gain(i)==controls.gain(i) { continue }
            if !audio[i].setControls(controls.decks[i].dictionary,mixGain:controls.gain(i)) {
                decks[i].message="The audio engine rejected this control change. Stop and reconnect this deck."
            }
        }
    }
    func poll() {
        server.tick()
        for i in 0..<2 {
            decks[i].telemetry=audio[i].status()
            if decks[i].active && !(decks[i].telemetry["active"] as? Bool ?? false) {
                decks[i].active=false;controls.decks[i].returnLive()
                let error=decks[i].telemetry["error"] as? String ?? ""
                decks[i].message=error.isEmpty ? "Capture ended. Source audio restored." : error
            }
            if decks[i].active {
                if (decks[i].telemetry["inputPeak"] as? Double ?? 0)>0.0001 { decks[i].heardAudio=true }
                if !decks[i].heardAudio && Date().timeIntervalSince(decks[i].started)>10 {
                    stopDeck(i);decks[i].message="No audio received. Choose a permitted playing source."
                }
            }
            if controls.decks[i].scratch && controls.decks[i].scratchRate != 0 && Date().timeIntervalSince(decks[i].lastScratch)>0.15 { controls.decks[i].scratchRate=0 }
        }
    }
    func snapshot()->[String:Any] {
        ["active":active,"message":message,"output":outputs.first { ($0["id"] as? NSNumber)?.uint32Value==output }?["name"] as? String ?? "No output selected",
         "decks":decks.enumerated().map { i,deck in deck.telemetry.merging(["id":i==0 ? "A":"B","active":deck.active,"source":deck.source,"message":deck.message]) { _,new in new } },"controls":controls.dictionary]
    }
    func pair(origin:String="https://www.jamloom.com") {
        do {
            let token=try server.pair(origin:origin)
            let item=NSPasteboardItem();item.setString(token,forType:.string);item.setString("",forType:NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
            NSPasteboard.general.clearContents();NSPasteboard.general.writeObjects([item]);NSWorkspace.shared.open(URL(string:origin+"/live-dj")!)
            pairing="Code copied. Paste it into the website and connect. Valid for 15 minutes."
        } catch { pairing="Could not create a secure pairing. Try again." }
    }
    func shutdown() {
        stop();server.shutdown();timer?.invalidate()
        if let sleepObserver { NSWorkspace.shared.notificationCenter.removeObserver(sleepObserver) }
        if let focusObserver { NotificationCenter.default.removeObserver(focusObserver) }
    }
}
