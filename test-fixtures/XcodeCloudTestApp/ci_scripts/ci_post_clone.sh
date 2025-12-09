#!/bin/bash
set -e

echo "=== Xcode Cloud Post-Clone Script ==="

# Install xcodegen via Homebrew
echo "Installing xcodegen..."
brew install xcodegen

# Navigate to the test app directory
cd "$CI_PRIMARY_REPOSITORY_PATH/test-fixtures/XcodeCloudTestApp"

# Generate the Xcode project
echo "Generating Xcode project with xcodegen..."
xcodegen generate

echo "=== Post-Clone Script Complete ==="
