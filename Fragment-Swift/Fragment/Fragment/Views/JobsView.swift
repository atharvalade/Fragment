import SwiftUI

struct JobsView: View {
    @StateObject private var workerService = WorkerService()
    @StateObject private var chatService = ChatService()
    @Environment(\.openWindow) private var openWindow
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
            
            // Main content
            ScrollView {
                VStack(spacing: 20) {
                    // Status Card
                    statusCard
                    
                    // Earnings Card
                    earningsCard
                    
                    // Available Tasks
                    if !workerService.availableTasks.isEmpty {
                        availableTasksSection
                    }
                }
                .padding()
            }
        }
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
            
            // Add Worker Button
            Button(action: {
                openWindow(id: "worker", value: UUID().uuidString)
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 14))
                    Text("Open Worker Window")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.blue)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }
    
    // MARK: - Status Card
    
    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                Text("Worker Status")
                    .font(.headline)
            } icon: {
                Image(systemName: workerService.activeWorkers.isEmpty ? "circle" : "checkmark.circle.fill")
                    .foregroundColor(workerService.activeWorkers.isEmpty ? .gray : .green)
            }
            
            HStack(spacing: 20) {
                statItem(label: "Total Workers", value: "\(workerService.workers.count)", color: .blue)
                statItem(label: "Active", value: "\(workerService.activeWorkers.count)", color: .green)
                statItem(label: "Available Tasks", value: "\(workerService.availableTasks.count)", color: .orange)
            }
            
            if let error = workerService.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.top, 4)
            }
        }
        .padding()
        .background(Color(nsColor: .textBackgroundColor))
        .cornerRadius(12)
    }
    
    private func statItem(label: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
    }
    
    // MARK: - Earnings Card
    
    private var earningsCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Total wSAGA Earned")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    let totalEarned = workerService.workers.reduce(0.0) { $0 + $1.balance.wsaga }
                    Text(String(format: "%.3f", totalEarned))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.green)
                    Text("wSAGA")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Image(systemName: "dollarsign.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.green.opacity(0.3))
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.green.opacity(0.1), Color.green.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.green.opacity(0.2), lineWidth: 1)
        )
    }
    
    // MARK: - Available Tasks Section
    
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
    
    private func taskRow(_ task: WorkerTask) -> some View {
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

