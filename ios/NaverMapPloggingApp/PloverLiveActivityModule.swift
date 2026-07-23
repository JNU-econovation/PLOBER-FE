import ActivityKit
import Foundation
import React

@objc(PloverLiveActivityModule)
class PloverLiveActivityModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(start:resolver:rejecter:)
  func start(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(["status": "unsupported"])
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolve(["status": "disabled"])
      return
    }

    let attributes = PloggingLiveActivityAttributes(
      modeLabel: stringValue(payload["modeLabel"], fallback: "플로깅")
    )
    let state = contentState(from: payload)

    Task {
      do {
        if let current = Activity<PloggingLiveActivityAttributes>.activities.first {
          await current.update(ActivityContent(state: state, staleDate: nil))
          resolve(["id": current.id, "status": "updated"])
          return
        }

        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
        resolve(["id": activity.id, "status": "started"])
      } catch {
        reject("live_activity_start_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(update:resolver:rejecter:)
  func update(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(["status": "unsupported"])
      return
    }

    guard let activity = Activity<PloggingLiveActivityAttributes>.activities.first else {
      resolve(["status": "missing"])
      return
    }

    let state = contentState(from: payload)

    Task {
      await activity.update(ActivityContent(state: state, staleDate: nil))
      resolve(["id": activity.id, "status": "updated"])
    }
  }

  @objc(end:resolver:rejecter:)
  func end(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(["status": "unsupported"])
      return
    }

    let state = contentState(from: payload)

    Task {
      await PloverLiveActivityController.endAll(
        content: ActivityContent(state: state, staleDate: nil)
      )
      resolve(["status": "ended"])
    }
  }
}

@available(iOS 16.2, *)
enum PloverLiveActivityController {
  static func endAll(
    content: ActivityContent<PloggingLiveActivityAttributes.ContentState>? = nil
  ) async {
    for activity in Activity<PloggingLiveActivityAttributes>.activities {
      await activity.end(content, dismissalPolicy: .immediate)
    }
  }

  static func endAllBeforeTermination(timeout: TimeInterval = 2) {
    let semaphore = DispatchSemaphore(value: 0)
    Task.detached(priority: .userInitiated) {
      await endAll()
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + timeout)
  }
}

@available(iOS 16.2, *)
private func contentState(
  from payload: NSDictionary
) -> PloggingLiveActivityAttributes.ContentState {
  let elapsedSeconds = intValue(payload["elapsedSeconds"])
  return PloggingLiveActivityAttributes.ContentState(
    calories: intValue(payload["calories"]),
    distanceMeters: doubleValue(payload["distanceMeters"]),
    elapsedSeconds: elapsedSeconds,
    isPaused: boolValue(payload["isPaused"]),
    stepCount: intValue(payload["stepCount"]),
    timerStartedAt: Date().addingTimeInterval(-Double(elapsedSeconds))
  )
}

private func intValue(_ value: Any?) -> Int {
  if let value = value as? Int {
    return value
  }
  if let value = value as? NSNumber {
    return value.intValue
  }
  return 0
}

private func doubleValue(_ value: Any?) -> Double {
  if let value = value as? Double {
    return value
  }
  if let value = value as? NSNumber {
    return value.doubleValue
  }
  return 0
}

private func boolValue(_ value: Any?) -> Bool {
  if let value = value as? Bool {
    return value
  }
  if let value = value as? NSNumber {
    return value.boolValue
  }
  return false
}

private func stringValue(_ value: Any?, fallback: String) -> String {
  if let value = value as? String, !value.isEmpty {
    return value
  }
  return fallback
}
