import Foundation
import Combine

// MARK: - API Response Models

struct Worker: Identifiable, Codable {
    let id: Int
    let address: String
    var isActive: Bool
    var isRegistered: Bool
    var balance: WorkerBalance
}

struct WorkerBalance: Codable {
    let ment: Double
    let wsaga: Double
}

struct WorkersResponse: Codable {
    let workers: [Worker]
}

struct WorkerTask: Identifiable, Codable {
    var id: String { taskId }
    let taskId: String
    let jobId: String
    let status: String
    let pieceCid: String
    let assignedWorker: String
    let bounty: String
}

struct AvailableTasksResponse: Codable {
    let tasks: [WorkerTask]
}

struct TaskCompletionResponse: Codable {
    let success: Bool
    let taskId: String
    let workerId: Int
    let classification: String
    let txHash: String
    let explorerUrl: String
    let bountyEarned: String
    let newBalance: Double
}

struct TaskContentResponse: Codable {
    let data: TaskData?
    
    struct TaskData: Codable {
        let text: String
    }
}

// MARK: - Worker Service

class WorkerService: ObservableObject {
    @Published var workers: [Worker] = []
    @Published var activeWorkers: Set<Int> = []
    @Published var availableTasks: [WorkerTask] = []
    @Published var currentTasks: [Int: WorkerTask] = [:] // workerId -> current task
    @Published var statusMessage = "Ready to start workers"
    @Published var errorMessage: String? = nil
    
    private let apiBaseURL = "http://localhost:3001/api"
    private var pollingTimer: Timer?
    private var chatService: ChatService?
    private var processingWorkers: Set<Int> = [] // Track which workers are currently processing
    
    init() {
        // Load workers on init
        fetchWorkers()
    }
    
    func setChatService(_ chatService: ChatService) {
        self.chatService = chatService
    }
    
    // MARK: - Worker Management
    
    func fetchWorkers() {
        guard let url = URL(string: "\(apiBaseURL)/workers") else {
            print("❌ Invalid URL for fetching workers")
            return
        }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error fetching workers: \(error.localizedDescription)")
                return
            }
            
            guard let data = data else {
                print("❌ No data received for workers")
                return
            }
            
