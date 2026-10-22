import AppKit
import SwiftUI
import LiveAudio
import AVFoundation

struct LiveDeck {
    var process: UInt32 = 0
    var active = false, heardAudio = false
    var message = "Choose a playing app.", source = "No source selected"
    var telemetry: [String:Any] = [:]
    var started = Date.distantPast, lastScratch = Date.distantPast
}
final class LiveModel: ObservableObject {
    @Published var updateInProgress=false
    var performanceBusy:Bool { active || micRecording || micWaiting }
    @Published var sources: [[String: Any]] = []
    @Published var outputs: [[String: Any]] = []
    @Published var decks = [LiveDeck(),LiveDeck()]
    @Published var output: UInt32 = 0
    @Published var consent = false { didSet { if !consent { stop();clearSample() } } }
    @Published var message = "Select two different playing apps, or start with one deck."
    @Published var pairing = "Website control is disconnected."
    @Published var controls = MixControls() { didSet { if controls != oldValue { apply(previous:oldValue) } } }
    @Published var micConsent=false { didSet { if !micConsent { clearSample() } } }
    @Published var micRecording=false
    @Published var micWaiting=false
    @Published var sampleReady=false
    @Published var sampleSeconds=0.0
    @Published var sampleMessage="Record a short sound, then play it through either deck."
    let microphone:JLMicrophone
    var requestMicPermission: (@escaping (Bool)->Void)->Void = { completion in AVCaptureDevice.requestAccess(for:.audio,completionHandler:completion) }
    private var micGeneration=0, micStarted=Date.distantPast
    private var pendingSample:Data?, pendingRate=0.0, sampleLoaded=[false,false]
    let audio: [JLLiveAudio]
    let server = ControlServer()
    var active: Bool { decks.contains { $0.active } }
    private(set) var performanceActivity:NSObjectProtocol?
    private var timer: Timer?, sleepObserver: NSObjectProtocol?, focusObserver: NSObjectProtocol?
    init(audio: [JLLiveAudio] = [JLLiveAudio(),JLLiveAudio()],microphone:JLMicrophone=JLMicrophone()) {
        precondition(audio.count==2)
        self.audio=audio;self.microphone=microphone
        server.status = { [weak self] in self?.snapshot() ?? [:] }
        server.apply = { [weak self] value in
            guard let self else { return }
            for i in 0..<2 where value.decks[i].scratch { self.decks[i].lastScratch=Date() }
            self.controls=value
        }
        server.sample = { [weak self] action in self?.sampleAction(action) ?? false }
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
        guard !updateInProgress,(0..<2).contains(index),consent,!decks[index].active,decks[index].process != 0,output != 0 else { return }
        guard decks[index].process != decks[1-index].process else { decks[index].message="Choose a different audio process for each deck.";return }
        controls.decks[index].returnLive();apply()
        if let error=audio[index].startProcess(decks[index].process,output:output) { decks[index].message=error;return }
        decks[index].source=sources.first { ($0["id"] as? NSNumber)?.uint32Value == decks[index].process }?["name"] as? String ?? "Selected source"
        decks[index].active=true;updatePerformanceActivity();decks[index].started=Date();decks[index].heardAudio=false
        decks[index].message="Live. Drag the platter or use a loop to replay recent audio.";apply()
    }
    func stopDeck(_ index:Int) {
        guard (0..<2).contains(index) else { return }
        audio[index].stop();decks[index].active=false;updatePerformanceActivity();controls.decks[index].returnLive()
        decks[index].message="Stopped. Original app audio is restored. Use Mute to silence a captured deck."
    }
    func stop() { cancelMic();for engine in audio { engine.stopSample() };for i in 0..<2 { stopDeck(i) };message="Both sources released. Playback remains in the source apps." }
    private func updatePerformanceActivity() {
        // Display sleep can disconnect an HDMI/DisplayPort speaker during a set.
        if active && performanceActivity==nil { performanceActivity=ProcessInfo.processInfo.beginActivity(options:[.userInitiated,.idleDisplaySleepDisabled],reason:"Jamloom Live audio capture") }
        else if !active,let activity=performanceActivity { ProcessInfo.processInfo.endActivity(activity);performanceActivity=nil }
    }
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
        if micRecording {
            let status=microphone.status();sampleSeconds=(status["frames"] as? Double ?? 0)/max(1,status["sampleRate"] as? Double ?? 1)
            if !(status["recording"] as? Bool ?? false) || Date().timeIntervalSince(micStarted)>4.5 { finishSample() }
        }
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
        updatePerformanceActivity();installSample()
    }
    func recordSample() {
        guard !updateInProgress,micConsent,!micWaiting,!micRecording else { return }
        clearSample();micWaiting=true;sampleMessage="Allow microphone access to record.";let generation=micGeneration
        requestMicPermission { [weak self] allowed in
            DispatchQueue.main.async {
                guard let self,self.micGeneration==generation,self.micConsent else { return }
                self.micWaiting=false
                guard allowed else { self.sampleMessage="Microphone permission denied. Enable it in System Settings to record.";return }
                if let error=self.microphone.start() { self.sampleMessage=error;return }
                self.micRecording=true;self.micStarted=Date();self.sampleMessage="Recording microphone · stops at four seconds. No live monitoring."
            }
        }
    }
    func cancelMic() {
        micGeneration+=1;micWaiting=false
        if micRecording { microphone.clear();micRecording=false;sampleSeconds=0;sampleMessage="Recording cancelled." }
    }
    func clearSample() {
        cancelMic();microphone.clear();pendingSample=nil;sampleLoaded=[false,false];sampleReady=false;sampleSeconds=0
        for engine in audio { engine.clearSample() }
        sampleMessage="Sample cleared from memory."
    }
    func finishSample() {
        guard micRecording else { return }
        microphone.stop();micRecording=false
        let status=microphone.status(),data=microphone.sample(),rate=status["sampleRate"] as? Double ?? 0
        guard !(status["invalid"] as? Bool ?? true),rate.isFinite,rate>=8000,rate<=192000,data.count>=512,data.count<=Int(rate*4)*4 else { microphone.clear();sampleMessage="No usable microphone audio. Check the input device and try again.";return }
        pendingSample=data;pendingRate=rate;sampleSeconds=Double(data.count/4)/rate;sampleMessage="Preparing sample…";microphone.clear();installSample()
    }
    func installSample() {
        guard let data=pendingSample else { return }
        for i in 0..<2 where !sampleLoaded[i] { sampleLoaded[i]=audio[i].loadSample(data,sampleRate:pendingRate) }
        if sampleLoaded.allSatisfy({$0}) { pendingSample=nil;sampleReady=true;sampleMessage="Ready. Play through an active deck’s effects, level and mute." }
    }
    func sampleAction(_ action:SampleAction)->Bool {
        switch action.action {
        case "clear":clearSample();return true
        case "stop":for engine in audio { engine.stopSample() };return true
        case "play":
            guard micConsent,sampleReady,!micRecording,let deck=action.deck,(0..<2).contains(deck),decks[deck].active else { return false }
            for engine in audio { engine.stopSample() }
            guard audio[deck].playSample() else { sampleMessage="Start the chosen deck before playing the sample.";return false }
            sampleMessage="Playing sample through Deck \(deck==0 ? "A":"B").";return true
        default:return false
        }
    }
    func sampleSnapshot()->[String:Any] {
        ["recording":micRecording,"waiting":micWaiting,"ready":sampleReady,"seconds":sampleSeconds,"message":sampleMessage,
         "playing":decks.enumerated().filter { $0.element.telemetry["samplePlaying"] as? Bool ?? false }.map { $0.offset }]
    }
    func snapshot()->[String:Any] {
        ["active":active,"message":message,"sampler":sampleSnapshot(),"output":outputs.first { ($0["id"] as? NSNumber)?.uint32Value==output }?["name"] as? String ?? "No output selected",
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
        stop();clearSample();server.shutdown();timer?.invalidate()
        if let sleepObserver { NSWorkspace.shared.notificationCenter.removeObserver(sleepObserver) }
        if let focusObserver { NotificationCenter.default.removeObserver(focusObserver) }
    }
}
