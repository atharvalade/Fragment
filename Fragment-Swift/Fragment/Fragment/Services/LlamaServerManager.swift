import Foundation
import Combine

class LlamaServerManager: ObservableObject {
    @Published var isRunning = false
    @Published var serverStatus: String = "Not started"
    @Published var errorMessage: String? = nil
    
    private var serverProcess: Process?
    private let serverPort = 8080
    
    // MARK: - Server Control
    
    func startServer() {
        guard !isRunning else { return }
        
        // Get paths from bundle
        guard let serverPath = Bundle.main.path(forResource: "llama-server", ofType: nil),
              let modelPath = Bundle.main.path(forResource: "gemma-3-4b-it-q4_0", ofType: "gguf") else {
            errorMessage = "Server or model files not found in bundle"
            serverStatus = "Error: Missing files"
            print("❌ Files not found in bundle")
            let serverCheck = Bundle.main.path(forResource: "llama-server", ofType: nil) ?? "nil"
            let modelCheck = Bundle.main.path(forResource: "gemma-3-4b-it-q4_0", ofType: "gguf") ?? "nil"
            let resourcesCheck = Bundle.main.resourcePath ?? "nil"
            print("   Server: \(serverCheck)")
            print("   Model: \(modelCheck)")
            print("   Bundle path: \(Bundle.main.bundlePath)")
            print("   Resources path: \(resourcesCheck)")
            return
        }
        
        print("📁 Found files:")
        print("   Server: \(serverPath)")
        print("   Model: \(modelPath)")
        
        // Verify files exist
        let fileManager = FileManager.default
        if !fileManager.fileExists(atPath: serverPath) {
            errorMessage = "Server binary not found at path"
            serverStatus = "Error: Server missing"
            print("❌ Server binary does not exist at: \(serverPath)")
            return
        }
        if !fileManager.fileExists(atPath: modelPath) {
            errorMessage = "Model file not found at path"
            serverStatus = "Error: Model missing"
            print("❌ Model file does not exist at: \(modelPath)")
            return
        }
        print("✅ Both files verified to exist")
        
        // Make server executable
        var attributes = [FileAttributeKey: Any]()
        attributes[.posixPermissions] = 0o755
        try? fileManager.setAttributes(attributes, ofItemAtPath: serverPath)
        
        let process = Process()
        process.executableURL = URL(fileURLWithPath: serverPath)
        process.arguments = [
            "--model", modelPath,
            "--host", "127.0.0.1",
            "--port", String(serverPort),
            "--ctx-size", "2048",
            "--n-gpu-layers", "99"
        ]
        
        // Capture output for debugging
        let outputPipe = Pipe()
        let errorPipe = Pipe()
        process.standardOutput = outputPipe
        process.standardError = errorPipe
        
        // Read output to see what's happening
        outputPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                print("🖥️ llama-server stdout: \(output.trimmingCharacters(in: .whitespacesAndNewlines))")
            }
        }
        
        errorPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                print("⚠️ llama-server stderr: \(output.trimmingCharacters(in: .whitespacesAndNewlines))")
            }
        }
        
        // Handle termination
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                self?.isRunning = false
                self?.serverStatus = "Stopped"
                self?.serverProcess = nil
            }
        }
        
        do {
            try process.run()
            serverProcess = process
            isRunning = true
            serverStatus = "Starting..."
            
            // Wait a bit then check if it's responding
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                self.checkServerHealth()
            }
            
            print("✅ Llama server started on port \(serverPort)")
        } catch {
            errorMessage = "Failed to start server: \(error.localizedDescription)"
            serverStatus = "Failed to start"
            print("❌ Failed to start llama-server: \(error)")
        }
    }
    
    func stopServer() {
        guard isRunning, let process = serverProcess else { return }
        process.terminate()
        isRunning = false
        serverStatus = "Stopped"
        serverProcess = nil
        print("⏹️ Llama server stopped")
    }
    
    private func checkServerHealth() {
        guard let url = URL(string: "http://127.0.0.1:\(serverPort)/health") else { return }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if error == nil, let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    self?.serverStatus = "Running"
                    self?.errorMessage = nil
                } else {
                    self?.serverStatus = "Not responding"
                    self?.errorMessage = "Server failed to start properly"
                }
            }
        }.resume()
    }
    
    deinit {
        stopServer()
    }
}

