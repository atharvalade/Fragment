//
//  ContentView.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var monitor = SystemMonitor()
    @State private var selectedTab: Tab = .monitoring
    @State private var selectedMonitoringTab = 0  // For monitoring sub-navigation
    @State private var timeRange = "1m"
    
    enum Tab: String, CaseIterable {
        case monitoring = "Monitoring"
        case chat = "AI Chat"
        case jobs = "Jobs"
    }
    
    var body: some View {
        NavigationSplitView(columnVisibility: .constant(.all)) {
            // Sidebar
            List(Tab.allCases, id: \.self, selection: $selectedTab) { tab in
                Label(tab.rawValue, systemImage: tab == .monitoring ? "chart.xyaxis.line" : tab == .chat ? "sparkles" : "cpu")
            }
            .navigationTitle("Fragment")
            .frame(minWidth: 200)
        } detail: {
            Group {
                if selectedTab == .monitoring {
                    monitoringView
                } else if selectedTab == .chat {
                    ChatView()
                } else {
                    JobsView()
                }
            }
        }
    }
    
    private var monitoringView: some View {
        NavigationSplitView {
            // Sidebar
            VStack(spacing: 0) {
                // App Header with gradient
                VStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.1, green: 0.5, blue: 1.0),
                                        Color(red: 0.5, green: 0.2, blue: 1.0),
                                        Color(red: 0.8, green: 0.1, blue: 0.8)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 60, height: 60)
                            .shadow(color: Color.blue.opacity(0.4), radius: 15, x: 0, y: 8)
                        
                        Image(systemName: "waveform.path.ecg")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.white, .white.opacity(0.9)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    
                    VStack(spacing: 4) {
                        Text("Fragment")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                        Text("System Monitor")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 24)
                
                Divider()
                    .padding(.bottom, 8)
                
                // Navigation Items
                List(selection: $selectedMonitoringTab) {
                    Section {
                        NavigationLink(value: 0) {
                            Label {
                                Text("Dashboard")
                                    .font(.system(size: 13, weight: .medium))
                            } icon: {
                                Image(systemName: "square.grid.2x2.fill")
                                    .foregroundStyle(.blue)
                            }
                        }
                        .tag(0)
                        
                        NavigationLink(value: 1) {
                            Label {
                                Text("CPU")
                                    .font(.system(size: 13, weight: .medium))
                            } icon: {
                                Image(systemName: "cpu.fill")
                                    .foregroundStyle(.blue)
                            }
                        }
                        .tag(1)
                        
                        NavigationLink(value: 2) {
                            Label {
                                Text("Memory")
                                    .font(.system(size: 13, weight: .medium))
                            } icon: {
                                Image(systemName: "memorychip.fill")
                                    .foregroundStyle(.purple)
                            }
                        }
                        .tag(2)
                        
                        NavigationLink(value: 3) {
                            Label {
                                Text("GPU")
                                    .font(.system(size: 13, weight: .medium))
                            } icon: {
                                Image(systemName: "display.2")
                                    .foregroundStyle(.green)
                            }
                        }
                        .tag(3)
                    } header: {
                        Text("PERFORMANCE")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                }
                .listStyle(.sidebar)
                
                Spacer()
                
                // Footer with live indicator
                VStack(spacing: 12) {
                    Divider()
                    
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 10, height: 10)
                            
                            Circle()
                                .fill(Color.green)
                                .frame(width: 10, height: 10)
                                .blur(radius: 4)
                                .opacity(0.8)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Live Monitoring")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            Text("Updates every 2s")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.green.opacity(0.08))
                    .cornerRadius(12)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
                }
            }
            .frame(minWidth: 240, idealWidth: 260)
            .background(Color(nsColor: .windowBackgroundColor))
            
        } detail: {
            // Main Content
            ScrollView {
                VStack(spacing: 28) {
                    // Header
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(selectedMonitoringTab == 0 ? "Performance Dashboard" :
                                 selectedMonitoringTab == 1 ? "CPU Analytics" :
                                 selectedMonitoringTab == 2 ? "Memory Analytics" : "GPU Analytics")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                            
                            Text("Real-time system metrics and insights")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        HStack(spacing: 12) {
                            // Time range selector
                            HStack(spacing: 0) {
                                ForEach(["1m", "5m", "15m"], id: \.self) { range in
                                    Button(action: { timeRange = range }) {
                                        Text(range)
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(timeRange == range ? .white : .secondary)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(timeRange == range ? Color.blue : Color.clear)
                                            .cornerRadius(8)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(4)
                            .background(Color(nsColor: .controlBackgroundColor))
                            .cornerRadius(10)
                            
                            Button(action: {}) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.primary)
                                    .frame(width: 36, height: 36)
                                    .background(Color(nsColor: .controlBackgroundColor))
                                    .cornerRadius(10)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 36)
                    .padding(.top, 32)
                    
                    // Content based on selected tab
                    if selectedMonitoringTab == 0 {
                        dashboardContent
                    } else if selectedMonitoringTab == 1 {
                        cpuDetailContent
                    } else if selectedMonitoringTab == 2 {
                        memoryDetailContent
                    } else {
                        gpuDetailContent
                    }
                }
                .padding(.bottom, 36)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(nsColor: .windowBackgroundColor))
        }
        .navigationSplitViewStyle(.balanced)
    }
    
    // MARK: - Dashboard Content
    
    var dashboardContent: some View {
        VStack(spacing: 24) {
            // Main performance cards
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 24),
                GridItem(.flexible(), spacing: 24)
            ], spacing: 24) {
                PremiumMetricCard(
                    title: "CPU USAGE",
                    icon: "cpu.fill",
                    value: monitor.cpuUsage,
                    subtitle: "%",
                    percentage: monitor.cpuUsage,
                    history: monitor.cpuHistory,
                    accentColor: Color(red: 0.2, green: 0.6, blue: 1.0),
                    secondaryMetrics: [
                        ("Cores", "\(ProcessInfo.processInfo.processorCount)"),
                        ("Threads", "\(ProcessInfo.processInfo.activeProcessorCount)")
                    ]
                )
                
                PremiumMetricCard(
                    title: "MEMORY",
                    icon: "memorychip.fill",
                    value: monitor.memoryUsed,
                    subtitle: "GB",
                    percentage: monitor.memoryUsage,
                    history: monitor.memoryHistory,
                    accentColor: Color(red: 0.7, green: 0.3, blue: 1.0),
                    secondaryMetrics: [
                        ("Total", String(format: "%.1f GB", monitor.memoryTotal)),
                        ("Available", String(format: "%.1f GB", monitor.memoryTotal - monitor.memoryUsed))
                    ]
                )
            }
            
            // GPU card (full width)
            PremiumMetricCard(
                title: "GPU USAGE",
                icon: "display.2",
                value: monitor.gpuUsage,
                subtitle: "%",
                percentage: monitor.gpuUsage,
                history: monitor.gpuHistory,
                accentColor: Color(red: 0.2, green: 0.9, blue: 0.6),
                secondaryMetrics: [
                    ("Device", String(format: "%.0f%%", monitor.gpuUsage)),
                    ("Renderer", String(format: "%.0f%%", monitor.gpuRendererUsage)),
                    ("Memory", String(format: "%.1f GB", monitor.gpuMemoryUsed))
                ]
            )
            
            // Quick stats grid
            VStack(alignment: .leading, spacing: 16) {
                Text("System Information")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 16),
                    GridItem(.flexible(), spacing: 16),
                    GridItem(.flexible(), spacing: 16)
                ], spacing: 16) {
                    CompactMetricWidget(
                        icon: "desktopcomputer",
                        label: "Device",
                        value: "Mac",
                        trend: 0,
                        color: .blue
                    )
                    
                    CompactMetricWidget(
                        icon: "clock.fill",
                        label: "Uptime",
                        value: formatUptime(ProcessInfo.processInfo.systemUptime),
                        trend: 0,
                        color: .orange
                    )
                    
                    CompactMetricWidget(
                        icon: "bolt.fill",
                        label: "Performance",
                        value: monitor.cpuUsage < 50 ? "Good" : "High",
                        trend: monitor.cpuUsage - 50,
                        color: monitor.cpuUsage < 50 ? .green : .orange
                    )
                }
            }
        }
        .padding(.horizontal, 36)
    }
    
    // MARK: - CPU Detail Content
    
    var cpuDetailContent: some View {
        VStack(spacing: 24) {
            PremiumMetricCard(
                title: "CPU USAGE",
                icon: "cpu.fill",
                value: monitor.cpuUsage,
                subtitle: "%",
                percentage: monitor.cpuUsage,
                history: monitor.cpuHistory,
                accentColor: Color(red: 0.2, green: 0.6, blue: 1.0),
                secondaryMetrics: [
                    ("Current", String(format: "%.1f%%", monitor.cpuUsage)),
                    ("Cores", "\(ProcessInfo.processInfo.processorCount)"),
                    ("Active", "\(ProcessInfo.processInfo.activeProcessorCount)")
                ]
            )
            
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                CompactMetricWidget(
                    icon: "chart.bar.fill",
                    label: "Load Average",
                    value: String(format: "%.1f%%", monitor.cpuUsage),
                    trend: monitor.cpuUsage - 50,
                    color: .blue
                )
                
                CompactMetricWidget(
                    icon: "bolt.circle.fill",
                    label: "Status",
                    value: monitor.cpuUsage < 70 ? "Normal" : "High",
                    trend: 0,
                    color: monitor.cpuUsage < 70 ? .green : .orange
                )
            }
        }
        .padding(.horizontal, 36)
    }
    
    // MARK: - Memory Detail Content
    
    var memoryDetailContent: some View {
        VStack(spacing: 24) {
            PremiumMetricCard(
                title: "MEMORY USAGE",
                icon: "memorychip.fill",
                value: monitor.memoryUsed,
                subtitle: "GB",
                percentage: monitor.memoryUsage,
                history: monitor.memoryHistory,
                accentColor: Color(red: 0.7, green: 0.3, blue: 1.0),
                secondaryMetrics: [
                    ("Used", String(format: "%.2f GB", monitor.memoryUsed)),
                    ("Total", String(format: "%.1f GB", monitor.memoryTotal)),
                    ("Available", String(format: "%.2f GB", monitor.memoryTotal - monitor.memoryUsed))
                ]
            )
            
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                CompactMetricWidget(
                    icon: "square.stack.3d.up.fill",
                    label: "Memory Pressure",
                    value: monitor.memoryUsage < 70 ? "Low" : "High",
                    trend: 0,
                    color: monitor.memoryUsage < 70 ? .green : .red
                )
                
                CompactMetricWidget(
                    icon: "memorychip",
                    label: "Swap Used",
                    value: "0 GB",
                    trend: 0,
                    color: .indigo
                )
            }
        }
        .padding(.horizontal, 36)
    }
    
    // MARK: - GPU Detail Content
    
    var gpuDetailContent: some View {
        VStack(spacing: 24) {
            PremiumMetricCard(
                title: "GPU DEVICE USAGE",
                icon: "display.2",
                value: monitor.gpuUsage,
                subtitle: "%",
                percentage: monitor.gpuUsage,
                history: monitor.gpuHistory,
                accentColor: Color(red: 0.2, green: 0.9, blue: 0.6),
                secondaryMetrics: [
                    ("Device", String(format: "%.0f%%", monitor.gpuUsage)),
                    ("Renderer", String(format: "%.0f%%", monitor.gpuRendererUsage)),
                    ("Tiler", String(format: "%.0f%%", monitor.gpuTilerUsage))
                ]
            )
            
            // GPU breakdown
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                CompactMetricWidget(
                    icon: "cpu",
                    label: "Renderer",
                    value: String(format: "%.0f%%", monitor.gpuRendererUsage),
                    trend: 0,
                    color: .green
                )
                
                CompactMetricWidget(
                    icon: "grid",
                    label: "Tiler",
                    value: String(format: "%.0f%%", monitor.gpuTilerUsage),
                    trend: 0,
                    color: .mint
                )
                
                CompactMetricWidget(
                    icon: "memorychip",
                    label: "GPU Memory",
                    value: String(format: "%.1f GB", monitor.gpuMemoryUsed),
                    trend: 0,
                    color: .cyan
                )
            }
            
            // Info card explaining GPU usage
            GlassCard {
                HStack(spacing: 12) {
                    Image(systemName: "info.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.blue)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("About GPU Usage")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        Text("macOS constantly uses GPU for UI rendering, animations, and window compositing. Even at \"idle\", the GPU handles WindowServer, desktop effects, and this app's interface.")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    
                    Spacer()
                }
                .padding(16)
            }
        }
        .padding(.horizontal, 36)
    }
    
    // MARK: - Helper Functions
    
    func formatUptime(_ seconds: TimeInterval) -> String {
        let days = Int(seconds) / 86400
        let hours = (Int(seconds) % 86400) / 3600
        
        if days > 0 {
            return "\(days)d \(hours)h"
        } else if hours > 0 {
            return "\(hours)h"
        } else {
            return "<1h"
        }
    }
}

#Preview {
    ContentView()
}
