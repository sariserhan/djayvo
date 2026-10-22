import XCTest
@testable import JamloomLive
import LiveAudio

final class ControlTests: XCTestCase {
    func request(_ method:String="GET",_ path:String="/status",token:String,origin:String="https://www.jamloom.com",body:Data=Data()) -> LocalRequest {
        LocalRequest(method:method,path:path,headers:["host":"127.0.0.1:48191","origin":origin,"authorization":"Bearer "+token,"content-type":"application/json"],body:body)
    }
    func testPairOriginExpiryRevocationAndHeartbeat() throws {
        let server=ControlServer(), now=Date();var stops=0
        server.stop={stops+=1};server.status={ ["active":false] }
        let token=try server.pair(origin:"https://www.jamloom.com",now:now)
        XCTAssertEqual(token.count,64)
        XCTAssertEqual(server.handle(request(token:"bad"),now:now).0,401)
        XCTAssertEqual(server.handle(request(token:token,origin:"https://evil.example"),now:now).0,403)
        XCTAssertFalse(server.connected)
        XCTAssertEqual(server.handle(request(token:token),now:now).0,200)
        server.tick(now:now.addingTimeInterval(6));XCTAssertEqual(stops,1);XCTAssertTrue(server.token.isEmpty)
        let next=try server.pair(origin:"https://www.jamloom.com",now:now);XCTAssertNotEqual(next,token)
        XCTAssertEqual(server.handle(request(token:token),now:now).0,401)
        XCTAssertEqual(server.handle(request(token:next),now:now.addingTimeInterval(901)).0,401)
        XCTAssertThrowsError(try server.pair(origin:"https://jamloom.com.evil.example"))
    }
    func testCommandsAreBoundedAndCannotStartCapture() throws {
        let server=ControlServer();let token=try server.pair(origin:"https://www.jamloom.com");var count=0;server.apply={_ in count+=1}
        XCTAssertEqual(server.handle(request("POST","/start",token:token)).0,404)
        let valid=try JSONEncoder().encode(MixControls())
        XCTAssertEqual(server.handle(request("POST","/controls",token:token,body:valid)).0,200);XCTAssertEqual(count,1)
        for body in ["{}","[]","{\"level\":4}",String(data:valid,encoding:.utf8)!.replacingOccurrences(of:"0.7",with:"40.0")]{
            XCTAssertEqual(server.handle(request("POST","/controls",token:token,body:Data(body.utf8))).0,400)
        }
        XCTAssertEqual(count,1)
        var controls=LiveControls();controls.low = .nan;XCTAssertFalse(controls.valid)
        controls=LiveControls();controls.tone=19000;XCTAssertFalse(controls.valid)
        XCTAssertEqual(server.handle(request("DELETE","/status",token:token)).0,405)
    }
    func testStrictTwoDeckProtocol() throws {
        let valid=MixControls().dictionary
        XCTAssertNotNil(MixControls.decode(try JSONSerialization.data(withJSONObject:valid)))
        var bad=valid;bad["decks"]=[LiveControls().dictionary]
        XCTAssertNil(MixControls.decode(try JSONSerialization.data(withJSONObject:bad)))
        var deck=LiveControls().dictionary;deck["extra"]=1;bad=valid;bad["decks"]=[deck,LiveControls().dictionary]
        XCTAssertNil(MixControls.decode(try JSONSerialization.data(withJSONObject:bad)))
        deck=LiveControls().dictionary;deck.removeValue(forKey:"scratch");bad["decks"]=[deck,LiveControls().dictionary]
        XCTAssertNil(MixControls.decode(try JSONSerialization.data(withJSONObject:bad)))
        for key in ["crossfader","master"] { bad=valid;bad[key]=2;XCTAssertNil(MixControls.decode(try JSONSerialization.data(withJSONObject:bad))) }
        for (key,value) in [("tempo",0.0),("highpass",5000.0),("scratchRate",3.0),("echoSeconds",2.0),("loopBeats",3.0)] {
            deck=LiveControls().dictionary;deck[key]=value;bad=valid;bad["decks"]=[deck,LiveControls().dictionary]
            XCTAssertNil(MixControls.decode(try JSONSerialization.data(withJSONObject:bad)))
        }
        XCTAssertNil(MixControls.decode(try JSONEncoder().encode(LiveControls())),"Old client cannot partially control two decks")
    }
    func testHTTPFramingAndRebinding() throws {
        XCTAssertNil(try LocalRequest.parse(Data("GET /status HTTP/1.1\r\n".utf8)))
        let request=try XCTUnwrap(LocalRequest.parse(Data("GET /status HTTP/1.1\r\nHost: evil.example\r\nOrigin: https://www.jamloom.com\r\n\r\n".utf8)))
        let server=ControlServer();_ = try server.pair(origin:"https://www.jamloom.com")
        XCTAssertEqual(server.handle(request).0,403)
        for body in ["POST /controls HTTP/1.1\r\nContent-Length: 3000\r\n\r\n","GET /status HTTP/1.1\r\nHost: x\r\nHost: y\r\n\r\n","POST /stop HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n","GET /status HTTP/1.1\r\n\r\nGET /status HTTP/1.1\r\n\r\n",String(repeating:"x",count:8193)] {
            XCTAssertThrowsError(try LocalRequest.parse(Data(body.utf8)))
        }
    }
    func testNativeInvalidSourceNeverStartsCapture() {
        let audio=JLLiveAudio();XCTAssertNotNil(audio.startProcess(0,output:0));XCTAssertEqual(audio.status()["active"] as? Bool,false)
        XCTAssertFalse(audio.setControls(LiveControls().dictionary,mixGain:.infinity));XCTAssertFalse(audio.setControls(LiveControls().dictionary,mixGain:0.51));XCTAssertTrue(audio.setControls(LiveControls().dictionary,mixGain:0.5));var invalid=LiveControls().dictionary;invalid["mute"]=1;XCTAssertFalse(audio.setControls(invalid,mixGain:0.3));audio.stop();audio.stop()
    }
}

