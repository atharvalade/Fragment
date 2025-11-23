//
//  AnimatedNumberView.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

struct AnimatedNumberView: View {
    let value: Double
    let format: String
    let suffix: String
    @State private var displayValue: Double = 0
    @State private var didAppear = false
    
    var body: some View {
        Text(String(format: format, displayValue) + suffix)
            .contentTransition(.numericText(value: displayValue))
            .onChange(of: value) { oldValue, newValue in
                // Only animate updates, not initial load
                if didAppear {
                    withAnimation(.spring(response: 0.6, dampingFraction: 0.9)) {
                        displayValue = newValue
                    }
                } else {
                    displayValue = newValue
                }
            }
            .onAppear {
                displayValue = value
                // Mark as appeared after a brief moment
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    didAppear = true
                }
            }
    }
}

