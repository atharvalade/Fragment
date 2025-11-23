//
//  CircularProgressView.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct CircularProgressView: View {
    let progress: Double
    let color: Color
    let lineWidth: CGFloat
    
    @State private var animatedProgress: Double = 0
    @State private var didAppear = false
    
    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(color.opacity(0.15), lineWidth: lineWidth)
            
            // Progress circle - simplified, no gradient
            Circle()
                .trim(from: 0, to: animatedProgress / 100)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            
            // Center text
            VStack(spacing: 4) {
                Text(String(format: "%.0f%%", animatedProgress))
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .contentTransition(.numericText())
            }
        }
        .padding(lineWidth / 2 + 2) // Add padding to prevent clipping
        .drawingGroup() // Optimize rendering
        .onChange(of: progress) { oldValue, newValue in
            // Only animate if we've already appeared (smooth updates)
            if didAppear {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                    animatedProgress = newValue
                }
            }
        }
        .onAppear {
            // Initial appearance animation
            withAnimation(.spring(response: 1.0, dampingFraction: 0.7).delay(0.2)) {
                animatedProgress = progress
            }
            // Mark that we've appeared so future updates are smooth
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                didAppear = true
            }
        }
    }
}

