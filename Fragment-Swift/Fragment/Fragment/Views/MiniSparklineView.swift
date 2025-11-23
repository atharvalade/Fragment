//
//  MiniSparklineView.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct MiniSparklineView: View {
    let data: [Double]
    let color: Color
    let maxValue: Double
    
    var body: some View {
        GeometryReader { geometry in
            Path { path in
                guard data.count > 1 else { return }
                
                let stepX = geometry.size.width / CGFloat(data.count - 1)
                let stepY = geometry.size.height / CGFloat(maxValue)
                
                path.move(to: CGPoint(
                    x: 0,
                    y: geometry.size.height - CGFloat(data[0]) * stepY
                ))
                
                for index in 1..<data.count {
                    let x = CGFloat(index) * stepX
                    let y = geometry.size.height - CGFloat(data[index]) * stepY
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            }
            .stroke(
                LinearGradient(
                    colors: [color.opacity(0.7), color],
                    startPoint: .leading,
                    endPoint: .trailing
                ),
                lineWidth: 2
            )
            .shadow(color: color.opacity(0.3), radius: 2)
        }
    }
}

