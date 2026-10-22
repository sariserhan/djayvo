import XCTest
@testable import JamloomLive
import LiveAudio

private final class MicProbe:JLMicrophone {
    var starts=0,clears=0,recording=false,denied=false,frames=4800
    override func start()->String? { starts+=1;recording = !denied;return denied ? "Input unavailable":nil }
    override func stop() { recording=false }
    override func clear() { clears+=1;recording=false }
    override func status()->[String:Any] { ["recording":recording,"frames":frames,"sampleRate":48000.0,"invalid":false] }
    override func sample()->Data { [Float](repeating:0.2,count:frames).withUnsafeBytes { Data($0) } }
}
private final class PadProbe:JLLiveAudio {
    var loaded=0,plays=0,stops=0,clears=0,accept=true
    override func loadSample(_ pcm:Data,sampleRate:Double)->Bool { if accept { loaded+=1 };return accept }
    override func playSample()->Bool { plays+=1;return true }
    override func stopSample() { stops+=1 }
    override func clearSample() { clears+=1 }
    override func status()->[String:Any] { ["active":true,"inputPeak":0.1] }
}
final class SamplerTests:XCTestCase {
    @MainActor func testConsentCancellationAndNoRemoteRecording() throws {
        let mic=MicProbe(),model=LiveModel(audio:[PadProbe(),PadProbe()],microphone:mic)
        defer { model.shutdown() }
        var reply:((Bool)->Void)?
        model.requestMicPermission={reply=$0}
        model.recordSample();XCTAssertNil(reply)
        model.micConsent=true;model.recordSample();XCTAssertTrue(model.micWaiting)
        model.micConsent=false;reply?(true)
        RunLoop.main.run(until:Date().addingTimeInterval(0.02))
        XCTAssertEqual(mic.starts,0,"Late permission grant must not start a revoked recording")
        let token=try model.server.pair(origin:"https://www.jamloom.com")
        for body in ["{\"action\":\"record\"}","{\"action\":\"play\",\"deck\":2}","{\"action\":\"clear\",\"pcm\":[]}"] {
            let r=LocalRequest(method:"POST",path:"/sampler",headers:["host":"127.0.0.1:48191","origin":"https://www.jamloom.com","authorization":"Bearer "+token,"content-type":"application/json"],body:Data(body.utf8))
            XCTAssertEqual(model.server.handle(r).0,400)
        }
    }
    @MainActor func testRecordingPreparationTargetAndClear() {
        let a=PadProbe(),b=PadProbe(),mic=MicProbe(),model=LiveModel(audio:[a,b],microphone:mic)
        defer { model.shutdown() }
        model.requestMicPermission={$0(true)};model.micConsent=true;model.recordSample()
        RunLoop.main.run(until:Date().addingTimeInterval(0.02));XCTAssertTrue(model.micRecording)
        b.accept=false;model.finishSample();XCTAssertFalse(model.micRecording);XCTAssertFalse(model.sampleReady)
        XCTAssertEqual(a.loaded,1);b.accept=true;model.poll();XCTAssertTrue(model.sampleReady);XCTAssertEqual(a.loaded,1,"Retry only the not-yet-loaded deck")
        XCTAssertEqual(model.sampleSeconds,0.1,accuracy:0.0001)
        XCTAssertFalse(model.sampleAction(SampleAction(action:"play",deck:0)),"Must have a running source route")
        model.decks[1].active=true
        XCTAssertTrue(model.sampleAction(SampleAction(action:"play",deck:1)));XCTAssertEqual(a.plays,0);XCTAssertEqual(b.plays,1)
        XCTAssertFalse(model.sampleAction(SampleAction(action:"play",deck:5)))
        model.micConsent=false;XCTAssertFalse(model.sampleReady);XCTAssertGreaterThan(a.clears,0);XCTAssertGreaterThan(b.clears,0)
        XCTAssertFalse(model.sampleAction(SampleAction(action:"play",deck:1)))
    }
    @MainActor func testDeniedInputAutoFinishAndPanic() {
        let mic=MicProbe(),model=LiveModel(audio:[PadProbe(),PadProbe()],microphone:mic)
        defer { model.shutdown() }
        model.micConsent=true;model.requestMicPermission={$0(false)};model.recordSample()
        RunLoop.main.run(until:Date().addingTimeInterval(0.02));XCTAssertEqual(mic.starts,0);XCTAssertTrue(model.sampleMessage.contains("denied"))
        model.requestMicPermission={$0(true)};model.recordSample();RunLoop.main.run(until:Date().addingTimeInterval(0.02))
        mic.frames=192000;mic.recording=false;model.poll();XCTAssertTrue(model.sampleReady);XCTAssertEqual(model.sampleSeconds,4)
        model.recordSample();RunLoop.main.run(until:Date().addingTimeInterval(0.02));model.stop()
        XCTAssertFalse(model.micRecording);XCTAssertFalse(model.micWaiting);XCTAssertFalse(model.sampleReady)
        model.consent=true;model.recordSample();RunLoop.main.run(until:Date().addingTimeInterval(0.02))
        model.decks[0].active=true;model.consent=false
        XCTAssertFalse(model.active);XCTAssertFalse(model.micRecording);XCTAssertFalse(model.sampleReady)
    }
    func testNativeSampleLoadBoundsWithoutCapture() {
        let audio=JLLiveAudio();let data=[Float](repeating:0.2,count:4800).withUnsafeBytes { Data($0) }
        XCTAssertFalse(audio.loadSample(Data([1]),sampleRate:48000))
        XCTAssertFalse(audio.loadSample(Data(count:192000*4*4+4),sampleRate:192000))
        XCTAssertFalse(audio.loadSample(data,sampleRate:.infinity))
        XCTAssertTrue(audio.loadSample(data,sampleRate:48000));XCTAssertFalse(audio.playSample())
        XCTAssertTrue(audio.status()["sampleReady"] as? Bool ?? false)
        audio.clearSample();XCTAssertFalse(audio.status()["sampleReady"] as? Bool ?? true)
        XCTAssertTrue(audio.loadSample(data,sampleRate:48000));audio.stop();audio.clearSample()
    }
}
