import XCTest
@testable import XcodeCloudTestApp

/// Unit tests for the StringUtilities class.
/// Contains both passing and intentionally failing tests to verify MCP can read test results.
final class StringUtilitiesTests: XCTestCase {

    var stringUtils: StringUtilities!

    override func setUpWithError() throws {
        stringUtils = StringUtilities()
        print("StringUtilitiesTests: Setting up test")
    }

    override func tearDownWithError() throws {
        stringUtils = nil
        print("StringUtilitiesTests: Tearing down test")
    }

    // MARK: - Passing Tests

    func testReverse() throws {
        print("StringUtilitiesTests: Testing reverse")
        XCTAssertEqual(stringUtils.reverse("hello"), "olleh", "hello reversed should be olleh")
        XCTAssertEqual(stringUtils.reverse(""), "", "Empty string reversed should be empty")
        XCTAssertEqual(stringUtils.reverse("a"), "a", "Single character reversed should be same")
    }

    func testIsPalindrome() throws {
        print("StringUtilitiesTests: Testing isPalindrome")
        XCTAssertTrue(stringUtils.isPalindrome("racecar"), "racecar is a palindrome")
        XCTAssertTrue(stringUtils.isPalindrome("A man a plan a canal Panama"), "Should ignore spaces and case")
        XCTAssertFalse(stringUtils.isPalindrome("hello"), "hello is not a palindrome")
    }

    func testWordCount() throws {
        print("StringUtilitiesTests: Testing wordCount")
        XCTAssertEqual(stringUtils.wordCount("hello world"), 2, "Two words")
        XCTAssertEqual(stringUtils.wordCount("one"), 1, "One word")
        XCTAssertEqual(stringUtils.wordCount(""), 0, "Empty string has no words")
    }

    // MARK: - Failing Tests (Intentional bugs in StringUtilities)

    func testCapitalizeWords_EXPECTED_FAIL() throws {
        // This test is expected to FAIL because StringUtilities.capitalizeWords() has a bug
        print("StringUtilitiesTests: Testing capitalizeWords (expected to fail)")
        XCTAssertEqual(
            stringUtils.capitalizeWords("hello world"),
            "Hello World",
            "Each word should be capitalized, but StringUtilities has a bug"
        )
    }

    func testRemoveWhitespace_EXPECTED_FAIL() throws {
        // This test is expected to FAIL because StringUtilities.removeWhitespace() has a bug
        print("StringUtilitiesTests: Testing removeWhitespace (expected to fail)")
        XCTAssertEqual(
            stringUtils.removeWhitespace("hello\tworld\ntest"),
            "helloworldtest",
            "All whitespace should be removed, but StringUtilities has a bug"
        )
    }
}
