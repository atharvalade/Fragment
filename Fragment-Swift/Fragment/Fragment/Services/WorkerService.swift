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

struct Task: Identifiable, Codable {
    var id: String { taskId }
    let taskId: String
    let jobId: String
    let status: String
    let pieceCid: String
    let assignedWorker: String
    let bounty: String
}

struct AvailableTasksResponse: Codable {
    let tasks: [Task]
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

// MARK: - Worker Service

class WorkerService: ObservableObject {
    @Published var workers: [Worker] = []
    @Published var activeWorkers: Set<Int> = []
    @Published var availableTasks: [Task] = []
    @Published var currentTasks: [Int: Task] = [:] // workerId -> current task
    @Published var statusMessage = "Ready to start workers"
    @Published var errorMessage: String? = nil
    
    private let apiBaseURL = "http://localhost:3001/api"
    private var pollingTimer: Timer?
    private var chatService: ChatService?
    
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
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            self?.fetchAvailableTasks()
            self?.fetchWorkers() // Also refresh worker balances
        }
        
        // Initial fetch
        fetchAvailableTasks()
    }
    
    private func stopPolling() {
        print("⏹️ Stopping task polling")
        pollingTimer?.invalidate()
        pollingTimer = nil
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
                        if self.currentTasks[workerId] == nil {
                            // Worker is idle, find a task for them
                            if let availableTask = tasksResponse.tasks.first(where: { task in
                                task.status == "Assigned" && 
                                task.assignedWorker == self.workers.first(where: { $0.id == workerId })?.address
                            }) {
                                print("🎯 Auto-assigning task \(availableTask.taskId) to worker \(workerId)")
                                self.processTask(workerId: workerId, task: availableTask)
                            }
                        }
                    }
                }
            } catch {
                print("❌ Error decoding tasks: \(error)")
            }
        }.resume()
    }
    
    // MARK: - Task Processing
    
    private func processTask(workerId: Int, task: Task) {
        DispatchQueue.main.async {
            self.currentTasks[workerId] = task
            self.statusMessage = "Worker \(workerId) processing task \(task.taskId)"
        }
        
        print("⚙️  Worker \(workerId) processing task \(task.taskId)...")
        
        // Simulate AI processing (1 second)
        DispatchQueue.global().asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self = self else { return }
            
            // Complete the task
            self.completeTask(workerId: workerId, taskId: task.taskId)
        }
    }
    
    private func completeTask(workerId: Int, taskId: String) {
        guard let url = URL(string: "\(apiBaseURL)/workers/\(workerId)/complete-task") else {
            print("❌ Invalid URL for completing task")
            return
        }
        
        print("📤 Worker \(workerId) completing task \(taskId)...")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["taskId": taskId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error completing task: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to complete task: \(error.localizedDescription)"
                    self.currentTasks.removeValue(forKey: workerId)
                }
                return
            }
            
            guard let data = data else {
                print("❌ No data received when completing task")
                return
            }
            
            do {
                let response = try JSONDecoder().decode(TaskCompletionResponse.self, from: data)
                
                print("✅ Task \(taskId) completed! Bounty: \(response.bountyEarned) wSAGA")
                print("   TX: \(response.txHash)")
                print("   New balance: \(response.newBalance) wSAGA")
                
                DispatchQueue.main.async {
                    self.currentTasks.removeValue(forKey: workerId)
                    self.statusMessage = "Worker \(workerId) earned \(response.bountyEarned) wSAGA!"
                    
                    // Refresh workers to update balances
                    self.fetchWorkers()
                    
                    // Fetch available tasks again
                    self.fetchAvailableTasks()
                }
            } catch {
                print("❌ Error decoding completion response: \(error)")
                DispatchQueue.main.async {
                    self.currentTasks.removeValue(forKey: workerId)
                }
            }
        }.resume()
    }
    
    deinit {
        stopPolling()
    }
}
