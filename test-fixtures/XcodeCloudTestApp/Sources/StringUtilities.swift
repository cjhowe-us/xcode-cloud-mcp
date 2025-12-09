import Foundation

/// String utility class for testing purposes.
/// Some methods are intentionally implemented incorrectly to demonstrate failing tests.
class StringUtilities {
    /// Correctly reverses a string
    func reverse(_ string: String) -> String {
        return String(string.reversed())
    }

    /// Correctly checks if a string is a palindrome
    func isPalindrome(_ string: String) -> Bool {
        let cleaned = string.lowercased().filter { $0.isLetter }
        return cleaned == String(cleaned.reversed())
    }

    /// Correctly counts words in a string
    func wordCount(_ string: String) -> Int {
        return string.split(separator: " ").count
    }

    /// INTENTIONALLY BROKEN: Should capitalize each word but only capitalizes first letter
    func capitalizeWords(_ string: String) -> String {
        // Bug: Only capitalizes the first character of the entire string
        return string.prefix(1).uppercased() + string.dropFirst()
    }

    /// INTENTIONALLY BROKEN: Should remove all whitespace but keeps some
    func removeWhitespace(_ string: String) -> String {
        // Bug: Only removes spaces, not tabs or newlines
        return string.replacingOccurrences(of: " ", with: "")
    }
}
