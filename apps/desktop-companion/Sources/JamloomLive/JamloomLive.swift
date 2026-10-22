import AppKit
import SwiftUI

final class Delegate: NSObject, NSApplicationDelegate {
    var model: LiveModel?
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification:Notification) { model?.shutdown() }
}

@main struct JamloomLiveApp: App {
    @NSApplicationDelegateAdaptor(Delegate.self) var delegate
    @StateObject private var model=LiveModel()
    var body: some Scene {
        Window("Jamloom Live Source",id:"live-source") {
            LiveView(model:model).preferredColorScheme(.dark).onAppear { delegate.model=model;NSApp.setActivationPolicy(.regular);NSApp.activate(ignoringOtherApps:true) }
        }.defaultSize(width:1280,height:1000)
    }
}
