//
//  FragmentApp.swift
//  Fragment
//
//  Created by Atharva Lade on 10/25/25.
//

import SwiftUI

@main
struct FragmentApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .commands {
            CommandGroup(replacing: .newItem) { }
        }
        
        // Worker windows
        WindowGroup(id: "worker", for: String.self) { $workerId in
            if let workerId = workerId {
                WorkerWindow(workerId: workerId)
            }
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
    }
}
