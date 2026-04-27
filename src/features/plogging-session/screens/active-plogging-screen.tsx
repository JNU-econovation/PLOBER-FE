import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // 🌟 추가
import { PloggingMap } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  CameraGlyph,
  MapControls,
  PauseGlyph,
  RoutePin,
  ScreenRoot,
  StatNumber,
} from "@/src/shared/ui";

import { activeStats } from "../data/activity-data";

export function ActivePloggingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 🌟 Safe Area 훅 추가
  return (
    <ScreenRoot>
      <PloggingMap dimmed zoom={17}>
        {/* 상단 노치 영역을 고려하여 top 위치 동적 할당 */}
        <PloggingTimerCard top={Math.max(insets.top, 44) + 16} />
        {/* 타이머 카드(약 152px) 아래로 16px 여유를 두고 컨트롤 배치: 16 + 152 + 16 ≈ 184 */}
        <MapControls top={Math.max(insets.top, 44) + 184} />
        <View style={styles.centerPin}>
          <RoutePin large />
        </View>
        {/* 하단 제스처 바 영역을 고려하여 bottom 위치 동적 할당 */}
        <ActionDock 
          bottom={Math.max(insets.bottom, 24) + 24} 
          onEnd={() => router.push("/report")} 
        />
      </PloggingMap>
    </ScreenRoot>
  );
}

function PloggingTimerCard({ top }: { top: number }) {
  return (
    <View style={[styles.timerCard, { top }]}>
      <Text selectable style={styles.modeLabel}>
        자유모드
      </Text>
      <Text selectable style={styles.timerText}>
        14 : 17
      </Text>
      <View style={styles.statsRow}>
        {activeStats.map((stat, index) => (
          <View key={stat.label} style={styles.statItem}>
            <Text numberOfLines={1} selectable style={styles.statLabel}>
              {stat.label}
            </Text>
            <StatNumber
              numberOfLines={1}
              size={16}
              unit={stat.unit}
              value={stat.value}
            />
            {index < activeStats.length - 1 ? (
              <View style={styles.statDivider} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionDock({ onEnd, bottom }: { onEnd: () => void; bottom: number }){
  return (
    <View style={[styles.actionDock, { bottom }]}>
      <Pressable
        accessibilityLabel="사진 촬영"
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <CameraGlyph light />
      </Pressable>
      <Pressable
        accessibilityLabel="일시 정지"
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [
          styles.pauseButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <PauseGlyph />
        <Text selectable style={styles.pauseText}>
          일시 정지
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="플로깅 종료"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onEnd}
        style={({ pressed }) => [
          styles.endButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text selectable style={styles.endText}>
          종료
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionDock: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    // bottom: 27,
    flexDirection: "row",
    gap: 10,
    height: 71,
    justifyContent: "space-between",
    left: 24,
    paddingHorizontal: 12,
    position: "absolute",
    right: 24,
    ...shadows.button,
  },
  centerPin: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: "45%",
  },
  endButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 26,
    height: 51,
    justifyContent: "center",
    width: 51,
  },
  endText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
  },
  modeLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  pauseButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 51,
    justifyContent: "center",
    paddingHorizontal: 20,
    ...shadows.soft,
  },
  pauseText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  statDivider: {
    backgroundColor: colors.line,
    height: 29,
    position: "absolute",
    right: -6,
    top: 2,
    width: 1,
  },
  statItem: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    position: "relative",
  },
  statLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    left: 24,
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 14,
    position: "absolute",
    right: 24,
    ...shadows.raised,
  },
  timerText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4,
  },
});
