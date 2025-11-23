//
//  SystemMonitor.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import Foundation
import Combine
import IOKit
import IOKit.ps

class SystemMonitor: ObservableObject {
    @Published var cpuUsage: Double = 0.0
    @Published var cpuHistory: [Double] = Array(repeating: 0, count: 60)
    
    @Published var memoryUsage: Double = 0.0
    @Published var memoryUsed: Double = 0.0
    @Published var memoryTotal: Double = 0.0
    @Published var memoryHistory: [Double] = Array(repeating: 0, count: 60)
    
    @Published var gpuUsage: Double = 0.0
    @Published var gpuHistory: [Double] = Array(repeating: 0, count: 60)
    @Published var gpuRendererUsage: Double = 0.0
    @Published var gpuTilerUsage: Double = 0.0
    @Published var gpuMemoryUsed: Double = 0.0
    @Published var gpuMemoryAllocated: Double = 0.0
    
    private var timer: Timer?
    private var previousCPUInfo: host_cpu_load_info?
    
    init() {
        startMonitoring()
    }
    
    func startMonitoring() {
        updateMetrics()
        // Update every 2 seconds instead of 1 to reduce CPU load
        timer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.updateMetrics()
        }
    }
    
    func stopMonitoring() {
        timer?.invalidate()
        timer = nil
    }
    
    private func updateMetrics() {
        updateCPU()
        updateMemory()
        updateGPU()
    }
    
    // MARK: - CPU Monitoring
    
    private func updateCPU() {
        var size = mach_msg_type_number_t(MemoryLayout<host_cpu_load_info_data_t>.size / MemoryLayout<integer_t>.size)
        var cpuLoadInfo = host_cpu_load_info_data_t()
        
        let result = withUnsafeMutablePointer(to: &cpuLoadInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(size)) {
                host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &size)
            }
        }
        
        if result == KERN_SUCCESS {
            if let previous = previousCPUInfo {
                let userDiff = Double(cpuLoadInfo.cpu_ticks.0 - previous.cpu_ticks.0)
                let systemDiff = Double(cpuLoadInfo.cpu_ticks.1 - previous.cpu_ticks.1)
                let idleDiff = Double(cpuLoadInfo.cpu_ticks.2 - previous.cpu_ticks.2)
                let niceDiff = Double(cpuLoadInfo.cpu_ticks.3 - previous.cpu_ticks.3)
                
                let totalDiff = userDiff + systemDiff + idleDiff + niceDiff
                
                if totalDiff > 0 {
                    let usage = ((userDiff + systemDiff) / totalDiff) * 100.0
                    DispatchQueue.main.async {
                        self.cpuUsage = usage
                        self.cpuHistory.removeFirst()
                        self.cpuHistory.append(usage)
                    }
                }
            }
            previousCPUInfo = cpuLoadInfo
        }
    }
    
    // MARK: - Memory Monitoring
    
    private func updateMemory() {
        var size = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)
        var vmStats = vm_statistics64_data_t()
        
        let result = withUnsafeMutablePointer(to: &vmStats) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(size)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &size)
            }
        }
        
        if result == KERN_SUCCESS {
            let pageSize = Double(vm_kernel_page_size)
            
            let active = Double(vmStats.active_count) * pageSize
            let wired = Double(vmStats.wire_count) * pageSize
            let compressed = Double(vmStats.compressor_page_count) * pageSize
            
            let used = active + wired + compressed
            let total = Double(ProcessInfo.processInfo.physicalMemory)
            let usage = (used / total) * 100.0
            
            DispatchQueue.main.async {
                self.memoryUsage = usage
                self.memoryUsed = used / 1_073_741_824 // Convert to GB
                self.memoryTotal = total / 1_073_741_824
                self.memoryHistory.removeFirst()
                self.memoryHistory.append(usage)
            }
        }
    }
    
    // MARK: - GPU Monitoring
    
    private func updateGPU() {
        let stats = getGPUUsage()
        
        DispatchQueue.main.async {
            self.gpuUsage = stats.deviceUtilization
            self.gpuRendererUsage = stats.rendererUtilization
            self.gpuTilerUsage = stats.tilerUtilization
            self.gpuMemoryUsed = stats.memoryUsed
            self.gpuMemoryAllocated = stats.memoryAllocated
            self.gpuHistory.removeFirst()
            self.gpuHistory.append(stats.deviceUtilization)
        }
    }
    
    private func getGPUUsage() -> (deviceUtilization: Double, rendererUtilization: Double, tilerUtilization: Double, memoryUsed: Double, memoryAllocated: Double) {
        var iterator: io_iterator_t = 0
        var deviceUtil: Double = 0.0
        var rendererUtil: Double = 0.0
        var tilerUtil: Double = 0.0
        var memoryUsed: Double = 0.0
        var memoryAllocated: Double = 0.0
        
        let matchingDict = IOServiceMatching("IOAccelerator")
        
        guard IOServiceGetMatchingServices(kIOMainPortDefault, matchingDict, &iterator) == KERN_SUCCESS else {
            return (0.0, 0.0, 0.0, 0.0, 0.0)
        }
        
        defer { IOObjectRelease(iterator) }
        
        var device = IOIteratorNext(iterator)
        var deviceCount = 0
        
        while device != 0 {
            defer { IOObjectRelease(device) }
            
            if let stats = IORegistryEntryCreateCFProperty(device, "PerformanceStatistics" as CFString, kCFAllocatorDefault, 0) {
                if let statsDict = stats.takeRetainedValue() as? [String: Any] {
                    // Get Device Utilization
                    if let util = statsDict["Device Utilization %"] as? Int {
                        deviceUtil += Double(util)
                    }
                    
                    // Get Renderer Utilization
                    if let util = statsDict["Renderer Utilization %"] as? Int {
                        rendererUtil += Double(util)
                    }
                    
                    // Get Tiler Utilization
                    if let util = statsDict["Tiler Utilization %"] as? Int {
                        tilerUtil += Double(util)
                    }
                    
                    // Get Memory Usage (in bytes, convert to GB)
                    if let memory = statsDict["In use system memory"] as? Int {
                        memoryUsed += Double(memory) / 1_073_741_824.0
                    }
                    
                    if let memory = statsDict["Alloc system memory"] as? Int {
                        memoryAllocated += Double(memory) / 1_073_741_824.0
                    }
                    
                    deviceCount += 1
                }
            }
            
            device = IOIteratorNext(iterator)
        }
        
        // Average across all GPU devices if multiple exist
        if deviceCount > 0 {
            deviceUtil /= Double(deviceCount)
            rendererUtil /= Double(deviceCount)
            tilerUtil /= Double(deviceCount)
            memoryUsed /= Double(deviceCount)
            memoryAllocated /= Double(deviceCount)
        }
        
        // Clamp percentages to 0-100 range
        return (
            min(max(deviceUtil, 0.0), 100.0),
            min(max(rendererUtil, 0.0), 100.0),
            min(max(tilerUtil, 0.0), 100.0),
            memoryUsed,
            memoryAllocated
        )
    }
    
    deinit {
        stopMonitoring()
    }
}

