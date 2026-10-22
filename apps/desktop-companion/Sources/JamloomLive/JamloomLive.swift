import AppKit
import SwiftUI

@MainActor final class Delegate: NSObject, NSApplicationDelegate {
    var model: LiveModel?
    var updater:LiveUpdater?
    func applicationShouldTerminate(_ sender:NSApplication)->NSApplication.TerminateReply {
        if updater?.installing == true && model?.performanceBusy == true {
            model?.message="Stop both decks and finish recording before installing the update."
            return .terminateCancel
        }
        return .terminateNow
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification:Notification) { model?.shutdown() }
}

@main struct JamloomLiveApp: App {
    @NSApplicationDelegateAdaptor(Delegate.self) var delegate
    @StateObject private var model=LiveModel()
    @StateObject private var updater=LiveUpdater()
    var body: some Scene {
        Window("Jamloom Live Source",id:"live-source") {
            LiveView(model:model).preferredColorScheme(.dark).onAppear { delegate.model=model;delegate.updater=updater;updater.start(model:model);NSApp.setActivationPolicy(.regular);NSApp.activate(ignoringOtherApps:true) }
        }.defaultSize(width:1280,height:1000)
        .commands { CommandGroup(after:.appInfo) { Button("Check for Updates…",action:updater.check).disabled(!updater.canCheck || model.performanceBusy) } }
        Settings { SettingsView(model:model,updater:updater) }
    }
}
