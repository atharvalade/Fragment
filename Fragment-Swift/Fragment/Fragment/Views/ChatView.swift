import SwiftUI

struct ChatView: View {
    @StateObject private var serverManager = LlamaServerManager()
    @StateObject private var chatService = ChatService()
    @State private var inputText = ""
    @State private var scrollProxy: ScrollViewProxy?
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with server status
            headerView
            
            Divider()
            
            // Chat messages
            if serverManager.isRunning && serverManager.serverStatus == "Running" {
                chatMessagesView
            } else {
                serverStatusView
            }
        }
        .background(Color(nsColor: .controlBackgroundColor))
        .onAppear {
            if !serverManager.isRunning {
                serverManager.startServer()
            }
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
                            colors: [Color.blue, Color.purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)
                
                Image(systemName: "sparkles")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Gemma 3 Assistant")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                HStack(spacing: 6) {
                    Circle()
                        .fill(serverManager.isRunning && serverManager.serverStatus == "Running" ? Color.green : Color.orange)
                        .frame(width: 6, height: 6)
                    
                    Text(serverManager.serverStatus)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Controls
            HStack(spacing: 12) {
                if !chatService.messages.isEmpty {
                    Button(action: { chatService.clearChat() }) {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                    .help("Clear chat")
                }
                
                Button(action: {
                    if serverManager.isRunning {
                        serverManager.stopServer()
                    } else {
                        serverManager.startServer()
                    }
                }) {
                    Image(systemName: serverManager.isRunning ? "stop.circle" : "play.circle")
                        .font(.system(size: 18))
                        .foregroundColor(serverManager.isRunning ? .red : .green)
                }
                .buttonStyle(.plain)
                .help(serverManager.isRunning ? "Stop server" : "Start server")
            }
        }
        .padding()
    }
    
    // MARK: - Server Status View
    
    private var serverStatusView: some View {
        VStack(spacing: 20) {
            Image(systemName: "cpu")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text(serverManager.serverStatus)
                .font(.title2)
                .fontWeight(.semibold)
            
            if let error = serverManager.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            } else if serverManager.serverStatus == "Starting..." {
                ProgressView()
                    .scaleEffect(0.8)
            }
            
            if !serverManager.isRunning {
                Button(action: { serverManager.startServer() }) {
                    Label("Start AI Server", systemImage: "play.circle.fill")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(
                            LinearGradient(
                                colors: [Color.blue, Color.purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(10)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Chat Messages View
    
    private var chatMessagesView: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 16) {
                        if chatService.messages.isEmpty {
                            emptyStateView
                        }
                        
                        ForEach(chatService.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                        
                        // Streaming message
                        if chatService.isGenerating && !chatService.currentStreamingMessage.isEmpty {
                            MessageBubble(
                                message: ChatMessage(
                                    role: .assistant,
                                    content: chatService.currentStreamingMessage,
                                    timestamp: Date()
                                )
                            )
                            .id("streaming")
                        }
                    }
                    .padding()
                }
                .onAppear {
                    scrollProxy = proxy
                }
                .onChange(of: chatService.messages.count) { _ in
                    scrollToBottom(proxy: proxy)
                }
                .onChange(of: chatService.currentStreamingMessage) { _ in
                    scrollToBottom(proxy: proxy)
                }
            }
            
            // Input area
            Divider()
            
            inputView
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundColor(.secondary.opacity(0.5))
            
            Text("Start a conversation")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
            
            VStack(alignment: .leading, spacing: 8) {
                suggestionChip(text: "Explain quantum computing", icon: "atom")
                suggestionChip(text: "Write a Swift function", icon: "chevron.left.forwardslash.chevron.right")
                suggestionChip(text: "Help me brainstorm ideas", icon: "lightbulb")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    private func suggestionChip(text: String, icon: String) -> some View {
        Button(action: { sendSuggestion(text) }) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                Text(text)
                    .font(.subheadline)
            }
            .foregroundColor(.secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(nsColor: .controlBackgroundColor))
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Input View
    
    private var inputView: some View {
        HStack(spacing: 12) {
            TextField("Ask anything...", text: $inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...5)
                .focused($isInputFocused)
                .onSubmit {
                    sendMessage()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color(nsColor: .textBackgroundColor))
                .cornerRadius(20)
            
            Button(action: sendMessage) {
                Image(systemName: chatService.isGenerating ? "stop.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(inputText.isEmpty && !chatService.isGenerating ? .secondary : .blue)
            }
            .buttonStyle(.plain)
            .disabled(inputText.isEmpty && !chatService.isGenerating)
        }
        .padding()
    }
    
    // MARK: - Actions
    
    private func sendMessage() {
        guard !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        let text = inputText
        inputText = ""
        
        Task {
            await chatService.sendMessage(text)
        }
    }
    
    private func sendSuggestion(_ text: String) {
        inputText = text
        sendMessage()
    }
    
    private func scrollToBottom(proxy: ScrollViewProxy) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            if chatService.isGenerating {
                withAnimation {
                    proxy.scrollTo("streaming", anchor: .bottom)
                }
            } else if let lastMessage = chatService.messages.last {
                withAnimation {
                    proxy.scrollTo(lastMessage.id, anchor: .bottom)
                }
            }
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.role == .user {
                Spacer(minLength: 80)
            }
            
            if message.role == .assistant {
                // Assistant avatar
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.blue.opacity(0.6), Color.purple.opacity(0.6)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 32, height: 32)
                    
                    Image(systemName: "sparkles")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.system(size: 14))
                    .foregroundColor(message.role == .user ? .white : .primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        message.role == .user ?
                        AnyView(
                            LinearGradient(
                                colors: [Color.blue, Color.blue.opacity(0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        ) :
                        AnyView(Color(nsColor: .textBackgroundColor))
                    )
                    .cornerRadius(16)
                    .textSelection(.enabled)
                
                Text(timeString(from: message.timestamp))
                    .font(.caption2)
                    .foregroundColor(.secondary.opacity(0.7))
                    .padding(.horizontal, 4)
            }
            
            if message.role == .assistant {
                Spacer(minLength: 80)
            }
            
            if message.role == .user {
                // User avatar
                Circle()
                    .fill(Color.secondary.opacity(0.2))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    )
            }
        }
    }
    
    private func timeString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

