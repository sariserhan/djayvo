import XCTest

final class FlowTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testMicrophoneDenialKeepsImportAvailable() {
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .microphone)
        defer { app.resetAuthorizationStatus(for: .microphone) }
        app.launchArguments = ["--ui-testing"]
        app.launchEnvironment["DJAYVO_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 15))
        consent.switches.firstMatch.tap()
        XCTAssertEqual(consent.value as? String, "1")
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
        app.launchEnvironment["DJAYVO_UI_TEST_LIBRARY"] = UUID().uuidString
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
        app.launchEnvironment["DJAYVO_UI_TEST_LIBRARY"] = UUID().uuidString
        app.launch()
        let consent = app.switches["consentToggle"]
        XCTAssertTrue(consent.waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Load test clip"].isEnabled)
        consent.switches.firstMatch.tap()
        XCTAssertEqual(consent.value as? String, "1")
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
