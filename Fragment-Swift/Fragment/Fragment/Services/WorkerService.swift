import Foundation
import Combine

struct TaskFragment: Identifiable, Codable {
    var id: String { fragmentId } // Use fragmentId as the id for Identifiable
    let fragmentId: String
    let jobId: String
    let fragmentIndex: Int
    let totalFragments: Int?  // Optional since it might not always be present
    let data: FragmentData
    let bountyAmount: Double
    let filecoinUrl: String
    var blobId: String?
    var encryptionId: String?
    var status: String
    var workerId: String?
    var result: FragmentResult?
    
    struct FragmentData: Codable {
        let text: String
    }
    
    struct FragmentResult: Codable {
        let filecoinUrl: String?
        let blobId: String?
    }
    
    enum CodingKeys: String, CodingKey {
        case fragmentId, jobId, fragmentIndex, totalFragments, data, bountyAmount
        case filecoinUrl = "walrusUrl"
        case blobId, encryptionId, status, workerId, result
    }
}

struct AvailableFragmentsResponse: Codable {
    let count: Int
    let fragments: [TaskFragment]
}

struct FragmentCompletionResponse: Codable {
    let fragmentId: String
    let status: String
    let bountyAwarded: Double
}

struct WalletInfo: Codable {
    let address: String
    let saga: Double
    let usdc: Double
    
    enum CodingKeys: String, CodingKey {
        case address
        case saga = "sui"
        case usdc
    }
}

struct WalletResponse: Codable {
    let walletA: WalletInfo
    let walletB: WalletInfo
    let walletC: WalletInfo
}

class WorkerService: ObservableObject {
    @Published var isWorking = false
    @Published var availableFragments: [TaskFragment] = []
    @Published var claimedFragments: [TaskFragment] = []
    @Published var completedFragments: [TaskFragment] = []
    @Published var usdcBalance: Double = 0.0
    @Published var statusMessage = "Ready to work"
    @Published var errorMessage: String? = nil
    
    private let apiBaseURL = "https://loose-under-prototype-pin.trycloudflare.com/api"
    let workerId = UUID().uuidString
    private var pollingTimer: Timer?
    private var statusRefreshTimer: Timer?
    private var balanceRefreshTimer: Timer?
    private var chatService: ChatService?
    private var trackedFragmentIds: Set<String> = []
    
    func setChatService(_ chatService: ChatService) {
        self.chatService = chatService
    }
    
    // MARK: - Worker Control
    
    func startWorker() {
        guard !isWorking else { return }
        isWorking = true
        statusMessage = "Looking for work..."
        
        // Start polling for available fragments
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.fetchAvailableFragments()
        }
        
