import SwiftUI

private let deckAccent = Color(red:0.79,green:0.98,blue:0.47)

struct LiveView: View {
    @ObservedObject var model: LiveModel
    private var source: String { model.sources.first { ($0["id"] as? NSNumber)?.uint32Value == model.process }?["name"] as? String ?? "Choose a playing app" }
    private var confidence: Double { model.telemetry["confidence"] as? Double ?? 0 }
    private func effect<Value>(_ key: WritableKeyPath<LiveControls,Value>) -> Binding<Value> {
        Binding(get:{model.controls[keyPath:key]},set:{value in model.updateEffect { $0[keyPath:key] = value }})
    }
    private func slider(_ title:String,_ value:Binding<Double>,_ range:ClosedRange<Double>,_ step:Double=1) -> some View {
        VStack(alignment:.leading,spacing:8) {
            HStack { Text(title);Spacer();Text(value.wrappedValue,format:.number.precision(.fractionLength(step < 1 ? 2 : 0))).monospacedDigit() }.font(.caption)
            Slider(value:value,in:range,step:step).accessibilityLabel(title).tint(deckAccent)
        }.padding(12).background(.black.opacity(0.35),in:RoundedRectangle(cornerRadius:8))
    }
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:20) {
                HStack {
                    Text("jamloom").font(.largeTitle.bold())
                    Text("LIVE DECK").font(.caption.monospaced()).foregroundStyle(deckAccent)
                    Spacer()
                    Label(model.active ? "LIVE" : "STOPPED",systemImage:model.active ? "waveform" : "stop.circle").foregroundStyle(model.active ? deckAccent : .secondary)
                }
                sourceControls
                HStack(alignment:.top,spacing:24) {
                    VStack(spacing:16) {
                        VStack(alignment:.leading,spacing:6) {
                            Text("LIVE SOURCE").font(.caption.monospaced()).foregroundStyle(deckAccent)
                            Text(source).font(.headline).lineLimit(2)
                            Text(confidence > 0.65 ? String(format:"%.1f BPM · estimated",model.telemetry["bpm"] as? Double ?? 0) : "Listening for a steady pulse").font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth:.infinity,alignment:.leading).padding(16).background(.black.opacity(0.5),in:RoundedRectangle(cornerRadius:8))
                        LivePlatter(active:model.active)
                        HStack {
                            Button("Start Live Source",action:model.start).buttonStyle(.plain).padding(.horizontal,14).padding(.vertical,10).background(deckAccent,in:RoundedRectangle(cornerRadius:7)).foregroundStyle(.black).disabled(!model.consent || model.active || model.process==0 || model.output==0)
                            Button("Stop / Panic",role:.destructive,action:model.stop).buttonStyle(.bordered).keyboardShortcut(.escape,modifiers:[]).disabled(!model.active)
                        }
                        Text("Play, pause and seek in your source app.").font(.caption).foregroundStyle(.secondary)
                        let peak = model.telemetry["peak"] as? Double ?? 0
                        ProgressView(value:min(1,max(0,peak))).tint(deckAccent).accessibilityLabel("Output peak").accessibilityValue(String(format:"%.3f",peak))
                    }.frame(minWidth:260,maxWidth:360)
                    VStack(alignment:.leading,spacing:12) {
                        HStack {
                            Text(model.controls.bypass ? "FX BYPASSED" : "FX ON").font(.headline.monospaced()).foregroundStyle(model.controls.bypass ? .orange : deckAccent)
                            Spacer()
                            Toggle("Bypass effects",isOn:$model.controls.bypass).toggleStyle(.button)
                        }
                        Text(model.controls.bypass ? "Dry signal. Move an effect to turn FX back on." : "Shape the live source with EQ, filter and echo.").font(.caption).foregroundStyle(.secondary)
                        HStack(spacing:8) {
                            slider("Low EQ (dB)",effect(\.low),-24...6)
                            slider("Mid EQ (dB)",effect(\.mid),-24...6)
                            slider("High EQ (dB)",effect(\.high),-24...6)
                        }
                        slider("Low-pass (Hz)",effect(\.tone),100...18000,100)
                        slider("Echo amount",effect(\.echo),0...0.4,0.01)
                        HStack {
                            Toggle("One-beat roll",isOn:effect(\.roll)).toggleStyle(.button)
                            Toggle("Percussion",isOn:effect(\.percussion)).toggleStyle(.button).accessibilityLabel("Follow a steady pulse with percussion")
                        }
                        Text("Roll repeats the last beat. Percussion waits for a steady pulse.").font(.caption).foregroundStyle(.secondary)
                        Divider()
                        slider("Output level",$model.controls.level,0...0.8,0.01)
                    }.disabled(!model.active).frame(maxWidth:.infinity)
                }.padding(20).background(LinearGradient(colors:[Color(white:0.20),Color(white:0.11)],startPoint:.topLeading,endPoint:.bottomTrailing),in:RoundedRectangle(cornerRadius:18)).overlay(RoundedRectangle(cornerRadius:18).stroke(Color(white:0.35)))
                Text(model.message).font(.callout).accessibilityLabel("Capture status: "+model.message)
                DisclosureGroup("Website pairing") {
                    VStack(alignment:.leading,spacing:12) {
                        HStack { Button("Copy pairing code and open website") { model.pair() };Button("Disconnect website") { model.server.revoke() } }
                        #if DEBUG
                        Button("Copy code and open local preview") { model.pair(origin:"http://127.0.0.1:4234") }
                        #endif
                        Text(model.pairing)
                        Text("Keep the connected page open. Losing its connection stops capture within five seconds.").font(.caption).foregroundStyle(.secondary)
                    }.padding(.top,12)
                }
                DisclosureGroup("Routing and signal details") {
                    VStack(alignment:.leading,spacing:8) {
                        Text("Peak \(model.telemetry["peak"] as? Double ?? 0,specifier:"%.3f") · processed \(model.telemetry["frames"] as? UInt64 ?? 0) frames · max callback \(model.telemetry["maxCallbackMs"] as? Double ?? 0,specifier:"%.2f") ms")
                        Text("Pulse confidence: \(Int(confidence*100))%. Roll uses 120 BPM while uncertain. Stop restores the source route; it does not pause another app. Device changes stop capture.")
                        Text("Audio stays on this Mac. No recording or upload. macOS 14.2 or later; Windows/Linux capture and multi-output cue routing are not included.")
                    }.font(.caption).foregroundStyle(.secondary).padding(.top,12)
                }
            }.padding(24)
        }.background(Color(red:0.055,green:0.07,blue:0.06)).frame(minWidth:820,minHeight:700)
    }
    private var sourceControls: some View {
        VStack(alignment:.leading,spacing:12) {
            HStack {
                Picker("Source audio process",selection:$model.process) {
                    Text("Choose a playing app").tag(UInt32(0))
                    ForEach(model.sources.indices,id:\.self) { i in Text(model.sources[i]["name"] as? String ?? "App").tag((model.sources[i]["id"] as? NSNumber)?.uint32Value ?? 0) }
                }.disabled(model.active)
                Picker("Stereo speaker output",selection:$model.output) {
                    Text("Choose an output").tag(UInt32(0))
                    ForEach(model.outputs.indices,id:\.self) { i in Text(model.outputs[i]["name"] as? String ?? "Output").tag((model.outputs[i]["id"] as? NSNumber)?.uint32Value ?? 0) }
                }.disabled(model.active)
                Button("Refresh sources",action:model.refresh).disabled(model.active)
            }
            Toggle("I have permission to capture and process this source.",isOn:$model.consent).onChange(of:model.consent) { _,value in if !value { model.stop() } }
        }
    }
}

