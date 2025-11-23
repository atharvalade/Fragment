//
//  EnhancedLineChartView.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct EnhancedLineChartView: View {
    let data: [Double]
    let color: Color
    let maxValue: Double
    let showGradient: Bool
    let showDots: Bool
    
    @State private var hoveredIndex: Int? = nil
    @State private var hoverLocation: CGPoint = .zero
    @State private var isHovering: Bool = false
    
    init(
        data: [Double],
        color: Color,
        maxValue: Double = 100,
        showGradient: Bool = true,
        showDots: Bool = false
    ) {
        self.data = data
        self.color = color
        self.maxValue = maxValue
        self.showGradient = showGradient
        self.showDots = showDots
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                // Background grid
                VStack(spacing: 0) {
                    ForEach(0..<5) { i in
                        HStack {
                            Text("\(Int(maxValue * (1 - Double(i) / 4)))%")
                                .font(.system(size: 9, weight: .medium, design: .rounded))
                                .foregroundColor(.secondary.opacity(0.5))
                                .frame(width: 30, alignment: .trailing)
                            
                            Divider()
                                .opacity(0.1)
                        }
                        if i < 4 {
                            Spacer()
                        }
                    }
                }
                .padding(.leading, 35)
                
                // Chart area
                HStack(spacing: 0) {
                    Spacer().frame(width: 40)
                    
                    ZStack {
                        // Gradient fill - simplified
                        if showGradient {
                            gradientPath(in: geometry)
                                .fill(color.opacity(0.1))
                                .drawingGroup() // Optimize rendering
                        }
                        
                        // Line - simplified for performance
                        linePath(in: geometry)
                            .stroke(color, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                            .drawingGroup() // Optimize rendering
                        
                        // Hover crosshair and tooltip
                        if isHovering, let index = hoveredIndex, index < data.count {
                            let point = getPoint(for: index, value: data[index], in: geometry)
                            
                            // Vertical line
                            Path { path in
                                path.move(to: CGPoint(x: point.x, y: 0))
                                path.addLine(to: CGPoint(x: point.x, y: geometry.size.height))
                            }
                            .stroke(color.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [5, 5]))
                            
                            // Horizontal line
                            Path { path in
                                path.move(to: CGPoint(x: 0, y: point.y))
                                path.addLine(to: CGPoint(x: geometry.size.width - 40, y: point.y))
                            }
                            .stroke(color.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [5, 5]))
                            
                            // Dot at intersection
                            Circle()
                                .fill(color)
                                .frame(width: 10, height: 10)
                                .position(point)
                                .shadow(color: color.opacity(0.6), radius: 6)
                            
                            Circle()
                                .stroke(Color.white, lineWidth: 2)
                                .frame(width: 10, height: 10)
                                .position(point)
                            
                            // Tooltip
                            VStack(alignment: .leading, spacing: 4) {
                                Text(String(format: "%.1f%%", data[index]))
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.primary)
                                
                                Text("\(data.count - index)s ago")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(.ultraThinMaterial)
                                    .shadow(color: .black.opacity(0.15), radius: 10, x: 0, y: 4)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .strokeBorder(color.opacity(0.3), lineWidth: 1)
                            )
                            .position(
                                x: point.x + 60 > geometry.size.width - 40 ? point.x - 60 : point.x + 60,
                                y: point.y < 50 ? point.y + 40 : point.y - 40
                            )
                            .transition(.opacity.combined(with: .scale(scale: 0.9)))
                        }
                    }
                    .contentShape(Rectangle())
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let location):
                            updateHover(at: location, in: geometry)
                        case .ended:
                            isHovering = false
                            hoveredIndex = nil
                        }
                    }
                }
            }
        }
    }
    
    private func updateHover(at location: CGPoint, in geometry: GeometryProxy) {
        let chartWidth = geometry.size.width - 40
        let adjustedX = location.x
        
        guard adjustedX >= 0 && adjustedX <= chartWidth && data.count > 1 else {
            return
        }
        
        let stepX = chartWidth / CGFloat(data.count - 1)
        let index = Int(round(adjustedX / stepX))
        
        if index >= 0 && index < data.count && index != hoveredIndex {
            isHovering = true
            hoveredIndex = index
            hoverLocation = location
        }
    }
    
    private func linePath(in geometry: GeometryProxy) -> Path {
        var path = Path()
        guard data.count > 1 else { return path }
        
        let chartWidth = geometry.size.width - 40
        let stepX = chartWidth / CGFloat(data.count - 1)
        let stepY = geometry.size.height / CGFloat(maxValue)
        
        // Start point
        let firstPoint = CGPoint(
            x: 0,
            y: geometry.size.height - CGFloat(data[0]) * stepY
        )
        path.move(to: firstPoint)
        
        // Use smooth curves instead of straight lines for more organic feel
        for index in 1..<data.count {
            let currentPoint = CGPoint(
                x: CGFloat(index) * stepX,
                y: geometry.size.height - CGFloat(data[index]) * stepY
            )
            
            if index == 1 {
                path.addLine(to: currentPoint)
            } else {
                let previousPoint = CGPoint(
                    x: CGFloat(index - 1) * stepX,
                    y: geometry.size.height - CGFloat(data[index - 1]) * stepY
                )
                
                let midPoint = CGPoint(
                    x: (previousPoint.x + currentPoint.x) / 2,
                    y: (previousPoint.y + currentPoint.y) / 2
                )
                
                path.addQuadCurve(to: midPoint, control: previousPoint)
                path.addLine(to: currentPoint)
            }
        }
        
        return path
    }
    
    private func gradientPath(in geometry: GeometryProxy) -> Path {
        var path = Path()
        guard data.count > 1 else { return path }
        
        let chartWidth = geometry.size.width - 40
        let stepX = chartWidth / CGFloat(data.count - 1)
        let stepY = geometry.size.height / CGFloat(maxValue)
        
        path.move(to: CGPoint(
            x: 0,
            y: geometry.size.height - CGFloat(data[0]) * stepY
        ))
        
        for index in 1..<data.count {
            let currentPoint = CGPoint(
                x: CGFloat(index) * stepX,
                y: geometry.size.height - CGFloat(data[index]) * stepY
            )
            
            if index == 1 {
                path.addLine(to: currentPoint)
            } else {
                let previousPoint = CGPoint(
                    x: CGFloat(index - 1) * stepX,
                    y: geometry.size.height - CGFloat(data[index - 1]) * stepY
                )
                
                let midPoint = CGPoint(
                    x: (previousPoint.x + currentPoint.x) / 2,
                    y: (previousPoint.y + currentPoint.y) / 2
                )
                
                path.addQuadCurve(to: midPoint, control: previousPoint)
                path.addLine(to: currentPoint)
            }
        }
        
        path.addLine(to: CGPoint(x: chartWidth, y: geometry.size.height))
        path.addLine(to: CGPoint(x: 0, y: geometry.size.height))
        path.closeSubpath()
        
        return path
    }
    
    private func getPoint(for index: Int, value: Double, in geometry: GeometryProxy) -> CGPoint {
        let chartWidth = geometry.size.width - 40
        let stepX = chartWidth / CGFloat(data.count - 1)
        let stepY = geometry.size.height / CGFloat(maxValue)
        
        return CGPoint(
            x: CGFloat(index) * stepX,
            y: geometry.size.height - CGFloat(value) * stepY
        )
    }
}