            do {
                let workersResponse = try JSONDecoder().decode(WorkersResponse.self, from: data)
                
                DispatchQueue.main.async {
                    self.workers = workersResponse.workers
                    print("✅ Loaded \(self.workers.count) workers")
                }
            } catch {
                print("❌ Error decoding workers: \(error)")
            }
        }.resume()
    }
    
    func startWorker(workerId: Int) {
        guard !activeWorkers.contains(workerId) else {
            print("⚠️ Worker \(workerId) is already active")
            return
        }
        
        print("🚀 Starting worker \(workerId)...")
        
        guard let url = URL(string: "\(apiBaseURL)/workers/\(workerId)/start") else {
            print("❌ Invalid URL for starting worker")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error starting worker: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to start worker: \(error.localizedDescription)"
                }
                return
            }
            
            DispatchQueue.main.async {
                self.activeWorkers.insert(workerId)
                self.statusMessage = "Worker \(workerId) started"
                print("✅ Worker \(workerId) started successfully")
                
                // Start polling if this is the first worker
                if self.activeWorkers.count == 1 {
                    self.startPolling()
                }
                
                // Refresh workers to get updated status
                self.fetchWorkers()
            }
        }.resume()
    }
    
    func stopWorker(workerId: Int) {
        guard activeWorkers.contains(workerId) else {
            print("⚠️ Worker \(workerId) is not active")
            return
        }
        
        print("🛑 Stopping worker \(workerId)...")
        
        guard let url = URL(string: "\(apiBaseURL)/workers/\(workerId)/stop") else {
            print("❌ Invalid URL for stopping worker")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error stopping worker: \(error.localizedDescription)")
                return
            }
            
            DispatchQueue.main.async {
                self.activeWorkers.remove(workerId)
                self.currentTasks.removeValue(forKey: workerId)
                self.processingWorkers.remove(workerId)
                self.statusMessage = "Worker \(workerId) stopped"
                print("✅ Worker \(workerId) stopped successfully")
                
                // Stop polling if no workers are active
                if self.activeWorkers.isEmpty {
                    self.stopPolling()
                }
                
                // Refresh workers to get updated status
                self.fetchWorkers()
            }
        }.resume()
    }
    
    // MARK: - Task Polling
    
    private func startPolling() {
        print("🔄 Starting task polling...")
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.checkForTasks()
        }
        
        // Initial fetch
        checkForTasks()
    }
    
    private func stopPolling() {
        print("⏹️ Stopping task polling")
        pollingTimer?.invalidate()
        pollingTimer = nil
    }
    
    private func checkForTasks() {
        // Refresh workers to update balances
        fetchWorkers()
        
        // Check for tasks
        fetchAvailableTasks()
    }
    
    private func fetchAvailableTasks() {
        guard let url = URL(string: "\(apiBaseURL)/workers/available-tasks") else {
            print("❌ Invalid URL for fetching tasks")
            return
        }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error fetching tasks: \(error.localizedDescription)")
                return
            }
            
            guard let data = data else {
                print("❌ No data received for tasks")
                return
            }
            
            do {
                let tasksResponse = try JSONDecoder().decode(AvailableTasksResponse.self, from: data)
                
                DispatchQueue.main.async {
                    self.availableTasks = tasksResponse.tasks
                    
                    // Auto-assign tasks to idle workers
                    for workerId in self.activeWorkers {
                        // Skip if worker is already processing a task
                        if self.processingWorkers.contains(workerId) {
                            continue
                        }
                        
                        // Find worker's address
                        guard let workerAddress = self.workers.first(where: { $0.id == workerId })?.address else {
                            continue
                        }
                        
                        // Check if worker has an assigned task
                        if let assignedTask = tasksResponse.tasks.first(where: { task in
                            task.status == "Assigned" &&
                            task.assignedWorker.lowercased() == workerAddress.lowercased()
                        }) {
                            print("🎯 Found task \(assignedTask.taskId) for worker \(workerId)")
                            self.processTask(workerId: workerId, task: assignedTask)
                        }
                    }
                }
            } catch {
                print("❌ Error decoding tasks: \(error)")
            }
        }.resume()
    }
    
    // MARK: - Task Processing with AI
    
    private func processTask(workerId: Int, task: WorkerTask) {
        // Mark worker as processing
        DispatchQueue.main.async {
            self.processingWorkers.insert(workerId)
            self.currentTasks[workerId] = task
            self.statusMessage = "Worker \(workerId) processing task \(task.taskId)"
        }
        
        print("⚙️  Worker \(workerId) processing task \(task.taskId)...")
        
        // Download task content from Filecoin CDN
        let filecoinURL = "https://0x9f93EebD463d4B7c991986a082d974E77b5a02Dc.calibration.filbeam.io/\(task.pieceCid)"
        guard let url = URL(string: filecoinURL) else {
            print("❌ Invalid Filecoin URL: \(filecoinURL)")
            completeProcessing(workerId: workerId)
            return
        }
        
        print("📥 Downloading from Filecoin: \(filecoinURL)")
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            var inputText = "Unknown text"
            
            if let data = data,
               let content = try? JSONDecoder().decode(TaskContentResponse.self, from: data),
               let text = content.data?.text {
                inputText = text
            }
            
            print("📥 Task \(task.taskId) content: \"\(inputText)\"")
            
            // Run AI inference using async/await
            Task.detached {
                await self.runAIInference(workerId: workerId, taskId: task.taskId, inputText: inputText)
            }
            
        }.resume()
    }
    
    private func runAIInference(workerId: Int, taskId: String, inputText: String) async {
        guard let chatService = self.chatService else {
            print("❌ Chat service not available")
            completeProcessing(workerId: workerId)
            return
        }
        
        print("🤖 Worker \(workerId) running AI inference on: \"\(inputText)\"")
        
        // Clear previous messages
        await MainActor.run {
            chatService.clearChat()
        }
        
        // Create classification prompt
        let prompt = """
        Classify this text as SAFE or UNSAFE based on hate speech, violence, or harmful content.
        Respond with ONLY the word "SAFE" or "UNSAFE" - nothing else.
        
        Text: "\(inputText)"
        
        Classification:
        """
        
        // Send to Gemma model
        await chatService.sendMessage(prompt)
        
        // Wait for response to complete
        var attempts = 0
        while attempts < 30 {
            let isGenerating = await MainActor.run {
                chatService.isGenerating
            }
            if !isGenerating {
                break
            }
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s
            attempts += 1
        }
        
        // Get classification from response
        let response = await MainActor.run {
            chatService.messages.last?.content ?? "SAFE"
        }
        
        let classification: String
        if response.uppercased().contains("UNSAFE") {
            classification = "unsafe"
        } else {
            classification = "safe"
        }
        
        print("📊 AI Classification: \(classification)")
        
        // Complete the task on blockchain
        await completeTask(workerId: workerId, taskId: taskId, classification: classification)
    }
    
    private func completeTask(workerId: Int, taskId: String, classification: String) async {
        guard let url = URL(string: "\(apiBaseURL)/workers/\(workerId)/complete-task") else {
            print("❌ Invalid URL for completing task")
            completeProcessing(workerId: workerId)
            return
        }
        
        print("📤 Worker \(workerId) submitting result for task \(taskId): \(classification)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["taskId": taskId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode(TaskCompletionResponse.self, from: data)
            
            print("✅ Task \(taskId) completed! Bounty: \(response.bountyEarned) wSAGA")
            print("   Worker \(workerId) balance: \(response.newBalance) wSAGA")
            print("   TX: \(response.txHash)")
            
            await MainActor.run {
                self.statusMessage = "Worker \(workerId) earned \(response.bountyEarned) wSAGA!"
                self.completeProcessing(workerId: workerId)
                
                // Refresh workers to update balances
                self.fetchWorkers()
                
                // Immediately check for more tasks
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.fetchAvailableTasks()
                }
            }
        } catch {
            print("❌ Error completing task: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Failed to complete task: \(error.localizedDescription)"
                self.completeProcessing(workerId: workerId)
            }
        }
    }
    
    private func completeProcessing(workerId: Int) {
        DispatchQueue.main.async {
            self.processingWorkers.remove(workerId)
            self.currentTasks.removeValue(forKey: workerId)
        }
    }
    
    deinit {
        stopPolling()
    }
}
