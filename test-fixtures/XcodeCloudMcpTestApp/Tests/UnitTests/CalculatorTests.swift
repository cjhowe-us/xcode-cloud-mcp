import XCTest
@testable import XcodeCloudTestApp

/// Unit tests for the Calculator class.
/// Contains both passing and intentionally failing tests to verify MCP can read test results.
final class CalculatorTests: XCTestCase {

    var calculator: Calculator!

    override func setUpWithError() throws {
        calculator = Calculator()
        print("CalculatorTests: Setting up test")
    }

    override func tearDownWithError() throws {
        calculator = nil
        print("CalculatorTests: Tearing down test")
    }

    // MARK: - Passing Tests

    func testAddition() throws {
        print("CalculatorTests: Testing addition")
        XCTAssertEqual(calculator.add(2, 3), 5, "2 + 3 should equal 5")
        XCTAssertEqual(calculator.add(-1, 1), 0, "-1 + 1 should equal 0")
        XCTAssertEqual(calculator.add(0, 0), 0, "0 + 0 should equal 0")
    }

    func testSubtraction() throws {
        print("CalculatorTests: Testing subtraction")
        XCTAssertEqual(calculator.subtract(5, 3), 2, "5 - 3 should equal 2")
        XCTAssertEqual(calculator.subtract(1, 1), 0, "1 - 1 should equal 0")
        XCTAssertEqual(calculator.subtract(0, 5), -5, "0 - 5 should equal -5")
    }

    func testMultiplication() throws {
        print("CalculatorTests: Testing multiplication")
        XCTAssertEqual(calculator.multiply(2, 3), 6, "2 * 3 should equal 6")
        XCTAssertEqual(calculator.multiply(-2, 3), -6, "-2 * 3 should equal -6")
        XCTAssertEqual(calculator.multiply(0, 100), 0, "0 * 100 should equal 0")
    }

    func testDivision() throws {
        print("CalculatorTests: Testing division")
        XCTAssertEqual(calculator.divide(6, 2), 3, "6 / 2 should equal 3")
        XCTAssertEqual(calculator.divide(10, 5), 2, "10 / 5 should equal 2")
        XCTAssertNil(calculator.divide(5, 0), "Division by zero should return nil")
    }

    // MARK: - Failing Tests (Intentional bugs in Calculator)

    func testSquare_EXPECTED_FAIL() throws {
        // This test is expected to FAIL because Calculator.square() has a bug
        print("CalculatorTests: Testing square (expected to fail)")
        XCTAssertEqual(calculator.square(3), 9, "3^2 should equal 9, but Calculator has a bug")
        XCTAssertEqual(calculator.square(5), 25, "5^2 should equal 25, but Calculator has a bug")
    }

    func testFactorial_EXPECTED_FAIL() throws {
        // This test is expected to FAIL because Calculator.factorial() has bugs
        print("CalculatorTests: Testing factorial (expected to fail)")
        XCTAssertEqual(calculator.factorial(5), 120, "5! should equal 120, but Calculator has a bug")
        XCTAssertEqual(calculator.factorial(4), 24, "4! should equal 24, but Calculator has a bug")
    }
}
