import XCTest

/// UI tests for XcodeCloudMcpTestApp.
/// Contains both passing and intentionally failing tests to verify MCP can read test results.
/// Screenshots are captured for test artifacts verification.
final class XcodeCloudMcpTestAppUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
        print("UITests: App launched")

        // Take a screenshot at the start of each test
        takeScreenshot(name: "Test Start")
    }

    override func tearDownWithError() throws {
        // Take a screenshot at the end of each test
        takeScreenshot(name: "Test End")
        app = nil
        print("UITests: Test completed")
    }

    // MARK: - Helper Methods

    /// Takes a screenshot and attaches it to the test results
    private func takeScreenshot(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        print("UITests: Screenshot captured - \(name)")
    }

    // MARK: - Passing Tests

    func testCounterIncrement() throws {
        print("UITests: Testing counter increment")

        let counterLabel = app.staticTexts["counterLabel"]
        let incrementButton = app.buttons["incrementButton"]

        // Verify initial state
        XCTAssertTrue(counterLabel.exists, "Counter label should exist")
        XCTAssertTrue(counterLabel.label.contains("0"), "Counter should start at 0")
        takeScreenshot(name: "Counter Initial State")

        // Tap increment
        incrementButton.tap()
        takeScreenshot(name: "Counter After First Increment")

        XCTAssertTrue(counterLabel.label.contains("1"), "Counter should be 1 after increment")

        // Tap again
        incrementButton.tap()
        takeScreenshot(name: "Counter After Second Increment")

        XCTAssertTrue(counterLabel.label.contains("2"), "Counter should be 2 after second increment")
    }

    func testCounterDecrement() throws {
        print("UITests: Testing counter decrement")

        let counterLabel = app.staticTexts["counterLabel"]
        let decrementButton = app.buttons["decrementButton"]

        takeScreenshot(name: "Decrement Test Start")

        // Tap decrement from 0
        decrementButton.tap()
        takeScreenshot(name: "Counter After Decrement")

        XCTAssertTrue(counterLabel.label.contains("-1"), "Counter should be -1 after decrement")
    }

    func testTextInput() throws {
        print("UITests: Testing text input")

        let textInput = app.textFields["textInput"]
        let textOutput = app.staticTexts["textOutput"]
        let clearButton = app.buttons["clearButton"]

        takeScreenshot(name: "Text Input Initial")

        // Type text
        textInput.tap()
        textInput.typeText("Hello World")
        takeScreenshot(name: "Text After Typing")

        XCTAssertTrue(textOutput.label.contains("Hello World"), "Output should contain typed text")

        // Clear text
        clearButton.tap()
        takeScreenshot(name: "Text After Clear")
    }

    func testCalculatorButton() throws {
        print("UITests: Testing calculator button")

        let calculateButton = app.buttons["calculateButton"]
        let calculatorResult = app.staticTexts["calculatorResult"]

        takeScreenshot(name: "Calculator Initial")

        calculateButton.tap()
        takeScreenshot(name: "Calculator After Tap")

        // Wait for result
        let resultPredicate = NSPredicate(format: "label CONTAINS '4'")
        let expectation = XCTNSPredicateExpectation(predicate: resultPredicate, object: calculatorResult)

        let result = XCTWaiter.wait(for: [expectation], timeout: 5)
        XCTAssertEqual(result, .completed, "Calculator should show result 4")
    }

    func testAlertPresentation() throws {
        print("UITests: Testing alert presentation")

        let alertButton = app.buttons["alertButton"]
        takeScreenshot(name: "Alert Test Start")

        alertButton.tap()

        // Wait for alert
        let alert = app.alerts["Test Alert"]
        XCTAssertTrue(alert.waitForExistence(timeout: 5), "Alert should appear")
        takeScreenshot(name: "Alert Visible")

        // Dismiss alert
        alert.buttons["OK"].tap()
        takeScreenshot(name: "Alert Dismissed")
    }

    // MARK: - Failing Tests (Intentional failures for testing MCP)

    func testNonExistentElement_EXPECTED_FAIL() throws {
        // This test is expected to FAIL - looks for an element that doesn't exist
        print("UITests: Testing for non-existent element (expected to fail)")

        takeScreenshot(name: "Before Non-Existent Check")

        let fakeButton = app.buttons["thisButtonDoesNotExist"]

        // This assertion will fail and generate a failure screenshot
        XCTAssertTrue(fakeButton.exists, "This button does not exist - expected failure")
    }

    func testWrongCounterValue_EXPECTED_FAIL() throws {
        // This test is expected to FAIL - expects wrong counter value
        print("UITests: Testing wrong counter value (expected to fail)")

        let counterLabel = app.staticTexts["counterLabel"]
        let incrementButton = app.buttons["incrementButton"]

        takeScreenshot(name: "Wrong Value Test Start")

        // Increment once
        incrementButton.tap()
        takeScreenshot(name: "After Single Increment")

        // Assert wrong value - this will fail
        XCTAssertTrue(
            counterLabel.label.contains("100"),
            "Counter should be 100 (intentionally wrong assertion)"
        )
    }

    func testTimeoutFailure_EXPECTED_FAIL() throws {
        // This test is expected to FAIL - waits for element that won't appear
        print("UITests: Testing timeout failure (expected to fail)")

        takeScreenshot(name: "Timeout Test Start")

        let fakeElement = app.staticTexts["elementThatWillNeverAppear"]

        // This will timeout and fail
        let appeared = fakeElement.waitForExistence(timeout: 2)
        XCTAssertTrue(appeared, "Element should appear (but it won't - expected failure)")

        takeScreenshot(name: "Timeout Test End")
    }
}
