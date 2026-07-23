import ActivityKit
import Foundation

@available(iOS 16.2, *)
struct PloggingLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var calories: Int
    var distanceMeters: Double
    var elapsedSeconds: Int
    var isPaused: Bool
    var stepCount: Int
    var timerStartedAt: Date
  }

  var modeLabel: String
}
