import { colors, shadows } from "@/src/shared/theme";
import {
  DecorativeLeafFace,
  LevelBadge,
  PrimaryBottomButton,
  ScreenRoot,
  StatNumber,
} from "@/src/shared/ui";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { reportMetrics, type ReportMetric } from "../data/report-data";

export function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: Math.max(insets.top, 44) + 16,
            // 🌟 하단 PrimaryButton 높이 + Safe Area만큼 스크롤 여백 동적 확보
            paddingBottom: Math.max(insets.bottom, 30) + 120 
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ReportHeader onBack={() => router.back()} />
        <ReportTitleBlock />
        <DistanceSummaryCard />
        <ReportMetricsCard />
        <LevelProgressCard />
        <MemoCard />
      </ScrollView>
      <PrimaryBottomButton
        onPress={() => router.replace("/history")}
        title="플로깅 완료"
      />
    </ScreenRoot>
  );
}

function ReportHeader({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="내보내기"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Feather color={colors.icon} name="download" size={20} />
        </Pressable>
      </View>
      <View style={styles.statusPill}>
        <Text selectable style={styles.statusText}>
          자유모드 · 완료
        </Text>
      </View>
    </>
  );
}

function ReportTitleBlock() {
  return (
    <>
      <Text selectable style={styles.reportTitle}>
        <Text style={styles.reportTitleBold}>4월 24일</Text> 플로깅
      </Text>
      <Text selectable style={styles.reportSubTitle}>
        18:21 → 20:02 ·{" "}
        <Text style={styles.reportSubTitleBold}>용봉동 일대</Text>
      </Text>
    </>
  );
}

function DistanceSummaryCard() {
  return (
    <View style={styles.distanceCard}>
      <Text selectable style={styles.cardCaption}>
        DISTANCE
      </Text>
      <View style={styles.distanceHeader}>
        <StatNumber size={36} unit="km" value="8.2" />
        <View style={styles.avgPill}>
          <Text selectable style={styles.avgText}>
            주간 평균 0.4km▲
          </Text>
        </View>
      </View>
      <View style={styles.miniMap}></View>
    </View>
  );
}

function ReportMetricsCard() {
  return (
    <View style={styles.metricsCard}>
      {reportMetrics.map((metric) => (
        <MetricCell key={metric.label} metric={metric} />
      ))}
    </View>
  );
}

function MetricCell({ metric }: { metric: ReportMetric }) {
  return (
    <View style={styles.metricCell}>
      <Text selectable style={styles.metricLabel}>
        {metric.label}
      </Text>
      <StatNumber size={24} unit={metric.unit} value={metric.value} />
    </View>
  );
}

function LevelProgressCard() {
  return (
    <View style={styles.levelCard}>
      <View style={styles.levelInfo}>
        <View style={styles.levelRow}>
          <LevelBadge />
          <Text selectable style={styles.levelTitle}>
            길거리 수호자
          </Text>
        </View>
        <Text selectable style={styles.levelProgressText}>
          <Text style={styles.levelProgressMuted}>다음 레벨까지 </Text>
          21,690걸음
        </Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
          <Text style={styles.progressMarker}>▲</Text>
        </View>
      </View>
      <DecorativeLeafFace />
    </View>
  );
}

function MemoCard() {
  return (
    <>
      <Text selectable style={styles.memoTitle}>
        ✎ 오늘의 기록을 남겨보세요
      </Text>
      <View style={styles.memoCard}>
        <Pressable
          accessibilityLabel="SNS 공유하기"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.shareButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Feather color={colors.icon} name="upload" size={19} />
          <Text selectable style={styles.shareText}>
            SNS 공유하기
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  avgPill: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  avgText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
  },
  backText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 26,
  },
  cardCaption: {
    color: colors.subtle,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  content: {
    gap: 14,
    paddingBottom: 150,
    paddingHorizontal: 22,
  },
  distanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: 12,
    minHeight: 311,
    padding: 20,
    ...shadows.raised,
  },
  distanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
    ...shadows.soft,
  },
  levelCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    height: 104,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    ...shadows.soft,
  },
  levelInfo: {
    flex: 1,
    gap: 8,
  },
  levelProgressMuted: {
    color: colors.subtle,
  },
  levelProgressText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0,
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  levelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  memoCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    height: 130,
    justifyContent: "flex-end",
    paddingBottom: 20,
    ...shadows.soft,
  },
  memoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
    marginTop: 8,
  },
  metricCell: {
    gap: 8,
    width: "48%",
  },
  metricLabel: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
    minHeight: 162,
    paddingHorizontal: 24,
    paddingVertical: 22,
    ...shadows.raised,
  },
  miniMap: {
    borderRadius: 24,
    flex: 1,
    minHeight: 196,
    overflow: "hidden",
    backgroundColor: "gray",
  },
  miniRouteSketch: {
    height: 220,
    left: 14,
    position: "absolute",
    top: 8,
    transform: [{ scale: 0.58 }],
    width: 220,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  progressFill: {
    backgroundColor: "#57AE71",
    borderRadius: 7,
    height: 5,
    width: "82%",
  },
  progressMarker: {
    bottom: -14,
    color: "#57AE71",
    fontSize: 10,
    position: "absolute",
    right: "16%",
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: 7,
    height: 5,
    overflow: "visible",
    width: "88%",
  },
  reportSubTitle: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 2,
  },
  reportSubTitleBold: {
    fontWeight: "600",
  },
  reportTitle: {
    color: colors.text,
    fontSize: 28,
    letterSpacing: 0,
    marginTop: 8,
  },
  reportTitleBold: {
    fontWeight: "800",
  },
  shareButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRadius: 27,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    minHeight: 39,
    paddingHorizontal: 23,
    ...shadows.soft,
  },
  shareText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  statusPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
