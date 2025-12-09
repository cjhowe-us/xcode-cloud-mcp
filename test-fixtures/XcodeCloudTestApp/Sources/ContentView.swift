import SwiftUI

struct ContentView: View {
    @State private var counter: Int = 0
    @State private var inputText: String = ""
    @State private var showingAlert: Bool = false
    @State private var calculationResult: String = ""

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Counter section
                VStack(spacing: 10) {
                    Text("Counter: \(counter)")
                        .font(.largeTitle)
                        .accessibilityIdentifier("counterLabel")

                    HStack(spacing: 20) {
                        Button("Decrement") {
                            counter -= 1
                        }
                        .accessibilityIdentifier("decrementButton")

                        Button("Increment") {
                            counter += 1
                        }
                        .accessibilityIdentifier("incrementButton")
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(10)

                // Text input section
                VStack(spacing: 10) {
                    TextField("Enter text here", text: $inputText)
                        .textFieldStyle(.roundedBorder)
                        .accessibilityIdentifier("textInput")

                    Text("You typed: \(inputText)")
                        .accessibilityIdentifier("textOutput")

                    Button("Clear Text") {
                        inputText = ""
                    }
                    .accessibilityIdentifier("clearButton")
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(10)

                // Calculator section
                VStack(spacing: 10) {
                    Text("Calculator Result: \(calculationResult)")
                        .accessibilityIdentifier("calculatorResult")

                    Button("Calculate 2 + 2") {
                        let calc = Calculator()
                        calculationResult = String(calc.add(2, 2))
                    }
                    .accessibilityIdentifier("calculateButton")
                }
                .padding()
                .background(Color.green.opacity(0.1))
                .cornerRadius(10)

                // Alert section
                Button("Show Alert") {
                    showingAlert = true
                }
                .accessibilityIdentifier("alertButton")
                .buttonStyle(.bordered)
                .alert("Test Alert", isPresented: $showingAlert) {
                    Button("OK", role: .cancel) { }
                } message: {
                    Text("This is a test alert for UI testing")
                }

                Spacer()
            }
            .padding()
            .navigationTitle("XC Test App")
        }
    }
}

#Preview {
    ContentView()
}
