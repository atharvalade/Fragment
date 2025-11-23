import SwiftUI

struct WorkerWindow: View {
    let workerId: String
    @StateObject private var workerService = WorkerService()
    @StateObject private var chatService = ChatService()
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
            
            // Main content
            ScrollView {
                VStack(spacing: 20) {
                    // Status Overview Card
                    statusOverviewCard
                    
                    // Workers List
                    workersListSection
                    
                    // Available Tasks
                    if !workerService.availableTasks.isEmpty {
                        availableTasksSection
                    }
                }
                .padding()
            }
        }
        .frame(minWidth: 900, minHeight: 700)
        .background(Color(nsColor: .controlBackgroundColor))
        .onAppear {
            workerService.setChatService(chatService)
        }
    }
    
    // MARK: - Header
    
    private var headerView: some View {
        HStack(spacing: 16) {
            // Icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: workerService.activeWorkers.isEmpty ? [Color.gray, Color.gray.opacity(0.7)] : [Color.green, Color.blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)
                
                Image(systemName: workerService.activeWorkers.isEmpty ? "bolt.slash" : "bolt.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Fragment Workers")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                HStack(spacing: 6) {
                    Circle()
                        .fill(workerService.activeWorkers.isEmpty ? Color.gray : Color.green)
                        .frame(width: 6, height: 6)
                    
                    Text(workerService.statusMessage)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Active Workers Count
            HStack(spacing: 8) {
                Text("\(workerService.activeWorkers.count)/10")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                
                Text("Active Workers")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(nsColor: .textBackgroundColor))
            .cornerRadius(8)
        }
        .padding()
    }
    
    // MARK: - Status Overview Card
    
    private var statusOverviewCard: some View {
        HStack(spacing: 20) {
            statBox(label: "Total Workers", value: "\(workerService.workers.count)", color: .blue)
            statBox(label: "Active", value: "\(workerService.activeWorkers.count)", color: .green)
            statBox(label: "Available Tasks", value: "\(workerService.availableTasks.count)", color: .orange)
            statBox(label: "Processing", value: "\(workerService.currentTasks.count)", color: .purple)
        }
        .padding()
        .background(Color(nsColor: .textBackgroundColor))
        .cornerRadius(12)
    }
    
    private func statBox(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(color)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
    
    // MARK: - Workers List
    
    private var workersListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                Text("Workers")
                    .font(.headline)
            } icon: {
                Image(systemName: "person.3.fill")
                    .foregroundColor(.blue)
            }
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(workerService.workers) { worker in
                    workerCard(worker)
                }
            }
        }
    }
    
    private func workerCard(_ worker: Worker) -> some View {
        let isActive = workerService.activeWorkers.contains(worker.id)
        let currentTask = workerService.currentTasks[worker.id]
        
        return VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("Worker #\(worker.id)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Circle()
                    .fill(isActive ? Color.green : Color.gray)
                    .frame(width: 8, height: 8)
            }
            
            // Address
            Text(worker.address.prefix(10) + "..." + worker.address.suffix(6))
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(.secondary)
            
            Divider()
            
            // Balances
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("MENT")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f", worker.balance.ment))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("wSAGA")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.3f", worker.balance.wsaga))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }
            }
            
            // Current Task
            if let task = currentTask {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        ProgressView()
                            .scaleEffect(0.6)
                        Text("Processing Task #\(task.taskId)")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 8)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(6)
            } else if isActive {
                Text("Listening for tasks...")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .italic()
                    .padding(.vertical, 6)
            }
            
            // Start/Stop Button
            Button(action: {
                if isActive {
                    workerService.stopWorker(workerId: worker.id)
                } else {
                    workerService.startWorker(workerId: worker.id)
                }
            }) {
                HStack {
                    Image(systemName: isActive ? "stop.circle" : "play.circle")
                        .font(.system(size: 11))
                    Text(isActive ? "Stop" : "Start")
                        .font(.system(size: 11, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(isActive ? Color.red : Color.green)
                .foregroundColor(.white)
                .cornerRadius(6)
            }
            .buttonStyle(.plain)
        }
        .padding()
        .background(
            LinearGradient(
                colors: isActive ? 
                    [Color.green.opacity(0.1), Color.blue.opacity(0.05)] :
                    [Color(nsColor: .textBackgroundColor), Color(nsColor: .textBackgroundColor)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isActive ? Color.green.opacity(0.3) : Color.gray.opacity(0.2), lineWidth: 1.5)
        )
    }
    
    // MARK: - Available Tasks
    
    private var availableTasksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                Text("Available Tasks")
                    .font(.headline)
            } icon: {
                Image(systemName: "tray.full")
                    .foregroundColor(.orange)
            }
            
            ForEach(workerService.availableTasks) { task in
                taskRow(task)
            }
        }
    }
    
    private func taskRow(_ task: Task) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Task #\(task.taskId)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    statusBadge(for: task.status)
                }
                
                Text("Job #\(task.jobId)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(task.pieceCid.prefix(20) + "...")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(.blue)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("+\(task.bounty) wSAGA")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
                
                if task.assignedWorker != "0x0000000000000000000000000000000000000000" {
                    Text("Assigned")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding()
        .background(Color(nsColor: .textBackgroundColor))
        .cornerRadius(10)
    }
    
    private func statusBadge(for status: String) -> some View {
        let (text, bgColor) = statusInfo(for: status)
        return Text(text)
            .font(.system(size: 9, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(bgColor)
            .cornerRadius(4)
    }
    
    private func statusInfo(for status: String) -> (String, Color) {
        switch status {
        case "Pending":
            return ("PENDING", .blue)
        case "Assigned":
            return ("ASSIGNED", .orange)
        case "Completed":
            return ("DONE", .green)
        case "Failed":
            return ("FAILED", .red)
        default:
            return (status.uppercased(), .gray)
        }
    }
}
