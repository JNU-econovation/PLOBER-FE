import ActivityKit
import SwiftUI
import WidgetKit

private extension Color {
  init(hex: UInt, opacity: Double = 1) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: opacity
    )
  }
}

private enum PloverLiveActivityDesign {
  static let activityBackground = Color(hex: 0x0F2D49)
  static let controlFill = Color(hex: 0x153F64)
  static let controlStroke = Color(hex: 0x4AA0E0)
  static let label = Color(hex: 0xA8B6C4)
  static let text = Color(hex: 0xFFFFFF)
  static let unit = Color(hex: 0xC0CAD4)
}

@main
struct PloverLiveActivityWidgetBundle: WidgetBundle {
  var body: some Widget {
    PloverPloggingLiveActivity()
  }
}

struct PloverPloggingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PloggingLiveActivityAttributes.self) { context in
      LockScreenPloggingActivityView(context: context)
        .activityBackgroundTint(PloverLiveActivityDesign.activityBackground)
        .activitySystemActionForegroundColor(PloverLiveActivityDesign.controlStroke)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          DynamicIslandMetric(
            title: "시간",
            value: {
              ActivityTimerText(state: context.state)
            }
          )
        }

        DynamicIslandExpandedRegion(.bottom) {
          HStack(spacing: 10) {
            MetricChip(
              title: "거리",
              value: "\(formatDistanceValue(context.state.distanceMeters)) Km"
            )
            MetricChip(title: "걸음", value: formatSteps(context.state.stepCount))
            MetricChip(title: "소모", value: "\(context.state.calories) kcal")
          }
        }
      } compactLeading: {
        Text("플")
          .font(.caption.weight(.heavy))
          .foregroundStyle(PloverLiveActivityDesign.text)
      } compactTrailing: {
        ActivityTimerText(state: context.state)
          .font(.caption.weight(.bold))
          .monospacedDigit()
          .foregroundStyle(.white)
      } minimal: {
        Text("플")
          .font(.caption2.weight(.heavy))
          .foregroundStyle(PloverLiveActivityDesign.text)
      }
    }
  }
}

private struct LockScreenPloggingActivityView: View {
  let context: ActivityViewContext<PloggingLiveActivityAttributes>

  var body: some View {
    HStack(alignment: .bottom, spacing: 0) {
      LockScreenTimerMetric(state: context.state)
        .frame(maxWidth: .infinity, alignment: .leading)

      LockScreenMetric(
        title: "거리",
        value: formatDistanceValue(context.state.distanceMeters),
        unit: "Km",
        valueSize: 22
      )
      .frame(maxWidth: .infinity, alignment: .center)

      LockScreenMetric(
        title: "걸음",
        value: formatSteps(context.state.stepCount),
        unit: nil,
        valueSize: 25
      )
      .frame(maxWidth: .infinity, alignment: .trailing)
    }
    .padding(.horizontal, 22)
    .padding(.top, 30)
    .padding(.bottom, 16)
    .frame(maxWidth: .infinity, minHeight: 103)
  }
}

private struct ActivityTimerText: View {
  let state: PloggingLiveActivityAttributes.ContentState

  var body: some View {
    if state.isPaused {
      Text(formatElapsed(state.elapsedSeconds))
    } else {
      Text(state.timerStartedAt, style: .timer)
    }
  }
}

private struct LockScreenTimerMetric: View {
  let state: PloggingLiveActivityAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      ActivityTimerText(state: state)
        .font(.system(size: 35, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(PloverLiveActivityDesign.text)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
      Text("시간")
        .font(.system(size: 12, weight: .medium, design: .rounded))
        .foregroundStyle(PloverLiveActivityDesign.label)
    }
  }
}

private struct LockScreenMetric: View {
  let title: String
  let value: String
  let unit: String?
  let valueSize: CGFloat

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      HStack(alignment: .firstTextBaseline, spacing: 3) {
        Text(value)
          .font(.system(size: valueSize, weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(PloverLiveActivityDesign.text)
        if let unit {
          Text(unit)
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(PloverLiveActivityDesign.unit)
        }
      }
      .lineLimit(1)
      .minimumScaleFactor(0.72)

      Text(title)
        .font(.system(size: 12, weight: .medium, design: .rounded))
        .foregroundStyle(PloverLiveActivityDesign.label)
    }
  }
}

private struct DynamicIslandMetric<Value: View>: View {
  let title: String
  @ViewBuilder let value: () -> Value

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      value()
        .font(.title3.weight(.heavy))
        .monospacedDigit()
        .foregroundStyle(PloverLiveActivityDesign.text)
      Text(title)
        .font(.caption2.weight(.semibold))
        .foregroundStyle(PloverLiveActivityDesign.label)
    }
  }
}

private struct MetricChip: View {
  let title: String
  let value: String

  var body: some View {
    VStack(spacing: 2) {
      Text(title)
        .font(.caption2.weight(.semibold))
        .foregroundStyle(Color.white.opacity(0.72))
      Text(value)
        .font(.caption.weight(.heavy))
        .monospacedDigit()
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .frame(maxWidth: .infinity)
  }
}

private func formatDistanceValue(_ meters: Double) -> String {
  String(format: "%.2f", max(0, meters) / 1000)
}

private func formatSteps(_ steps: Int) -> String {
  NumberFormatter.decimal.string(from: NSNumber(value: max(0, steps))) ?? "\(max(0, steps))"
}

private func formatElapsed(_ seconds: Int) -> String {
  let safeSeconds = max(0, seconds)
  let hours = safeSeconds / 3600
  let minutes = (safeSeconds % 3600) / 60
  let seconds = safeSeconds % 60

  if hours > 0 {
    return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
  }

  return String(format: "%02d:%02d", minutes, seconds)
}

private extension NumberFormatter {
  static let decimal: NumberFormatter = {
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: "ko_KR")
    formatter.numberStyle = .decimal
    return formatter
  }()
}
