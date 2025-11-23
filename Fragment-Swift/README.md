# Fragment - macOS Worker App

A native macOS application for distributed compute work using AI inference.

## Features

- **System Monitoring**: Real-time CPU, Memory, and GPU monitoring with beautiful visualizations
- **AI Chat**: Local Gemma 3 4B model inference for natural language processing
- **Distributed Workers**: Multiple worker instances for parallel fragment processing
- **SAGA Integration**: Blockchain-based job management on SAGA chainlet
- **Filecoin Storage**: Decentralized storage for job data and results
- **Hyperlane Bridge**: Cross-chain messaging for seamless interoperability

## Tech Stack

- **Frontend**: SwiftUI native macOS app
- **AI Model**: Gemma 3 4B (quantized q4_0)
- **Inference**: llama.cpp server
- **Blockchain**: SAGA (custom chainlet)
- **Storage**: Filecoin (decentralized data)
- **Bridge**: Hyperlane (cross-chain messaging)

## Setup

### Prerequisites

1. **macOS 14.0+** (Sonoma or later)
2. **Xcode 15.0+**
3. **llama-server binary** (from llama.cpp)
4. **Gemma 3 4B model** (`gemma-3-4b-it-q4_0.gguf`)

### Installation

1. Clone the repository
2. Place the following files in `Fragment/Fragment/`:
   - `llama-server` (executable binary)
   - `gemma-3-4b-it-q4_0.gguf` (model file)
3. Open `Fragment.xcodeproj` in Xcode
4. Build and run (⌘R)

### Model Setup

The app requires the Gemma 3 4B model. Download it from:
- [Google Gemma Models](https://www.kaggle.com/models/google/gemma)
- Or build llama.cpp and download the model yourself

## Architecture

### Services

- **SystemMonitor**: Real-time hardware metrics monitoring
- **ChatService**: Streaming chat interface with Gemma model
- **LlamaServerManager**: Local inference server lifecycle management
- **WorkerService**: Distributed task processing and blockchain interaction

### Views

- **ContentView**: Main navigation and system monitoring dashboard
- **ChatView**: AI chat interface with streaming responses
- **JobsView**: Worker management and job status
- **WorkerWindow**: Individual worker instance window
- Various metric visualization components

## Development

Built with ❤️ for the SAGA hackathon.

### Key Technologies

- **SAGA Chainlet**: Custom blockchain for job orchestration
- **Filecoin**: Decentralized storage layer
- **Hyperlane**: Cross-chain communication protocol
- **llama.cpp**: High-performance LLM inference

## License

MIT License - see LICENSE file for details

