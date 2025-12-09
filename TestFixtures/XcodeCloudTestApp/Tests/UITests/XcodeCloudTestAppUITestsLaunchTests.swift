import XCTest

/// Launch tests that capture screenshots on app launch.
/// These tests verify the app launches successfully and capture screenshots for verification.
final class XcodeCloudTestAppUITestsLaunchTests: XCTestCase {

    override class var runsForEachTargetApplicationUIConfiguration: Bool {
        true
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunch() throws {
        print("LaunchTests: Starting launch test")

        let app = XCUIApplication()
        app.launch()

        // Capture a screenshot of the launched app
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Launch Screen"
        attachment.lifetime = .keepAlways
        add(attachment)

        print("LaunchTests: Launch screenshot captured")
    }

    func testLaunchPerformance() throws {
        print("LaunchTests: Starting performance test")

        if #available(macOS 10.15, iOS 13.0, tvOS 13.0, watchOS 7.0, *) {
            // This measures how long it takes to launch your application.
            measure(metrics: [XCTApplicationLaunchMetric()]) {
                XCUIApplication().launch()
            }
        }

        print("LaunchTests: Performance test completed")
    }
}
