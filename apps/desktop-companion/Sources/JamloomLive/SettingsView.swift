import SwiftUI

struct SettingsView:View {
    @ObservedObject var model:LiveModel
    @ObservedObject var updater:LiveUpdater
    var body:some View {
        Form {
            Section("Your edition") {
                Text("Jamloom Basic · Free").font(.headline)
                Text("Two live sources, mixing, effects and microphone samples stay free. Pro adds the full Performance Studio, local tracks, Aurowall music, instruments and recording.").font(.caption)
                Button("Open Pro") {
                    let url=URL(fileURLWithPath:"/Applications/Jamloom Pro.app")
                    if FileManager.default.fileExists(atPath:url.path) { NSWorkspace.shared.open(url) }
                    else { NSWorkspace.shared.open(URL(string:"https://www.jamloom.com/studio/dj.html")!) }
                }
            }
            Section("Audio") {
                Picker("Stereo output",selection:$model.output) {
                    Text("Choose an output").tag(UInt32(0))
                    ForEach(model.outputs.indices,id:\.self) { i in
                        Text(model.outputs[i]["name"] as? String ?? "Output").tag((model.outputs[i]["id"] as? NSNumber)?.uint32Value ?? 0)
                    }
                }.disabled(model.active)
                Button("Refresh devices",action:model.refresh)
                Text("Stop both decks to change output. Jamloom keeps your Mac awake only during a live set.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Privacy & connection") {
                Toggle("Allow selected source processing",isOn:$model.consent)
                Toggle("Allow microphone samples",isOn:$model.micConsent)
                HStack {
                    Button("Clear microphone sample",action:model.clearSample).disabled(!model.sampleReady && !model.micRecording && !model.micWaiting)
                    Button("Disconnect website") { model.server.revoke() }
                }
                Text("Permissions reset when you quit. Audio stays on this Mac. Capture and microphone recording always start with you.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Updates") {
                LabeledContent("Jamloom Basic",value:Bundle.main.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String ?? "Development")
                Toggle("Automatically check for updates",isOn:Binding(get:{updater.automaticChecks},set:updater.setAutomaticChecks)).disabled(updater.failure != nil)
                Button("Check for Updates…",action:updater.check).disabled(!updater.canCheck || model.performanceBusy)
                Text(model.performanceBusy ? "Stop both decks and finish recording to update." : "Updates are signed and installed only with your approval. Checks pause during a live set.").font(.caption).foregroundStyle(.secondary)
                if let failure=updater.failure { Text(failure).font(.caption).foregroundStyle(.red) }
                Link("Release notes",destination:URL(string:"https://github.com/sariserhan/jamloom/releases")!)
            }
        }.formStyle(.grouped).frame(width:560,height:650)
    }
}