final class BrowserFixtureTests: XCTestCase {
    func testLocalControlFixture() throws {
        guard let path=ProcessInfo.processInfo.environment["JAMLOOM_LIVE_FIXTURE"] else { throw XCTSkip("Explicit browser fixture only; never captures audio") }
        let server=ControlServer();var controls=MixControls(),active=true,updates=0,sampleReady=true,playing:[Int]=[]
        let token=try server.pair(origin:ProcessInfo.processInfo.environment["JAMLOOM_LIVE_ORIGIN"] ?? "http://127.0.0.1:4234")
        server.status={ ["active":active,"message":"Synthetic control fixture; no captured audio.","output":"Muted test output","sampler":["ready":sampleReady,"recording":false,"waiting":false,"seconds":sampleReady ? 1.0:0.0,"playing":playing,"message":"Synthetic sample fixture; no microphone capture."],"decks":["A","B"].map { ["active":active,"source":"Synthetic source "+$0,"message":"Synthetic controls only","peak":0.2,"bpm":120.0,"confidence":0.9,"bufferedSeconds":4.0] },"controls":controls.dictionary] }
        server.apply={controls=$0;updates+=1};server.stop={active=false;playing=[]}
        server.sample={ action in if action.action=="clear" { sampleReady=false;playing=[] } else if action.action=="stop" { playing=[] } else if sampleReady && active,let deck=action.deck { playing=[deck] } else { return false };updates+=1;return true }
        try server.start()
        let grant=try JSONSerialization.data(withJSONObject:["token":token])
        FileManager.default.createFile(atPath:path,contents:grant,attributes:[.posixPermissions:0o600])
        let end=Date().addingTimeInterval(150)
        while !FileManager.default.fileExists(atPath:path+".done") && Date()<end { RunLoop.main.run(until:Date().addingTimeInterval(0.05));server.tick() }
        server.shutdown();XCTAssertLessThan(Date(),end,"Browser fixture timed out");XCTAssertGreaterThan(updates,0);XCTAssertFalse(active)
    }
    func testRealLoopbackServer() throws {
        let server=ControlServer(),token=try server.pair(origin:"http://127.0.0.1:4234");server.status={ ["active":false] };try server.start()
        defer { server.shutdown() }
        let done=expectation(description:"Authenticated local HTTP")
        var request=URLRequest(url:URL(string:"http://127.0.0.1:48191/status")!)
        request.setValue("http://127.0.0.1:4234",forHTTPHeaderField:"Origin");request.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")
        URLSession.shared.dataTask(with:request) { data,response,error in
            XCTAssertNil(error);XCTAssertEqual((response as? HTTPURLResponse)?.statusCode,200)
            XCTAssertEqual((response as? HTTPURLResponse)?.value(forHTTPHeaderField:"Access-Control-Allow-Origin"),"http://127.0.0.1:4234")
            XCTAssertNotNil(data);done.fulfill()
        }.resume()
        wait(for:[done],timeout:5)
    }
}
