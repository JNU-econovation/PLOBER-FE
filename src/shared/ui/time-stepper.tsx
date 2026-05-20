import { Feather } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, typography } from "../theme";

type TimeStepperProps = {
  value: number;
  onChange: (next: number) => void;
  /** 증감 단위 (분). 기본 5 */
  step?: number;
  /** 최소값 (분). 기본 10 */
  min?: number;
  /** 최대값 (분). 기본 120 */
  max?: number;
  /** 좌측 라벨. 기본 "시간" */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 시간 값을 step 단위로 증감하는 스테퍼 컨트롤.
 * 시안 기준: "시간   N분   ▲▼" 가로 배치.
 * min/max 도달 시 해당 방향 버튼은 시각적/접근성적으로 비활성화된다.
 */
export function TimeStepper({
  value,
  onChange,
  step = 5,
  min = 10,
  max = 120,
  label = "시간",
  style,
}: TimeStepperProps) {
  const canIncrement = value + step <= max;
  const canDecrement = value - step >= min;

  const handleIncrement = () => {
    if (!canIncrement) return;
    onChange(value + step);
  };

  const handleDecrement = () => {
    if (!canDecrement) return;
    onChange(value - step);
  };

  return (
    <View style={[styles.container, style]}>
      <Text selectable style={styles.label}>
        {label}
      </Text>

      <Text selectable style={styles.value}>
        {value}
        <Text style={styles.unit}>분</Text>
      </Text>

      <View style={styles.buttonsColumn}>
        <Pressable
          accessibilityLabel="시간 늘리기"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canIncrement }}
          disabled={!canIncrement}
          hitSlop={8}
          onPress={handleIncrement}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed && canIncrement ? styles.pressed : null,
          ]}
        >
          <Feather
            color={canIncrement ? colors.icon : colors.subtle}
            name="chevron-up"
            size={20}
          />
        </Pressable>

        <Pressable
          accessibilityLabel="시간 줄이기"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDecrement }}
          disabled={!canDecrement}
          hitSlop={8}
          onPress={handleDecrement}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed && canDecrement ? styles.pressed : null,
          ]}
        >
          <Feather
            color={canDecrement ? colors.icon : colors.subtle}
            name="chevron-down"
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 28,
    justifyContent: "center",
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  value: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 0,
    minWidth: 72,
    textAlign: "center",
    ...typography.number,
  },
  unit: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
  },
  buttonsColumn: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
  },
  stepperButton: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 28,
  },
  pressed: {
    opacity: 0.5,
  },
});