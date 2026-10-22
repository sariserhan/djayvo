import XCTest
import SwiftUI
@testable import JamloomLive
import LiveAudio

private final class ControlProbe: JLLiveAudio {
    var applied = LiveControls(), calls = 0, accept = true
    var snapshot: [String:Any] = ["active":false]
    override func status() -> [String:Any] { snapshot }
    override func setLevel(_ level: Double, low: Double, mid: Double, high: Double, tone: Double, echo: Double, bypass: Bool, roll: Bool, percussion: Bool) -> Bool {
        calls += 1
        applied = LiveControls(level:level,low:low,mid:mid,high:high,tone:tone,echo:echo,bypass:bypass,roll:roll,percussion:percussion)
        return accept
    }
}
final class ControlModelTests: XCTestCase {
    func testNativeAndWebsiteChangesReachEngineWithoutAView() throws {
        let audio = ControlProbe(), model = LiveModel(audio:audio)
        defer { model.shutdown() }
        model.controls.low = -18
        model.controls.mid = -12
        model.controls.high = -9
        model.controls.tone = 700
        model.controls.echo = 0.35
        model.controls.roll = true
        model.controls.percussion = true
        XCTAssertEqual(audio.calls,7)
        XCTAssertEqual(audio.applied,model.controls)
        let token = try model.server.pair(origin:"https://www.jamloom.com")
        let remote = LiveControls(level:0.3,low:3,mid:-6,high:2,tone:2500,echo:0.2,bypass:true,roll:false,percussion:false)
        let request = LocalRequest(method:"POST",path:"/controls",headers:["host":"127.0.0.1:48191","origin":"https://www.jamloom.com","authorization":"Bearer "+token,"content-type":"application/json"],body:try JSONEncoder().encode(remote))
        XCTAssertEqual(model.server.handle(request).0,200)
        XCTAssertEqual(audio.calls,8)
        XCTAssertEqual(audio.applied,remote)
        audio.accept = false;model.controls.level = 0.2
        XCTAssertTrue(model.message.contains("rejected"))
    }
    func testEffectEditsLeaveBypassButMasterPreservesIt() {
        let audio = ControlProbe(), model = LiveModel(audio:audio)
        defer { model.shutdown() }
        let effects: [(inout LiveControls) -> Void] = [{$0.low = -18},{$0.mid = -12},{$0.high = -9},{$0.tone = 500},{$0.echo = 0.4},{$0.roll = true},{$0.percussion = true}]
        for edit in effects {
            model.controls.bypass = true
            model.updateEffect(edit)
            XCTAssertFalse(audio.applied.bypass)
            XCTAssertEqual(audio.applied,model.controls)
        }
        model.controls.bypass = true;model.controls.level = 0.2
        XCTAssertTrue(audio.applied.bypass)
        let before = audio.calls
        model.updateEffect { $0.tone = .infinity }
        XCTAssertEqual(audio.calls,before)
    }
    @MainActor func testDeckLayoutSnapshot() throws {
        guard let path = ProcessInfo.processInfo.environment["JAMLOOM_DECK_SNAPSHOT"] else { throw XCTSkip("Optional rendered layout evidence") }
        let probe = ControlProbe()
        probe.snapshot = ["active":true,"inputPeak":0.3,"peak":0.3,"bpm":120.0,"confidence":0.9]
        let model = LiveModel(audio:probe)
        defer { model.shutdown() }
        model.sources = [["id":NSNumber(value:1),"name":"Synthetic practice source"]]
        model.outputs = [["id":NSNumber(value:2),"name":"Muted test output"]]
        model.process = 1;model.output = 2;model.active = true;model.consent = true
        model.telemetry = ["peak":0.3,"bpm":120.0,"confidence":0.9]
        model.message = "Layout fixture only. No captured or audible audio."
        _ = NSApplication.shared
        let host = NSHostingView(rootView:LiveView(model:model).preferredColorScheme(.dark))
        let window = NSWindow(contentRect:NSRect(x:0,y:0,width:1080,height:820),styleMask:[.borderless],backing:.buffered,defer:false)
        window.contentView = host
        host.frame = NSRect(x:0,y:0,width:1080,height:820)
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
