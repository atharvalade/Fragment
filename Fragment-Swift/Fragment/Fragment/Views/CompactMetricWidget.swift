//
//  CompactMetricWidget.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct CompactMetricWidget: View {
    let icon: String
    let label: String
    let value: String
    let trend: Double
    let color: Color
    
    @State private var isHovered = false
    
    var body: some View {
        GlassCard {
            HStack(spacing: 16) {
                // Icon - simplified
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 48, height: 48)
                    
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(color)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(label)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                    
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(value)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        
                        // Trend indicator
                        if trend != 0 {
                            HStack(spacing: 2) {
                                Image(systemName: trend > 0 ? "arrow.up.right" : "arrow.down.right")
                                    .font(.system(size: 9, weight: .bold))
                                Text(String(format: "%.0f%%", abs(trend)))
                                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                            }
                            .foregroundColor(trend > 0 ? .green : .red)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(
                                Capsule()
                                    .fill((trend > 0 ? Color.green : Color.red).opacity(0.15))
                            )
                        }
                    }
                }
                
                Spacer()
            }
            .padding(16)
        }
        .scaleEffect(isHovered ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isHovered)
        .onHover { hovering in
            isHovered = hovering
        }
    }
}

