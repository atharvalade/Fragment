//
//  PremiumMetricCard.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct PremiumMetricCard: View {
    let title: String
    let icon: String
    let value: Double
    let subtitle: String
    let percentage: Double
    let history: [Double]
    let accentColor: Color
    let secondaryMetrics: [(String, String)]
    
    @State private var isHovered = false
    
    var body: some View {
        GlassCard {
            VStack(spacing: 0) {
                // Header
                HStack(alignment: .center, spacing: 16) {
                    // Icon - simplified
                    ZStack {
                        Circle()
                            .fill(accentColor.opacity(0.15))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: icon)
                            .font(.system(size: 26, weight: .semibold))
                            .foregroundStyle(accentColor)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text(title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.secondary)
                        
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            AnimatedNumberView(
                                value: value,
                                format: value < 10 ? "%.2f" : "%.1f",
                                suffix: ""
                            )
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                            
                            Text(subtitle)
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(.secondary)
                                .offset(y: -2)
                        }
                    }
                    
                    Spacer()
                    
                    // Circular progress
                    CircularProgressView(
                        progress: percentage,
                        color: accentColor,
                        lineWidth: 6
                    )
                    .frame(width: 80, height: 80)
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 16)
                
                Divider()
                    .opacity(0.2)
                    .padding(.horizontal, 24)
                
                // Chart
                EnhancedLineChartView(
                    data: history,
                    color: accentColor,
                    showGradient: true,
                    showDots: false
                )
                .frame(height: 120)
                .padding(.vertical, 20)
                .padding(.horizontal, 8)
                
                // Secondary metrics
                if !secondaryMetrics.isEmpty {
                    Divider()
                        .opacity(0.2)
                        .padding(.horizontal, 24)
                    
                    HStack(spacing: 16) {
                        ForEach(Array(secondaryMetrics.enumerated()), id: \.offset) { index, metric in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(metric.0)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.secondary)
                                
                                Text(metric.1)
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(.primary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            if index < secondaryMetrics.count - 1 {
                                Divider()
                                    .opacity(0.2)
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 20)
                }
            }
        }
    }
}

