# Test Fixtures

This directory contains an iOS app project used for integration testing the Xcode Cloud MCP server.

## XcodeCloudTestApp

A simple iOS app designed to test the MCP server's ability to:

- Trigger Xcode Cloud builds
- Retrieve test results (both passing and failing)
- Access test artifacts (screenshots, videos, logs)
- Read build issues and status

### Project Structure

```
XcodeCloudTestApp/
├── project.yml              # XcodeGen project specification
├── Sources/
│   ├── XcodeCloudTestAppApp.swift   # App entry point
│   ├── ContentView.swift            # Main UI with testable elements
│   ├── Calculator.swift             # Logic with intentional bugs
│   └── StringUtilities.swift        # More logic with intentional bugs
├── Resources/
│   └── Assets.xcassets/             # App assets
└── Tests/
    ├── UnitTests/
    │   ├── CalculatorTests.swift    # Unit tests (some fail intentionally)
    │   └── StringUtilitiesTests.swift
    └── UITests/
        ├── XcodeCloudTestAppUITests.swift       # UI tests with screenshots
        └── XcodeCloudTestAppUITestsLaunchTests.swift
```

### Intentionally Failing Tests

The project includes tests that are **designed to fail** to verify the MCP can correctly report:

- Test failure counts
- Failure screenshots (captured automatically by Xcode)
- Test result bundles

**Unit Tests that fail:**

- `testSquare_EXPECTED_FAIL` - Calculator.square() has a bug
- `testFactorial_EXPECTED_FAIL` - Calculator.factorial() has a bug
- `testCapitalizeWords_EXPECTED_FAIL` - StringUtilities has a bug
- `testRemoveWhitespace_EXPECTED_FAIL` - StringUtilities has a bug

**UI Tests that fail:**

- `testNonExistentElement_EXPECTED_FAIL` - Looks for element that doesn't exist
- `testWrongCounterValue_EXPECTED_FAIL` - Asserts wrong counter value
- `testTimeoutFailure_EXPECTED_FAIL` - Waits for element that never appears

## Setup Instructions

### Prerequisites

1. [XcodeGen](https://github.com/yonaskolb/XcodeGen) installed:

   ```bash
   brew install xcodegen
   ```

2. Xcode 15.0 or later

3. An Apple Developer account with Xcode Cloud access

### Generate the Xcode Project

```bash
cd TestFixtures/XcodeCloudTestApp
xcodegen generate
```

This creates `XcodeCloudTestApp.xcodeproj` from the `project.yml` specification.

### Set Up Xcode Cloud

1. **Open the project in Xcode:**

   ```bash
   open XcodeCloudTestApp.xcodeproj
   ```

2. **Configure signing:**
   - Select the project in the navigator
   - Go to "Signing & Capabilities"
   - Select your development team
   - Update the bundle identifier if needed

3. **Create Xcode Cloud workflow:**
   - In Xcode, go to Product > Xcode Cloud > Create Workflow
   - Or use the "Integrate" tab and click "Get Started with Xcode Cloud"

4. **Configure the workflow:**
   - **Name:** `Integration Tests` (or similar)
   - **Start Conditions:** Manual start (recommended for testing)
   - **Actions:**
     - Build (iOS Simulator)
     - Test (include both unit tests and UI tests)
   - **Post-actions:** (optional) Archive

5. **Enable screen recording for UI tests:**
   - In the workflow settings, ensure "Record Video" is enabled for test actions
   - This allows the MCP to retrieve video artifacts

### Running Integration Tests

Once Xcode Cloud is configured:

1. Ensure your App Store Connect API credentials are set:

   ```bash
   export APP_STORE_KEY_ID="your-key-id"
   export APP_STORE_ISSUER_ID="your-issuer-id"
   export APP_STORE_PRIVATE_KEY="$(cat /path/to/AuthKey.p8)"
   ```

2. Run the integration tests:
   ```bash
   bun test tests/integration/integration.test.ts
   ```

The integration tests will:

1. Find the XcodeCloudTestApp product in App Store Connect
2. Trigger a build using the configured workflow
3. Wait for completion (up to 15 minutes)
4. Retrieve and validate test results, screenshots, videos, and logs

### Expected Test Results

When the integration tests run successfully, you should see:

- **Test failures:** 7+ (from intentionally broken tests)
- **Screenshots:** Multiple (from UI test assertions and failures)
- **Videos:** 1+ (if screen recording is enabled)
- **Build logs:** Available for download

The sanity checks verify:

1. Build completed without timeout
2. Test failures are detected (expected)
3. Test results are retrievable
4. Screenshots are available
5. Videos are available (if enabled)
6. Build logs are accessible
7. Build actions are listed
8. Result bundles are present
