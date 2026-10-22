// Explicit local hardware test host. Compile with the production model/view and LiveAudio.o.
import AppKit
import SwiftUI
import LiveAudio

struct Setup:Decodable { let sourcePIDs:[[Int]];let output:String;let seconds:Int;let report:String;let recovery:Bool?;let master:Double? }
final class QualificationDelegate:NSObject,NSApplicationDelegate {
    var model:LiveModel?
    func applicationWillTerminate(_ notification:Notification) { model?.shutdown() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool { true }
}
@main struct Qualification {
    @MainActor static func main() throws {
        guard CommandLine.arguments.count==2 else { fatalError("Provide an explicitly authorized setup JSON") }
        let setup=try JSONDecoder().decode(Setup.self,from:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1])))
        precondition(setup.sourcePIDs.count==2 && setup.sourcePIDs.allSatisfy{ !$0.isEmpty && $0.allSatisfy{$0>0} } && (60...3660).contains(setup.seconds))
        let app=NSApplication.shared,delegate=QualificationDelegate(),model=LiveModel()
        app.delegate=delegate;delegate.model=model;app.setActivationPolicy(.regular)
        let window=NSWindow(contentRect:NSRect(x:0,y:0,width:1280,height:1000),styleMask:[.titled,.closable,.resizable],backing:.buffered,defer:false)
        window.title="Jamloom Live · Authorized physical qualification"
        window.contentView=NSHostingView(rootView:LiveView(model:model).preferredColorScheme(.dark))
        window.makeKeyAndOrderFront(nil);app.activate(ignoringOtherApps:true)
        let output=URL(fileURLWithPath:setup.report);try FileManager.default.createDirectory(at:output,withIntermediateDirectories:true)
        DispatchQueue.main.asyncAfter(deadline:.now()+0.5) {
        func save(_ name:String,_ value:Any) { do { try JSONSerialization.data(withJSONObject:value,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent(name),options:.atomic) } catch { model.stop();fputs("Cannot write qualification evidence\n",stderr);app.terminate(nil) } }
        save("inventory.json",["sources":model.sources.filter{setup.sourcePIDs.flatMap{$0}.contains(($0["pid"] as? NSNumber)?.intValue ?? 0)},"outputs":model.outputs.filter{($0["name"] as? String)==setup.output}])
        model.output=(model.outputs.first{($0["name"] as? String)==setup.output}?["id"] as? NSNumber)?.uint32Value ?? 0
        for i in 0..<2 { model.decks[i].process=(model.sources.first{setup.sourcePIDs[i].contains(($0["pid"] as? NSNumber)?.intValue ?? 0)}?["id"] as? NSNumber)?.uint32Value ?? 0 }
        guard model.output != 0,model.decks.allSatisfy({$0.process != 0}),model.decks[0].process != model.decks[1].process else { save("result.json",["status":"FAIL","reason":"Exact authorized sources/output were not found"]);model.shutdown();return }
        let recovery=setup.recovery ?? false,master=setup.master ?? 0.15
        precondition(master.isFinite && (0...1).contains(master) && (!recovery || setup.seconds>=100))
        model.consent=true;model.controls.master=master;model.start(0);model.start(1)
        if recovery { model.controls.crossfader=0 }
        model.message="Physical test running: controls change automatically. Stop all / Panic cancels."
        if recovery {
            do { let grant=try JSONSerialization.data(withJSONObject:["token":model.server.pair(origin:"http://127.0.0.1:4234")]);FileManager.default.createFile(atPath:output.appendingPathComponent("grant.json").path,contents:grant,attributes:[.posixPermissions:0o600]) }
            catch { model.stop();save("result.json",["status":"FAIL","reason":"Could not pair the hardware test"]);return }
        }
        let began=Date();var tick=0,heard=[false,false],samplePassed=false,checks:[String:Bool]=[:],stages:[[String:Any]]=[]
        let run:@MainActor @Sendable (Timer)->Void = { timer in
            tick+=1;model.poll()
            for i in 0..<2 { heard[i] = heard[i] || (model.decks[i].telemetry["inputPeak"] as? Double ?? 0)>0.0001 }
            var event=""
            switch tick {
            case 5:model.micConsent=true;model.recordSample();event="microphone record"
            case 8:if recovery { model.controls.crossfader=0.5;event="blend both sources" }
            case 12:model.controls.decks[0].mute=true;event="mute A"
            case 16:model.controls.decks[0].mute=false;model.controls.decks[1].mute=true;event="mute B"
            case 20:model.controls.decks[1].mute=false;model.controls.decks[0].low = -12;model.controls.decks[0].percussion=true;model.controls.decks[1].echo=0.3;event="independent FX"
            case 24:model.controls.decks[0].roll=true;model.controls.decks[1].reverse=true;event="loop A / reverse B"
            case 28:model.controls.decks[0].scratch=true;model.controls.decks[0].scratchRate = -1;model.decks[0].lastScratch=Date();event="scratch A"
            case 32:model.returnLive(0);model.returnLive(1);event="return live"
            case 36:samplePassed=model.sampleAction(SampleAction(action:"play",deck:1));event="sample B"
            case 42:model.clearSample();event="clear sample"
            case 46:model.controls.crossfader=0;event="crossfade A"
            case 50:model.controls.crossfader=1;event="crossfade B"
            case 54:model.controls.crossfader=0.5;model.controls.decks=[LiveControls(),LiveControls()];event="center / steady run"
            default:break
            }
            if recovery {
                if tick==58 { model.start(0);model.start(1);event="restart after remote panic" }
                if tick==60 { model.stopDeck(0);event="stop A independently" }
                if tick==62 { model.start(0);event="restart A independently" }
                if tick==85 { model.start(1);event="start silent B to verify no-audio recovery" }
            }
            if !event.isEmpty { model.message="Physical test: "+event+". Stop all / Panic cancels." }
            let peaks=model.decks.map{$0.telemetry["peak"] as? Double ?? 0}
            if tick==14 { checks["muteA"]=peaks[0]<1e-8 && peaks[1]>1e-8 }
            if tick==18 { checks["muteB"]=peaks[1]<1e-8 && peaks[0]>1e-8 }
            if tick==37 { checks["sampleB"]=samplePassed && (model.decks[1].telemetry["samplePlaying"] as? Bool ?? false) }
            if tick==44 { checks["sampleClear"] = !model.sampleReady && model.decks.allSatisfy{!($0.telemetry["sampleReady"] as? Bool ?? true)} }
            if tick==48 { checks["crossfadeA"]=peaks[0]>1e-8 && peaks[1]<1e-8 }
            if tick==52 { checks["crossfadeB"]=peaks[1]>1e-8 && peaks[0]<1e-8 }
            if recovery && tick==57 { checks["remotePanic"] = !model.active }
            if recovery && tick==61 { checks["independentStop"] = !model.decks[0].active && model.decks[1].active }
            if recovery && tick==63 { checks["independentRestart"] = model.decks.allSatisfy{$0.active} }
            if recovery && tick==69 { checks["sourceExit"] = !model.decks[0].active && model.decks[1].active }
            if recovery && tick==83 { checks["heartbeatStop"] = !model.active }
            if recovery && tick==98 { checks["noAudio"] = !model.decks[1].active && model.decks[1].message.contains("No audio received") }
            var row=model.snapshot();row["elapsedSeconds"]=Date().timeIntervalSince(began);row["event"]=event
            if tick<=60 || tick%60==0 || !event.isEmpty { stages.append(row) };save("latest.json",row)
            let expectA = !recovery || tick<56 || (tick>=58 && tick<60) || (tick>=62 && tick<64)
            let expectB = !recovery || tick<56 || (tick>=58 && tick<75) || (tick>=85 && tick<94)
            let failed = (expectA && !model.decks[0].active) || (expectB && !model.decks[1].active)
            if failed || tick>=setup.seconds {
                timer.invalidate();model.stop();model.clearSample()
                save("result.json",["status":failed || !heard.allSatisfy({$0}) || checks.count != (recovery ? 12:6) || !checks.values.allSatisfy({$0}) ? "FAIL":"PASS","elapsedSeconds":Date().timeIntervalSince(began),"heardBothSources":heard,"samplerPlayAccepted":samplePassed,"checks":checks,"last":row,"stages":stages,"final":model.snapshot(),"humanListening":"NOT RUN","roundTripLatency":"NOT RUN"])
                model.message="Qualification finished. Both sources released. See the local report."
            }
        }
        _ = Timer.scheduledTimer(withTimeInterval:1,repeats:true) { timer in MainActor.assumeIsolated { run(timer) } }
        }
        app.run()
    }
}
