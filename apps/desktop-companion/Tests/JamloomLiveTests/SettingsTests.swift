import XCTest
import SwiftUI
import Sparkle
@testable import JamloomLive

final class SettingsTests:XCTestCase {
    @MainActor func testUpdateChecksDeferDuringAudioAndPermitIdle() throws {
        let model=LiveModel(),service=LiveUpdater()
        defer { model.shutdown() }
        service.start(model:model)
        let controller=SPUStandardUpdaterController(startingUpdater:false,updaterDelegate:nil,userDriverDelegate:nil)
        XCTAssertNoThrow(try service.updater(controller.updater,mayPerform:.updates))
        model.micWaiting=true
        XCTAssertThrowsError(try service.updater(controller.updater,mayPerform:.updatesInBackground))
        XCTAssertFalse(service.updaterShouldRelaunchApplication(controller.updater))
        model.micWaiting=false;model.micRecording=true
        XCTAssertThrowsError(try service.updater(controller.updater,mayPerform:.updates))
        model.micRecording=false;model.decks[1].active=true
        XCTAssertThrowsError(try service.updater(controller.updater,mayPerform:.updates))
        model.decks[1].active=false
        XCTAssertTrue(service.updaterShouldRelaunchApplication(controller.updater))
    }
    @MainActor func testSettingsLayout() throws {
        let model=LiveModel(),updater=LiveUpdater()
        defer { model.shutdown() }
        _=NSApplication.shared
        model.outputs=[["id":NSNumber(value:1),"name":"Example output"]];model.output=1
        let host=NSHostingView(rootView:SettingsView(model:model,updater:updater))
        let window=NSWindow(contentRect:NSRect(x:0,y:0,width:560,height:650),styleMask:[.borderless],backing:.buffered,defer:false)
        window.contentView=host;window.display();host.layoutSubtreeIfNeeded()
        RunLoop.main.run(until:Date().addingTimeInterval(0.2))
        let bitmap=try XCTUnwrap(host.bitmapImageRepForCachingDisplay(in:host.bounds))
        host.cacheDisplay(in:host.bounds,to:bitmap)
        XCTAssertGreaterThanOrEqual(bitmap.pixelsWide,560)
        if let path=ProcessInfo.processInfo.environment["JAMLOOM_SETTINGS_SNAPSHOT"] {
            try XCTUnwrap(bitmap.representation(using:.png,properties:[:])).write(to:URL(fileURLWithPath:path))
        }
    }
}
