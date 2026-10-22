import XCTest

final class FlowTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
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
        XCTAssertEqual(app.textViews["Favourite tracks and artists"].value as? String, "")
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
        consent.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
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
        consent.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
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
