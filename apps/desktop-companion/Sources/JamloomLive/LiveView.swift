import SwiftUI

let liveColors = [Color(red:0.79,green:0.98,blue:0.47),Color(red:0.77,green:0.68,blue:1)]
struct LiveFader: View {
    let title:String
    @Binding var value:Double
    let range:ClosedRange<Double>
    var step:Double=1
    var body:some View {
        VStack(alignment:.leading,spacing:4) {
            HStack { Text(title);Spacer();Text(value,format:.number.precision(.fractionLength(step<1 ? 2:0))).monospacedDigit() }.font(.caption)
            Slider(value:$value,in:range,step:step).accessibilityLabel(title)
        }.padding(10).background(.black.opacity(0.3),in:RoundedRectangle(cornerRadius:7))
    }
}
struct LiveView: View {
    @ObservedObject var model:LiveModel
    var body:some View {
        VStack(spacing:0) {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    HStack { Text("jamloom").font(.largeTitle.bold());Text(model.micRecording ? "● MIC RECORDING":"LIVE / TWO DECKS").font(.caption.monospaced()).foregroundStyle(liveColors[0]);Spacer();Button("Stop all / Panic",role:.destructive,action:model.stop).keyboardShortcut(.escape,modifiers:[]).disabled(!model.active && !model.micRecording && !model.micWaiting) }
                    HStack {
                        Picker("Stereo output",selection:$model.output) {
                            Text("Choose an output").tag(UInt32(0))
                            ForEach(model.outputs.indices,id:\.self) { i in Text(model.outputs[i]["name"] as? String ?? "Output").tag((model.outputs[i]["id"] as? NSNumber)?.uint32Value ?? 0) }
                        }.disabled(model.active)
                        Button("Refresh sources",action:model.refresh)
                        Toggle("I have permission to process these sources.",isOn:$model.consent)
                    }
                    HStack(alignment:.top,spacing:20) { ForEach(0..<2,id:\.self) { index in NativeLiveDeck(model:model,index:index) } }
                    VStack(alignment:.leading,spacing:12) {
                        HStack { Text("MIC SAMPLE").font(.headline.monospaced());Spacer();Text(model.micRecording ? "● RECORDING":String(format:"%.1f s",model.sampleSeconds)).foregroundStyle(model.micRecording ? .red:.secondary) }
                        Toggle("I have permission to record this system microphone sample.",isOn:$model.micConsent)
                        HStack {
                            Button(model.micRecording ? "Finish recording":"Record up to 4 seconds") { if model.micRecording { model.finishSample() } else { model.recordSample() } }.disabled(!model.micConsent || model.micWaiting)
                            ForEach(0..<2,id:\.self) { i in Button("Play on "+(i==0 ? "A":"B")) { _=model.sampleAction(SampleAction(action:"play",deck:i)) }.disabled(!model.sampleReady || !model.decks[i].active) }
                            Button("Stop sample") { _=model.sampleAction(SampleAction(action:"stop")) }.disabled(!model.sampleReady)
                            Button("Clear sample",action:model.clearSample).disabled(!model.sampleReady && !model.micRecording && !model.micWaiting)
                        }
                        Text(model.sampleMessage).font(.caption)
                        Text("Use headphones for a clean recording. Microphone audio is never monitored live, saved to disk or uploaded. Start a deck to play through its mixer.").font(.caption).foregroundStyle(.secondary)
                    }.padding(16).background(.black.opacity(0.25),in:RoundedRectangle(cornerRadius:10))
                    Text(model.message).font(.caption).foregroundStyle(.secondary)
                    DisclosureGroup("Website pairing") {
                        VStack(alignment:.leading,spacing:10) {
                            HStack { Button("Copy pairing code and open website") { model.pair() };Button("Disconnect website") { model.server.revoke() } }
                            #if DEBUG
                            Button("Copy code and open local preview") { model.pair(origin:"http://127.0.0.1:4234") }
                            #endif
                            Text(model.pairing)
                            Text("Closing a connected page stops both captures within five seconds.").font(.caption)
                        }.padding(.top,10)
                    }
                    DisclosureGroup("How live decks work") {
                        Text("Each deck uses a different audio process. Some browser tabs share one process. Drag or reverse replays up to four seconds of recent audio in memory; Return to live rejoins the source now. Source apps keep playing. Mute silences a captured deck; Stop restores the app’s original output. No disk recording or upload. Tempo sets loop timing, not source playback speed. Separate headphone cue is not included.").font(.caption).foregroundStyle(.secondary).padding(.top,10)
                    }
                }.padding(24)
            }
            HStack(spacing:24) {
                LiveFader(title:"Crossfader · A ↔ B",value:$model.controls.crossfader,range:0...1,step:0.01)
                Button("Center") { model.controls.crossfader=0.5 }
                LiveFader(title:"Master output",value:$model.controls.master,range:0...1,step:0.01)
            }.tint(liveColors[0]).padding(18).background(Color(white:0.08))
        }.background(Color(red:0.055,green:0.07,blue:0.06)).frame(minWidth:960,minHeight:720)
    }
}
struct NativeLiveDeck:View {
    @ObservedObject var model:LiveModel
    let index:Int
    private var name:String { index==0 ? "A":"B" }
    private var deck:LiveDeck { model.decks[index] }
    private var controls:LiveControls { model.controls.decks[index] }
    private func binding<Value>(_ key:WritableKeyPath<LiveControls,Value>,effect:Bool=true)->Binding<Value> {
        Binding(get:{model.controls.decks[index][keyPath:key]},set:{value in model.updateDeck(index,effect:effect) { $0[keyPath:key]=value }})
    }
    private func fader(_ title:String,_ key:WritableKeyPath<LiveControls,Double>,_ range:ClosedRange<Double>,_ step:Double=1,effect:Bool=true)->some View {
        LiveFader(title:title,value:binding(key,effect:effect),range:range,step:step).accessibilityElement(children:.contain).accessibilityLabel("Deck "+name)
    }
    var body:some View {
        VStack(alignment:.leading,spacing:12) {
            HStack { Text("DECK "+name).font(.headline.monospaced());Spacer();Text(deck.active ? (controls.mute ? "MUTED":"LIVE"):"STOPPED").font(.caption.monospaced()) }.foregroundStyle(liveColors[index])
            Picker("Source "+name,selection:$model.decks[index].process) {
                Text("Choose a playing app").tag(UInt32(0))
                ForEach(model.sources.indices,id:\.self) { i in Text(model.sources[i]["name"] as? String ?? "App").tag((model.sources[i]["id"] as? NSNumber)?.uint32Value ?? 0) }
            }.disabled(deck.active)
            HStack(spacing:18) {
                LivePlatter(name:name,active:deck.active,controls:controls,color:liveColors[index]) { touching,rate in
                    model.updateDeck(index,effect:false) { $0.scratch=touching;$0.scratchRate=rate }
                }.frame(width:210,height:210)
                VStack(alignment:.leading,spacing:10) {
                    Text(deck.active ? deck.source:"Ready for a source").font(.headline).lineLimit(2)
                    let confidence=deck.telemetry["confidence"] as? Double ?? 0
                    Text(confidence>0.65 ? String(format:"%.1f BPM · detected",deck.telemetry["bpm"] as? Double ?? 0):"Pulse uncertain").font(.caption.monospaced())
                    Button("Use detected BPM") {
                        let bpm=deck.telemetry["bpm"] as? Double ?? 120
                        model.updateDeck(index,effect:false) { $0.tempo=min(200,max(60,bpm)) }
                    }.disabled(!deck.active || confidence<=0.65)
                    Text(String(format:"Buffer %.1f s",deck.telemetry["bufferedSeconds"] as? Double ?? 0)).font(.caption.monospaced())
                    ProgressView(value:min(1,max(0,deck.telemetry["peak"] as? Double ?? 0))).accessibilityLabel("Deck \(name) output peak")
                    Button("Start deck "+name) { model.start(index) }.disabled(!model.consent || deck.active || deck.process==0 || model.output==0)
                    Button("Stop deck "+name) { model.stopDeck(index) }.disabled(!deck.active)
                }.frame(maxWidth:.infinity,alignment:.leading)
            }
            Text("Drag the record forward or backward to scratch recent audio.").font(.caption).foregroundStyle(.secondary)
            VStack(spacing:10) {
                HStack {
                    Toggle("Reverse",isOn:binding(\.reverse,effect:false)).toggleStyle(.button)
                    Toggle("Beat loop",isOn:binding(\.roll,effect:false)).toggleStyle(.button)
                    Toggle("Mute",isOn:binding(\.mute,effect:false)).toggleStyle(.button)
                    Button("Return to live") { model.returnLive(index) }
                }
                HStack {
                    Picker("Loop beats",selection:binding(\.loopBeats,effect:false)) {
                        ForEach([0.25,0.5,1,2,4],id:\.self) { Text($0,format:.number).tag($0) }
                    }
                    fader("FX tempo",\.tempo,60...200,1,effect:false)
                }
                HStack(spacing:8) { fader("Low EQ",\.low,-24...6);fader("Mid EQ",\.mid,-24...6);fader("High EQ",\.high,-24...6) }
                HStack { fader("High-pass Hz",\.highpass,20...4000,20);fader("Low-pass Hz",\.tone,100...18000,100) }
                HStack { fader("Echo amount",\.echo,0...0.4,0.01);fader("Echo seconds",\.echoSeconds,0.05...1,0.01) }
                HStack {
                    Toggle("Percussion",isOn:binding(\.percussion)).toggleStyle(.button)
                    Toggle("Bypass FX",isOn:binding(\.bypass,effect:false)).toggleStyle(.button)
                    Text(controls.bypass ? "FX BYPASSED":"FX ON").font(.caption.monospaced()).foregroundStyle(controls.bypass ? .orange:liveColors[index])
                    Button("Reset FX") { model.updateDeck(index) { $0.low=0;$0.mid=0;$0.high=0;$0.tone=18000;$0.highpass=20;$0.echo=0;$0.echoSeconds=0.3;$0.percussion=false } }
                }
                fader("Channel level",\.level,0...0.8,0.01,effect:false)
            }.disabled(!deck.active)
            Text(deck.message).font(.caption).foregroundStyle(.secondary).frame(minHeight:30,alignment:.topLeading)
        }.padding(18).tint(liveColors[index]).frame(maxWidth:.infinity,alignment:.top).background(LinearGradient(colors:[Color(white:0.20),Color(white:0.11)],startPoint:.topLeading,endPoint:.bottomTrailing),in:RoundedRectangle(cornerRadius:16)).overlay(RoundedRectangle(cornerRadius:16).stroke(Color(white:0.35)))
    }
}
struct LivePlatter:View {
    let name:String, active:Bool, controls:LiveControls, color:Color
    let scratch:(Bool,Double)->Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var rotation=0.0
    @State private var lastTick=Date()
    @State private var lastAngle:Double?
    @State private var lastDrag=Date()
    static func jogRate(from:Double,to:Double,seconds:Double)->Double {
        var delta=to-from
        if delta > .pi { delta -= 2 * .pi };if delta < -.pi { delta += 2 * .pi }
        return min(2,max(-2,delta/max(0.008,seconds)*1.8/(2 * .pi)))
    }
    var body:some View {
        GeometryReader { geometry in
            TimelineView(.animation(minimumInterval:1.0/30,paused:!active || reduceMotion)) { tick in
                ZStack {
                    Circle().fill(LinearGradient(colors:[.gray,.black,.gray],startPoint:.topLeading,endPoint:.bottomTrailing))
                    Circle().fill(Color(white:0.055)).padding(8)
                    ForEach(0..<23,id:\.self) { ring in Circle().stroke(Color(white:ring.isMultiple(of:3) ? 0.22:0.12),lineWidth:1).padding(CGFloat(12+ring*3)) }
                    Circle().fill(AngularGradient(colors:[.clear,.white.opacity(0.17),.clear,.black,.clear,.white.opacity(0.12),.clear],center:.center)).padding(10)
                    Circle().stroke(Color(white:0.75),style:StrokeStyle(lineWidth:3,dash:[1,7])).padding(5)
                    ZStack {
                        Circle().fill(color).frame(width:68,height:68)
                        VStack(spacing:4) { Text("JAMLOOM").font(.system(size:8,weight:.bold,design:.monospaced));Text(name).font(.title2.bold());Circle().fill(.gray).frame(width:6,height:6) }.foregroundStyle(.black)
                        Rectangle().fill(.white.opacity(0.8)).frame(width:2,height:14).offset(y:-geometry.size.height*0.36)
                    }.rotationEffect(.degrees(rotation))
                }.onChange(of:tick.date) { _,date in
                    if active && !controls.scratch && !reduceMotion { rotation += min(0.1,date.timeIntervalSince(lastTick))*200*(controls.reverse ? -1:1) }
                    lastTick=date
                }
            }.contentShape(Circle()).gesture(DragGesture(minimumDistance:0).onChanged { value in
                guard active else { return }
                let angle=atan2(value.location.y-geometry.size.height/2,value.location.x-geometry.size.width/2),now=Date()
                if !controls.scratch { lastAngle=nil }
                let rate=lastAngle.map { Self.jogRate(from:$0,to:angle,seconds:now.timeIntervalSince(lastDrag)) } ?? 0
                rotation += rate*200*min(0.1,now.timeIntervalSince(lastDrag));lastAngle=angle;lastDrag=now;scratch(true,rate)
            }.onEnded { _ in lastAngle=nil;scratch(false,0) })
            .accessibilityElement(children:.ignore).accessibilityLabel("Deck \(name) platter").accessibilityHint("Drag backward or forward to scratch recent audio. Reverse and beat loop buttons are also available.")
        }.aspectRatio(1,contentMode:.fit).shadow(color:.black.opacity(0.5),radius:8,y:6)
    }
}