private struct LivePlatter: View {
    let active: Bool
    var body: some View {
        ZStack {
            Circle().fill(LinearGradient(colors:[.gray,.black,.gray],startPoint:.topLeading,endPoint:.bottomTrailing))
            Circle().fill(Color(white:0.055)).padding(8)
            ForEach(0..<28,id:\.self) { ring in Circle().stroke(Color(white:ring.isMultiple(of:3) ? 0.22 : 0.12),lineWidth:1).padding(CGFloat(14+ring*3)) }
            Circle().fill(AngularGradient(colors:[.clear,.white.opacity(0.15),.clear,.black,.clear,.white.opacity(0.1),.clear],center:.center)).padding(10)
            Circle().stroke(Color(white:0.75),style:StrokeStyle(lineWidth:3,dash:[1,7])).padding(5)
            Circle().fill(deckAccent).frame(width:88,height:88)
            VStack(spacing:6) { Text("JAMLOOM").font(.system(size:9,weight:.bold,design:.monospaced));Text(active ? "LIVE" : "READY").font(.headline.monospaced());Circle().fill(.gray).frame(width:8,height:8) }.foregroundStyle(.black)
        }.frame(maxWidth:300).aspectRatio(1,contentMode:.fit).shadow(color:.black.opacity(0.6),radius:8,y:8).accessibilityElement(children:.ignore).accessibilityLabel(active ? "Live source deck active" : "Live source deck stopped")
    }
}
