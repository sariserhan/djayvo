import XCTest
import SwiftUI
@testable import JamloomLive
import LiveAudio

private final class ControlProbe: JLLiveAudio {
    var applied=LiveControls(), gain=0.0, calls=0, accept=true, started:UInt32=0
    var startError:String?
    var snapshot:[String:Any] = ["active":false]
    override func status()->[String:Any] { snapshot }
    override func startProcess(_ process:UInt32,output:UInt32)->String? {
        if let startError { return startError }
        started=process;snapshot["active"]=true;return nil
    }
    override func stop() { snapshot["active"]=false }
    override func setControls(_ controls:[String:Any],mixGain:Double)->Bool {
        calls+=1;gain=mixGain
        applied=try! JSONDecoder().decode(LiveControls.self,from:JSONSerialization.data(withJSONObject:controls))
        return accept
    }
}
final class ControlModelTests: XCTestCase {
    func testUpdateSessionCannotStartCaptureOrRequestMicrophone() {
        let a=ControlProbe(),b=ControlProbe(),model=LiveModel(audio:[a,b])
        defer { model.shutdown() }
        model.output=3;model.decks[0].process=1;model.consent=true;model.micConsent=true
        var requested=false
        model.requestMicPermission={ _ in requested=true }
        model.updateInProgress=true
        model.start(0);model.recordSample()
        XCTAssertEqual(a.started,0);XCTAssertFalse(model.active);XCTAssertFalse(requested)
        XCTAssertFalse(model.performanceBusy)
        model.updateInProgress=false;model.start(0)
        XCTAssertTrue(model.active);XCTAssertTrue(model.performanceBusy)
        model.stop();model.recordSample()
        XCTAssertTrue(requested);XCTAssertTrue(model.performanceBusy)
        model.clearSample();XCTAssertFalse(model.performanceBusy)
    }
    func testIndependentDecksAndRemoteMixerReachEngines() throws {
        let a=ControlProbe(),b=ControlProbe(),model=LiveModel(audio:[a,b])
        defer { model.shutdown() }
        let beforeB=b.calls
        model.updateDeck(0) { $0.low = -18;$0.highpass=500;$0.echoSeconds=0.5;$0.reverse=true }
        XCTAssertEqual(a.applied,model.controls.decks[0]);XCTAssertEqual(b.calls,beforeB)
        model.controls.crossfader=0
        XCTAssertEqual(a.gain,0.45,accuracy:1e-9);XCTAssertEqual(b.gain,0)
        let token=try model.server.pair(origin:"https://www.jamloom.com")
        var remote=MixControls();remote.crossfader=1;remote.decks[1].roll=true;remote.decks[1].loopBeats=4;remote.decks[1].mute=true
        let request=LocalRequest(method:"POST",path:"/controls",headers:["host":"127.0.0.1:48191","origin":"https://www.jamloom.com","authorization":"Bearer "+token,"content-type":"application/json"],body:try JSONEncoder().encode(remote))
        XCTAssertEqual(model.server.handle(request).0,200)
        XCTAssertEqual(a.applied,remote.decks[0]);XCTAssertEqual(b.applied,remote.decks[1])
        XCTAssertEqual(a.gain,0,accuracy:1e-9);XCTAssertEqual(b.gain,0.45,accuracy:1e-9)
        a.accept=false;model.controls.decks[0].level=0.2
        XCTAssertTrue(model.decks[0].message.contains("rejected"))
    }
    func testEffectsAndTransportKeepTheirBoundaries() {
        let a=ControlProbe(),b=ControlProbe(),model=LiveModel(audio:[a,b])
        defer { model.shutdown() }
        model.controls.decks[0].bypass=true
        model.updateDeck(0) { $0.highpass=400 }
        XCTAssertFalse(a.applied.bypass)
        model.controls.decks[0].bypass=true;model.controls.master=0.2
        XCTAssertTrue(a.applied.bypass)
        let before=a.calls
        model.updateDeck(0) { $0.tone = .infinity }
        XCTAssertEqual(a.calls,before)
        model.updateDeck(0,effect:false) { $0.scratch=true;$0.scratchRate = -1;$0.reverse=true;$0.roll=true }
        model.decks[0].lastScratch=Date().addingTimeInterval(-1);model.poll()
        XCTAssertTrue(a.applied.scratch);XCTAssertEqual(a.applied.scratchRate,0)
        model.releasePlatters();XCTAssertFalse(a.applied.scratch)
        model.returnLive(0);XCTAssertFalse(a.applied.reverse);XCTAssertFalse(a.applied.roll)
        XCTAssertEqual(b.applied,LiveControls())
        XCTAssertLessThan(LivePlatter.jogRate(from:-3,to:3,seconds:0.1),0)
        XCTAssertGreaterThan(LivePlatter.jogRate(from:3,to:-3,seconds:0.1),0)
        XCTAssertEqual(LivePlatter.jogRate(from:0,to:3,seconds:0),2)
    }
    func testTwoSourcesStartStopAndFailIndependently() {
        let a=ControlProbe(),b=ControlProbe(),model=LiveModel(audio:[a,b])
        defer { model.shutdown() }
        model.output=3;model.decks[0].process=1;model.decks[1].process=2
        model.start(0);XCTAssertFalse(model.active,"Consent required");XCTAssertNil(model.performanceActivity)
        model.consent=true;model.start(0);XCTAssertTrue(model.decks[0].active)
        XCTAssertNotNil(model.performanceActivity,"Live capture prevents idle display/system sleep")
        b.startError="Unsupported source";model.start(1)
        XCTAssertTrue(model.decks[0].active);XCTAssertFalse(model.decks[1].active)
        b.startError=nil;model.decks[1].process=1;model.start(1)
        XCTAssertTrue(model.decks[1].message.contains("different"));XCTAssertEqual(b.started,0)
        model.decks[1].process=2;model.start(1);XCTAssertTrue(model.decks[1].active)
        model.stopDeck(0);XCTAssertTrue(model.decks[1].active);XCTAssertNotNil(model.performanceActivity)
        model.stop();XCTAssertFalse(model.active);XCTAssertNil(model.performanceActivity)
        model.start(0);a.snapshot["active"]=false;model.poll()
        XCTAssertNil(model.performanceActivity,"A failed last route releases the wake assertion")
    }
    @MainActor func testDeckLayoutSnapshot() throws {
        guard let path = ProcessInfo.processInfo.environment["JAMLOOM_DECK_SNAPSHOT"] else { throw XCTSkip("Optional rendered layout evidence") }
        let probe = ControlProbe(), other = ControlProbe()
        probe.snapshot = ["active":true,"inputPeak":0.3,"peak":0.3,"bpm":120.0,"confidence":0.9,"bufferedSeconds":4.0]
        other.snapshot=probe.snapshot
        let model = LiveModel(audio:[probe,other])
        defer { model.shutdown() }
        model.sources = [["id":NSNumber(value:1),"name":"Practice source A"],["id":NSNumber(value:2),"name":"Practice source B"]]
        model.outputs = [["id":NSNumber(value:2),"name":"Muted test output"]]
        model.output=2;model.consent=true
        for i in 0..<2 { model.decks[i].process=UInt32(i+1);model.decks[i].active=true;model.decks[i].heardAudio=true;model.decks[i].source=i==0 ? "Practice source A":"Practice source B";model.decks[i].telemetry=["peak":0.3,"bpm":120.0,"confidence":0.9,"bufferedSeconds":4.0] }
        model.message = "Layout fixture only. No captured or audible audio."
        model.micConsent=true;model.sampleReady=true;model.sampleSeconds=2.5
        _ = NSApplication.shared
        let host = NSHostingView(rootView:LiveView(model:model).preferredColorScheme(.dark))
        let width=Double(ProcessInfo.processInfo.environment["JAMLOOM_DECK_WIDTH"] ?? "1280") ?? 1280
        let height=Double(ProcessInfo.processInfo.environment["JAMLOOM_DECK_HEIGHT"] ?? "1000") ?? 1000
        let window = NSWindow(contentRect:NSRect(x:0,y:0,width:width,height:height),styleMask:[.borderless],backing:.buffered,defer:false)
        window.contentView = host
        host.frame = NSRect(x:0,y:0,width:width,height:height)
        window.display();host.layoutSubtreeIfNeeded()
        RunLoop.main.run(until:Date().addingTimeInterval(0.2))
        let bitmap = try XCTUnwrap(host.bitmapImageRepForCachingDisplay(in:host.bounds))
        host.cacheDisplay(in:host.bounds,to:bitmap)
        var colors = Set<String>()
        for x in stride(from:0,to:bitmap.pixelsWide,by:32) { for y in stride(from:0,to:bitmap.pixelsHigh,by:32) { colors.insert(bitmap.colorAt(x:x,y:y)?.description ?? "") } }
        XCTAssertGreaterThan(colors.count,20,"Snapshot must contain rendered deck controls")
        try XCTUnwrap(bitmap.representation(using:.png,properties:[:])).write(to:URL(fileURLWithPath:path))
    }
}
