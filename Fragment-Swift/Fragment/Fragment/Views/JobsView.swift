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
                    
                    // Available Fragments
                    if !workerService.availableFragments.isEmpty {
                        fragmentsSection(
                            title: "Available Fragments",
                            fragments: workerService.availableFragments,
                            icon: "tray.full",
                            color: .blue
                        )
                    }
                    
                    // Claimed Fragments
                    if !workerService.claimedFragments.isEmpty {
                        fragmentsSection(
                            title: "Processing",
                            fragments: workerService.claimedFragments,
                            icon: "gearshape.2",
                            color: .orange
                        )
                    }
                    
                    // Completed Fragments
                    if !workerService.completedFragments.isEmpty {
                        fragmentsSection(
                            title: "Completed",
                            fragments: workerService.completedFragments,
                            icon: "checkmark.circle",
                            color: .green
                        )
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
                            colors: workerService.isWorking ? [Color.green, Color.blue] : [Color.gray, Color.gray.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)
                
                Image(systemName: workerService.isWorking ? "bolt.fill" : "bolt.slash")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Fragment Worker")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                HStack(spacing: 6) {
                    Circle()
                        .fill(workerService.isWorking ? Color.green : Color.gray)
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
                    Text("Add Worker")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.blue)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
            
            // Start/Stop Button
            Button(action: {
                if workerService.isWorking {
                    workerService.stopWorker()
                } else {
                    workerService.startWorker()
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: workerService.isWorking ? "stop.circle" : "play.circle")
                        .font(.system(size: 14))
                    Text(workerService.isWorking ? "Stop Worker" : "Start Worker")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(workerService.isWorking ? Color.red : Color.green)
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
                Image(systemName: workerService.isWorking ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(workerService.isWorking ? .green : .gray)
            }
            
            HStack(spacing: 20) {
                statItem(label: "Available", value: "\(workerService.availableFragments.count)", color: .blue)
                statItem(label: "Processing", value: "\(workerService.claimedFragments.count)", color: .orange)
                statItem(label: "Completed", value: "\(workerService.completedFragments.count)", color: .green)
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
                Text("Wallet B Balance")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(String(format: "%.4f", workerService.usdcBalance))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.green)
                    Text("USDC")
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
    
    // MARK: - Fragments Section
    
    private func fragmentsSection(title: String, fragments: [TaskFragment], icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                Text(title)
                    .font(.headline)
            } icon: {
                Image(systemName: icon)
                    .foregroundColor(color)
            }
            
            ForEach(fragments) { fragment in
                fragmentRow(fragment, color: color)
            }
        }
    }
    
    private func fragmentRow(_ fragment: TaskFragment, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Fragment #\(fragment.fragmentIndex)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                // Status badge
                statusBadge(for: fragment.status)
                
                Text("+\(fragment.bountyAmount, specifier: "%.2f") USDC")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(6)
            }
            
            Text(fragment.data.text)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            // Show Filecoin and Hyperlane info
            if let blobId = fragment.blobId {
                HStack(spacing: 4) {
                    Image(systemName: "externaldrive.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.blue)
                    Text("Filecoin: \(String(blobId.prefix(16)))...")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(.blue)
                }
            }
            
            if let encryptionId = fragment.encryptionId {
                HStack(spacing: 4) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.purple)
                    Text("Hyperlane: \(String(encryptionId.prefix(16)))...")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(.purple)
                }
            }
            
            // Only show processing indicator for claimed fragments (not completed)
            if fragment.status == "claimed" {
                HStack(spacing: 4) {
                    ProgressView()
                        .scaleEffect(0.7)
                    Text("Processing with Gemma...")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
            }
            
            // Show result info for completed fragments
            if fragment.status == "completed", let result = fragment.result {
                if let resultBlobId = result.blobId {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.green)
                        Text("Result: \(String(resultBlobId.prefix(16)))...")
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundColor(.green)
                    }
                }
            }
        }
        .padding()
        .background(Color(nsColor: .textBackgroundColor))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
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
        case "pending":
            return ("PENDING", .blue)
        case "claimed":
            return ("CLAIMED", .orange)
        case "completed":
            return ("DONE", .green)
        case "failed":
            return ("FAILED", .red)
        default:
            return (status.uppercased(), .gray)
        }
    }
}

