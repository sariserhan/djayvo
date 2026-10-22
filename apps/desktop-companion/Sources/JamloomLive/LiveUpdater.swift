import AppKit
import Sparkle
import SwiftUI

@MainActor final class LiveUpdater: NSObject, ObservableObject, SPUUpdaterDelegate {
    @Published private(set) var canCheck=false
    @Published private(set) var automaticChecks=false
    @Published private(set) var failure:String?
    private(set) var installing=false
    private var controller:SPUStandardUpdaterController?
    private var observations:[NSKeyValueObservation]=[]
    private weak var model:LiveModel?

    func start(model:LiveModel) {
        guard controller==nil else { return }
        self.model=model
        let controller=SPUStandardUpdaterController(startingUpdater:false,updaterDelegate:self,userDriverDelegate:nil)
        self.controller=controller
        observations=[
            controller.updater.observe(\.canCheckForUpdates,options:[.initial,.new]) { [weak self] updater,_ in MainActor.assumeIsolated { self?.canCheck=updater.canCheckForUpdates } },
            controller.updater.observe(\.automaticallyChecksForUpdates,options:[.initial,.new]) { [weak self] updater,_ in MainActor.assumeIsolated { self?.automaticChecks=updater.automaticallyChecksForUpdates } },
            controller.updater.observe(\.sessionInProgress,options:[.initial,.new]) { [weak self] updater,_ in MainActor.assumeIsolated { self?.model?.updateInProgress=updater.sessionInProgress } }
        ]
        do { try controller.updater.start() }
        catch { failure=error.localizedDescription;canCheck=false }
    }
    func check() { controller?.checkForUpdates(nil) }
    func setAutomaticChecks(_ enabled:Bool) { controller?.updater.automaticallyChecksForUpdates=enabled }
    func updater(_ updater:SPUUpdater,mayPerform updateCheck:SPUUpdateCheck) throws {
        guard model?.performanceBusy != true else {
            throw NSError(domain:"com.jamloom.live",code:1,userInfo:[NSLocalizedDescriptionKey:"Stop both decks and finish recording before checking for updates."])
        }
    }
    func updater(_ updater:SPUUpdater,willInstallUpdate item:SUAppcastItem) { installing=true }
    func updater(_ updater:SPUUpdater,didAbortWithError error:Error) { installing=false }
    func updaterShouldRelaunchApplication(_ updater:SPUUpdater)->Bool { model?.performanceBusy != true }
}
