import XCTest

final class FlowTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    private func waitUntilEnabled(_ element: XCUIElement) {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: element)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 30), .completed)
    }
    private func loadPracticeDecks(_ app: XCUIApplication) {
        let music = app.webViews.buttons["Music"]
        XCTAssertTrue(music.waitForExistence(timeout: 20)); music.tap()
        for letter in ["A", "B"] {
            let load = app.webViews.buttons["Load into \(letter)"]
            let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: load)
            XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 20), .completed)
            load.tap()
            Thread.sleep(forTimeInterval: 2)
        }
        app.webViews.buttons["Done"].tap()
    }
    func testLandscapeDeckControlsFitWithoutScrolling() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launch(); app.buttons["DJ Deck"].firstMatch.tap()
        loadPracticeDecks(app)
        for name in ["Play A", "Play B", "Cue", "Stop"] {
            let control = app.webViews.buttons[name].firstMatch
            XCTAssertTrue(control.isHittable, name)
            XCTAssertTrue(app.frame.contains(control.frame), "Clipped: \(name) \(control.frame)")
        }
        let pads = app.webViews.descendants(matching: .any)["Performance pads and effects"].firstMatch
        XCTAssertTrue(pads.isHittable)
        XCTAssertTrue(app.frame.contains(pads.frame))
        let crossfade = app.webViews.sliders["Crossfader"]
        XCTAssertTrue(crossfade.isHittable)
        XCTAssertTrue(app.frame.contains(crossfade.frame))
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); screenshot.name = "Professional landscape console"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
    func testDeckRotationRetainsTracksAndStopsOnTabChange() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launch(); app.buttons["DJ Deck"].firstMatch.tap()
        loadPracticeDecks(app)
        let play = app.webViews.buttons["Play A"]
        XCTAssertTrue(play.isEnabled); play.tap()
        XCTAssertTrue(app.webViews.buttons["Pause A"].waitForExistence(timeout: 10))
        app.buttons["Improvise"].firstMatch.tap(); app.buttons["DJ Deck"].firstMatch.tap()
        XCTAssertTrue(play.waitForExistence(timeout: 10)); XCTAssertTrue(play.isEnabled)
        XCUIDevice.shared.orientation = .portrait
        Thread.sleep(forTimeInterval: 1)
        XCTAssertTrue(app.webViews.buttons["Play B"].exists)
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = "Professional portrait console"; image.lifetime = .keepAlways; add(image)
        XCUIDevice.shared.orientation = .landscapeLeft
        Thread.sleep(forTimeInterval: 1)
        XCTAssertTrue(play.isHittable); XCTAssertTrue(play.isEnabled)
    }
    func testCloudCreationRequiresSeparateConsentAndSignIn() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 10)); waitUntilEnabled(consent); consent.tap()
        XCTAssertEqual(consent.value as? String, "1")
        app.buttons["Load test clip"].tap()
        let cloud = app.buttons["Create a full song"]
        for _ in 0..<6 { if cloud.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(cloud.waitForExistence(timeout: 15)); cloud.tap()
        XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 10))
        let upload = app.buttons["Upload clip & review price"]
        app.scrollViews.firstMatch.swipeUp()
        XCTAssertTrue(upload.exists); XCTAssertFalse(upload.isEnabled)
        XCTAssertEqual(app.switches["Send this clip for cloud processing"].value as? String, "0")
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "Explicit cloud consent"; image.lifetime = .keepAlways; add(image)
    }
    func testTasteTabPersistenceAndDeletion() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let tab = app.buttons["Music DNA"].firstMatch
        XCTAssertTrue(tab.waitForExistence(timeout: 15)); tab.tap()
        let references = app.textViews["Favourite tracks and artists"]
        XCTAssertTrue(references.waitForExistence(timeout: 10))
        references.tap(); references.typeText("An original tune")
        app.buttons["Done editing"].tap()
        app.swipeUp()
        for _ in 0..<5 {
            if app.buttons["Save preferences on this device"].isHittable { break }
            app.swipeUp()
        }
        app.buttons["Save preferences on this device"].tap()
        XCTAssertTrue(app.staticTexts["Saved locally. No audio generated or uploaded."].waitForExistence(timeout: 5))
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        XCTAssertEqual(app.textViews["Favourite tracks and artists"].value as? String, "An original tune")
        for _ in 0..<5 {
            if app.buttons["Delete saved profile"].isHittable { break }
            app.swipeUp()
        }
        app.buttons["Delete saved profile"].tap()
        XCTAssertTrue(app.staticTexts["Profile deleted."].waitForExistence(timeout: 5))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Music DNA local preferences"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        XCTAssertTrue(references.waitForExistence(timeout: 10))
        // A real iPhone can expose an empty TextEditor value as nil.
        XCTAssertTrue(references.value == nil || references.value as? String == "")
    }
    func testTasteCompositionPlaybackPreferenceAndRelaunch() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        let compose = app.buttons["composeTaste"]
        for _ in 0..<12 { if compose.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(compose.isHittable); compose.tap()
        let finished = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: compose)
        XCTAssertEqual(XCTWaiter.wait(for: [finished], timeout: 120), .completed)
        let play = app.buttons["play-taste_a"].firstMatch
        for _ in 0..<8 { if play.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(play.isHittable); play.tap()
        XCTAssertTrue(play.waitForExistence(timeout: 10))
        let playing = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == 'Playing'"), object: play)
        XCTAssertEqual(XCTWaiter.wait(for: [playing], timeout: 10), .completed)
        app.buttons["Improvise"].firstMatch.tap(); app.buttons["Music DNA"].firstMatch.tap()
        for _ in 0..<12 { if play.isHittable { break }; app.swipeUp() }
        XCTAssertEqual(play.value as? String, "Stopped")
        XCTAssertTrue(app.buttons["play-taste_b"].exists)
        app.buttons["Use B settings next time"].tap()
        app.buttons["Save"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Saved"].firstMatch.exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Music DNA audio"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.terminate(); app.launch(); app.buttons["Music DNA"].firstMatch.tap()
        for _ in 0..<12 { if app.buttons["Saved"].firstMatch.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(app.buttons["Saved"].firstMatch.isHittable)
        app.buttons["share-taste_a"].tap()
        XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 10) || app.buttons["Copy"].exists || app.buttons["Close"].exists)
    }
    func testOptionalAccountKeepsLocalCreationAvailable() {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch(); app.buttons["Account"].tap()
        XCTAssertTrue(app.secureTextFields["Password"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Sign in"].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Optional account"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["Done"].tap(); XCTAssertTrue(app.buttons["Import"].exists)
        XCTAssertTrue(app.buttons["Improvise"].firstMatch.exists)
        XCTAssertTrue(app.buttons["Music DNA"].firstMatch.exists)
    }
    func testMicrophoneDenialKeepsImportAvailable() {
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .microphone)
        defer { app.resetAuthorizationStatus(for: .microphone) }
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 15))
        waitUntilEnabled(consent); consent.tap()
        let consented = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == '1'"), object: consent)
        XCTAssertEqual(XCTWaiter.wait(for: [consented], timeout: 5), .completed)
        app.buttons["Record"].tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let deny = springboard.alerts.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Allow' AND NOT label == 'Allow'")).firstMatch
        XCTAssertTrue(deny.waitForExistence(timeout: 10))
        deny.tap()
        XCTAssertTrue(app.alerts.staticTexts["Microphone access is off. Enable it in Settings, or import a recording."].waitForExistence(timeout: 10))
        app.alerts.buttons["OK"].tap()
        XCTAssertTrue(app.buttons["Import"].isEnabled)
    }
    func testLargeTextConsentAndPrivacy() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        XCTAssertTrue(app.switches["consentToggle"].waitForExistence(timeout: 15))
        for _ in 0..<8 {
            if app.buttons["Privacy & your recordings"].isHittable { break }
            app.swipeUp()
        }
        app.buttons["Privacy & your recordings"].tap()
        XCTAssertTrue(app.staticTexts["Your recordings stay here"].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Accessible privacy text"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["Done"].tap()
    }

    func testConsentRenderPlaybackSaveAndRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["JAMLOOM_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Load test clip"].isEnabled)
        waitUntilEnabled(consent); consent.tap()
        let consented = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == '1'"), object: consent)
        XCTAssertEqual(XCTWaiter.wait(for: [consented], timeout: 5), .completed)
        app.buttons["Load test clip"].tap()
        let make = app.buttons["makeMusic"]
        XCTAssertTrue(make.waitForExistence(timeout: 15))
        make.tap()
        let finished = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: make)
        XCTAssertEqual(XCTWaiter.wait(for: [finished], timeout: 120), .completed)
        let play = app.buttons["play-hiphop"].firstMatch
        XCTAssertTrue(play.waitForExistence(timeout: 120))
        app.swipeUp()
        play.tap()
        XCTAssertTrue(app.buttons["play-reggae"].firstMatch.exists)
        play.tap()
        app.buttons["Save"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Saved"].firstMatch.exists)
        app.buttons["DJ Deck"].firstMatch.tap()
        let music = app.webViews.buttons["Music"]
        XCTAssertTrue(music.waitForExistence(timeout: 20)); music.tap()
        app.webViews.buttons["Saved mix → A"].tap()
        let saved = app.buttons["loadSaved-hiphop"].firstMatch
        XCTAssertTrue(saved.waitForExistence(timeout: 20)); saved.tap()
        XCTAssertTrue(app.webViews.staticTexts["Jamloom hiphop.wav"].waitForExistence(timeout: 30))
        let deckPlay = app.webViews.buttons["Play A"]
        XCTAssertTrue(deckPlay.isEnabled); deckPlay.tap()
        XCTAssertTrue(app.webViews.buttons["Pause A"].waitForExistence(timeout: 10))
        app.buttons["Improvise"].firstMatch.tap()
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Three generated mixes"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["Saved"].firstMatch.waitForExistence(timeout: 30))
        app.swipeUp()
        app.buttons["share-hiphop"].firstMatch.tap()
        XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 10) || app.buttons["Copy"].exists || app.buttons["Close"].exists)
        app.terminate(); app.launch()
        let delete = app.buttons["deleteSession"].firstMatch
        XCTAssertTrue(delete.waitForExistence(timeout: 30))
        let count = app.buttons.matching(identifier: "deleteSession").count
        app.swipeUp()
        delete.tap()
        app.buttons["confirmDeleteSession"].firstMatch.tap()
        let removed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "count == %d", count - 1),
            object: app.buttons.matching(identifier: "deleteSession"))
        XCTAssertEqual(XCTWaiter.wait(for: [removed], timeout: 10), .completed)
    }
}
