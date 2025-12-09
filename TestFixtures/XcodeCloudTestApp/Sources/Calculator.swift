import Foundation

/// A simple calculator class for testing purposes.
/// Some methods are intentionally implemented incorrectly to demonstrate failing tests.
class Calculator {
    /// Correctly adds two numbers
    func add(_ a: Int, _ b: Int) -> Int {
        return a + b
    }

    /// Correctly subtracts b from a
    func subtract(_ a: Int, _ b: Int) -> Int {
        return a - b
    }

    /// Correctly multiplies two numbers
    func multiply(_ a: Int, _ b: Int) -> Int {
        return a * b
    }

    /// Correctly divides a by b
    /// - Returns: nil if dividing by zero
    func divide(_ a: Int, _ b: Int) -> Int? {
        guard b != 0 else { return nil }
        return a / b
    }

    /// INTENTIONALLY BROKEN: This method has a bug for testing purposes
    /// It should return a^2 but actually returns a*2
    func square(_ a: Int) -> Int {
        // Bug: multiplying by 2 instead of squaring
        return a * 2
    }

    /// INTENTIONALLY BROKEN: This method has a bug for testing purposes
    /// It should return the factorial but has an off-by-one error
    func factorial(_ n: Int) -> Int {
        guard n >= 0 else { return 0 }
        guard n > 1 else { return 1 }
        var result = 1
        // Bug: starts from 1 instead of 2, causing incorrect results for n > 2
        for i in 1...n {
            result *= i
        }
        // Bug: subtracts 1 from the result
        return result - 1
    }
}
