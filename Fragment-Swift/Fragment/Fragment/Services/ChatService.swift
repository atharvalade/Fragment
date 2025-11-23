import Foundation
import Combine

struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let role: Role
    var content: String
    let timestamp: Date
    
    enum Role: String {
        case user
        case assistant
    }
}

class ChatService: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isGenerating = false
    @Published var currentStreamingMessage: String = ""
    
    private let serverURL = "http://127.0.0.1:8080/v1/chat/completions"
    
    func sendMessage(_ text: String) async {
        // Add user message
        let userMessage = ChatMessage(role: .user, content: text, timestamp: Date())
        await MainActor.run {
            messages.append(userMessage)
            isGenerating = true
            currentStreamingMessage = ""
        }
        
        // Prepare request
        let requestBody: [String: Any] = [
            "messages": messages.map { ["role": $0.role.rawValue, "content": $0.content] },
            "stream": true,
            "max_tokens": 512
        ]
        
        guard let url = URL(string: serverURL),
              let httpBody = try? JSONSerialization.data(withJSONObject: requestBody) else {
            await MainActor.run {
                isGenerating = false
            }
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = httpBody
        
        do {
            let (bytes, _) = try await URLSession.shared.bytes(for: request)
            
            var fullResponse = ""
            
            for try await line in bytes.lines {
                // Server-sent events format: "data: {...}"
                if line.hasPrefix("data: ") {
                    let jsonString = String(line.dropFirst(6))
                    
                    if jsonString == "[DONE]" {
                        break
                    }
                    
                    if let data = jsonString.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let choices = json["choices"] as? [[String: Any]],
                       let firstChoice = choices.first,
                       let delta = firstChoice["delta"] as? [String: Any],
                       let content = delta["content"] as? String {
                        
                        fullResponse += content
                        
                        await MainActor.run {
                            currentStreamingMessage = fullResponse
                        }
                    }
                }
            }
            
            // Add assistant message
            await MainActor.run {
                let assistantMessage = ChatMessage(role: .assistant, content: fullResponse, timestamp: Date())
                messages.append(assistantMessage)
                isGenerating = false
                currentStreamingMessage = ""
            }
            
        } catch {
            print("❌ Chat error: \(error)")
            await MainActor.run {
                isGenerating = false
                currentStreamingMessage = ""
            }
        }
    }
    
    func clearChat() {
        messages.removeAll()
        currentStreamingMessage = ""
    }
}