        // Start refreshing fragment status every 2 seconds
        statusRefreshTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.refreshFragmentStatuses()
        }
        
        // Start refreshing USDC balance every 5 seconds
        balanceRefreshTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.fetchUSDCBalance()
        }
        
        // Initial fetches
        fetchAvailableFragments()
        fetchUSDCBalance()
        
        print("✅ Worker started: \(workerId)")
    }
    
    func stopWorker() {
        isWorking = false
        pollingTimer?.invalidate()
        pollingTimer = nil
        statusRefreshTimer?.invalidate()
        statusRefreshTimer = nil
        balanceRefreshTimer?.invalidate()
        balanceRefreshTimer = nil
        statusMessage = "Worker stopped"
        print("⏹️ Worker stopped")
    }
    
    // MARK: - Balance Management
    
    private func fetchUSDCBalance() {
        guard let url = URL(string: "\(apiBaseURL)/wallets") else {
            print("❌ Invalid URL for fetching wallets")
            return
        }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error fetching wallet balance: \(error.localizedDescription)")
                return
            }
            
            guard let data = data else {
                print("❌ No data received for wallet balance")
                return
            }
            
            do {
                let walletResponse = try JSONDecoder().decode(WalletResponse.self, from: data)
                
                DispatchQueue.main.async {
                    self.usdcBalance = walletResponse.walletB.usdc
                }
            } catch {
                print("❌ Error decoding wallet balance: \(error)")
            }
        }.resume()
    }
    
    // MARK: - Fragment Discovery
    
    private func refreshFragmentStatuses() {
        // Refresh all tracked fragments (claimed and completed)
        let allTracked = claimedFragments + completedFragments
        
        for fragment in allTracked {
            guard let url = URL(string: "\(apiBaseURL)/fragments/available") else { continue }
            
            URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
                guard let self = self,
                      let data = data,
                      let result = try? JSONDecoder().decode(AvailableFragmentsResponse.self, from: data) else {
                    return
                }
                
                // Find updated fragment in the response
                if let updatedFragment = result.fragments.first(where: { $0.fragmentId == fragment.fragmentId }) {
                    DispatchQueue.main.async {
                        // Update the fragment with latest data from backend
                        if let index = self.claimedFragments.firstIndex(where: { $0.fragmentId == fragment.fragmentId }) {
                            self.claimedFragments[index] = updatedFragment
                        }
                        if let index = self.completedFragments.firstIndex(where: { $0.fragmentId == fragment.fragmentId }) {
                            self.completedFragments[index] = updatedFragment
                        }
                    }
                }
            }.resume()
        }
    }
    
    private func fetchAvailableFragments() {
        guard let url = URL(string: "\(apiBaseURL)/fragments/available?capability=gemma-text-classification") else {
            print("❌ Invalid URL for fetching fragments")
            return
        }
        
        print("🔍 Fetching available fragments from: \(url.absoluteString)")
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Network error fetching fragments: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.errorMessage = "Network error: \(error.localizedDescription)"
                    self.statusMessage = "Failed to fetch fragments"
                }
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type")
                return
            }
            
            print("📡 HTTP Status: \(httpResponse.statusCode)")
            
            guard let data = data else {
                print("❌ No data received")
                DispatchQueue.main.async {
                    self.errorMessage = "No data received from server"
                }
                return
            }
            
            // Print raw response for debugging
            if let rawString = String(data: data, encoding: .utf8) {
                print("📦 Raw response: \(rawString)")
            }
            
            do {
                let result = try JSONDecoder().decode(AvailableFragmentsResponse.self, from: data)
                
                print("✅ Successfully decoded \(result.count) fragments")
                
                DispatchQueue.main.async {
                    self.availableFragments = result.fragments
                    self.errorMessage = nil
                    
                    if result.count > 0 {
                        self.statusMessage = "\(result.count) fragments available"
                        
                        // Auto-claim if we don't have any claimed fragments
                        if self.claimedFragments.isEmpty {
                            print("🎯 Auto-claiming first fragment...")
                            self.claimFragment(result.fragments[0])
                        }
                    } else {
                        self.statusMessage = "No fragments available"
                    }
                }
            } catch {
                print("❌ Error decoding fragments: \(error)")
                if let decodingError = error as? DecodingError {
                    switch decodingError {
                    case .keyNotFound(let key, let context):
                        print("   Missing key: \(key.stringValue) - \(context.debugDescription)")
                    case .typeMismatch(let type, let context):
                        print("   Type mismatch: \(type) - \(context.debugDescription)")
                    case .valueNotFound(let type, let context):
                        print("   Value not found: \(type) - \(context.debugDescription)")
                    case .dataCorrupted(let context):
                        print("   Data corrupted: \(context.debugDescription)")
                    @unknown default:
                        print("   Unknown decoding error")
                    }
                }
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to decode response"
                }
            }
        }.resume()
    }
    
    // MARK: - Fragment Processing
    
    func claimFragment(_ fragment: TaskFragment) {
        guard let url = URL(string: "\(apiBaseURL)/fragments/\(fragment.fragmentId)/claim") else {
            print("❌ Invalid URL for claiming fragment")
            return
        }
        
        print("🎯 Claiming fragment #\(fragment.fragmentIndex) (\(fragment.fragmentId))")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["workerId": workerId]
        request.httpBody = try? JSONEncoder().encode(body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error claiming fragment: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to claim fragment: \(error.localizedDescription)"
                }
                return
            }
            
            guard let data = data else {
                print("❌ No data received when claiming fragment")
                return
            }
            
            if let rawString = String(data: data, encoding: .utf8) {
                print("📦 Claim response: \(rawString)")
            }
            
            do {
                let claimedFragment = try JSONDecoder().decode(TaskFragment.self, from: data)
                
                print("✅ Claimed fragment #\(claimedFragment.fragmentIndex)")
                
                DispatchQueue.main.async {
                    // Remove from available
                    self.availableFragments.removeAll { $0.fragmentId == claimedFragment.fragmentId }
                    // Add to claimed
                    self.claimedFragments.append(claimedFragment)
                    self.statusMessage = "Processing fragment #\(claimedFragment.fragmentIndex)..."
                    
                    // Process the fragment
                    self.processFragment(claimedFragment)
                }
            } catch {
                print("❌ Error decoding claimed fragment: \(error)")
            }
        }.resume()
    }
    
    private func processFragment(_ fragment: TaskFragment) {
        guard let chatService = self.chatService else {
            errorMessage = "Chat service not available"
            return
        }
        
        let text = fragment.data.text
        let prompt = "Classify the following text as 'safe' or 'unsafe' based on whether it contains hate speech, violence, or harmful content. Respond with ONLY 'safe' or 'unsafe'. Text: \"\(text)\""
        
        print("🤖 Classifying: \(text)")
        
        // Use Gemma to classify
        Task {
            await chatService.sendMessage(prompt)
            
            // Wait for response
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            
            // Get the last message (assistant's response)
            let response = await MainActor.run {
                chatService.messages.last?.content ?? "safe"
            }
            
            let label = response.lowercased().contains("unsafe") ? "unsafe" : "safe"
            
            print("📊 Classification result: \(label)")
            
            // Complete the fragment
            await self.completeFragment(fragment, label: label)
        }
    }
    
    private func completeFragment(_ fragment: TaskFragment, label: String) async {
        guard let url = URL(string: "\(apiBaseURL)/fragments/\(fragment.fragmentId)/complete") else {
            print("❌ Invalid URL for completing fragment")
            return
        }
        
        print("📤 Completing fragment #\(fragment.fragmentIndex) with label: \(label)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let result = [
            "text": fragment.data.text,
            "label": label
        ]
        
        let body: [String: Any] = [
            "result": result,
            "workerId": workerId
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        // Debug: Print request body
        if let bodyData = request.httpBody, let bodyString = String(data: bodyData, encoding: .utf8) {
            print("📤 Request body: \(bodyString)")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse {
                print("📡 Complete HTTP Status: \(httpResponse.statusCode)")
            }
            
            if let rawString = String(data: data, encoding: .utf8) {
                print("📦 Complete response: \(rawString)")
            }
            
            let responseData = try JSONDecoder().decode(FragmentCompletionResponse.self, from: data)
            
            print("✅ Fragment #\(fragment.fragmentIndex) completed successfully! Bounty: \(responseData.bountyAwarded) SAGA")
            
            await MainActor.run {
                // Move from claimed to completed
                if let index = claimedFragments.firstIndex(where: { $0.fragmentId == fragment.fragmentId }) {
                    claimedFragments.remove(at: index)
                }
                
                // Update fragment status to completed
                var completedFragment = fragment
                completedFragment.status = "completed"
                
                completedFragments.append(completedFragment)
                statusMessage = "Completed! Earned +\(fragment.bountyAmount) USDC"
                
                print("✅ Fragment completed! Earned +\(fragment.bountyAmount) USDC")
                
                // Refresh balance immediately
                self.fetchUSDCBalance()
                
                // Clear chat history
                chatService?.clearChat()
            }
        } catch {
            print("❌ Error completing fragment: \(error.localizedDescription)")
            await MainActor.run {
                errorMessage = "Failed to complete fragment: \(error.localizedDescription)"
            }
        }
    }
    
    deinit {
        stopWorker()
    }
}

