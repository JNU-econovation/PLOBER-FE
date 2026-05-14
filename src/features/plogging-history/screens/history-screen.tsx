import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { weeklyBars } from "../data/history-data";
import { usePloggingSessions } from "../hooks/use-plogging-sessions";
import type { PloggingSessionSummary } from "../api/types";
import {
  MiniGlyph,
  ScreenRoot,
  StatNumber,
  TopInset,
  useSafeBottomInset,
} from "@/src/shared/ui";
import { colors, shadows } from "@/src/shared/theme";

// 모드별 색 구분이 확정되기 전까지 모든 항목에 동일한 초록 톤 mock 사용.
const MOCK_GLYPH_COLOR = "#7BC47F";
const MOCK_GLYPH_BACKGROUND = "#EFF7EF";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function HistoryScreen() {
  const bottomInset = useSafeBottomInset();

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomInset + 118,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TopInset />
        <MonthlySummaryHero />

        <MonthlyChartCard />
        <Text selectable style={styles.moreText}>
          더보기 &gt;
        </Text>

        <Text selectable style={styles.recentTitle}>
          최근 기록
        </Text>
        <RecentRecordsSection />
      </ScrollView>
    </ScreenRoot>
  );
}

function RecentRecordsSection() {
  const state = usePloggingSessions();

  if (state.status === "loading" || state.status === "idle") {
    return (
      <View style={[styles.recordCard, styles.recordPlaceholder]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={[styles.recordCard, styles.recordPlaceholder]}>
        <Text selectable style={styles.recordPlaceholderText}>
          {state.message}
        </Text>
      </View>
    );
  }

  if (state.sessions.length === 0) {
    return (
      <View style={[styles.recordCard, styles.recordPlaceholder]}>
        <Text selectable style={styles.recordPlaceholderText}>
          아직 플로깅 기록이 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.recordCard}>
      {state.sessions.map((session) => (
        <RecordRow key={session.ploggingSessionId} session={session} />
      ))}
    </View>
  );
}

function MonthlySummaryHero() {
  return (
    <LinearGradient
      colors={["#72BDF3", "#449DDD"]}
      end={{ x: 1, y: 0.5 }}
      start={{ x: 0, y: 0.5 }}
      style={styles.summaryHero}
    >
      <Text selectable style={styles.monthLabel}>
        4월달 누적
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        selectable
        style={styles.totalSteps}
      >
        20,041<Text style={styles.totalUnit}> 걸음</Text>
      </Text>
      <View style={styles.heroLine} />
      <View style={styles.heroStats}>
        <SummaryMetric caption="수거한 쓰레기" unit="개" value="80" />
        <SummaryMetric caption="칼로리" unit="K" value="20.3" />
        <SummaryMetric caption="플로깅" unit="회" value="5" />
      </View>
    </LinearGradient>
  );
}

function SummaryMetric({
  caption,
  unit,
  value,
}: {
  caption: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.heroMetric}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        selectable
        style={styles.heroValue}
      >
        {value} <Text style={styles.heroUnit}>{unit}</Text>
      </Text>
      <Text numberOfLines={1} selectable style={styles.heroCaption}>
        {caption}
      </Text>
    </View>
  );
}

function MonthlyChartCard() {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text selectable style={styles.sectionTitle}>
          이번 달 누적
        </Text>
        <Text selectable style={styles.dateRange}>
          4월 14 ~ 20
        </Text>
      </View>
      <View style={styles.bars}>
        {weeklyBars.map((bar) => (
          <View key={bar.day} style={styles.barItem}>
            <View
              style={[
                styles.bar,
                { backgroundColor: bar.color, height: bar.height },
              ]}
            />
            <Text selectable style={styles.barLabel}>
              {bar.day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecordRow({ session }: { session: PloggingSessionSummary }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={`${session.placeName} 플로깅 기록 상세 보기`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/plogging-sessions/[id]",
          params: { id: String(session.ploggingSessionId) },
        })
      }
      style={({ pressed }) => [
        styles.recordRow,
        pressed ? styles.recordRowPressed : null,
      ]}
    >
      <MiniGlyph background={MOCK_GLYPH_BACKGROUND} color={MOCK_GLYPH_COLOR} />
      <View style={styles.recordCopy}>
        <Text selectable style={styles.recordPlace}>
          {session.placeName}
        </Text>
        <Text selectable style={styles.recordTime}>
          {formatSessionTimeRange(session.startedAt, session.finishedAt)}
        </Text>
      </View>
      <View style={styles.recordDistance}>
        <StatNumber
          size={18}
          unit="km"
          value={formatKilometers(session.distanceMeters)}
        />
      </View>
    </Pressable>
  );
}

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(2);
}

// "4월 21일 화 12:56 - 13:34" 형태로 만든다.
// startedAt / finishedAt은 ISO 형식 문자열 (예: "2026-04-24T18:21:00").
function formatSessionTimeRange(startedAt: string, finishedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(finishedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startedAt} - ${finishedAt}`;
  }

  const month = start.getMonth() + 1;
  const day = start.getDate();
  const weekday = WEEKDAY_KO[start.getDay()];

  return `${month}월 ${day}일 ${weekday} ${formatHm(start)} - ${formatHm(end)}`;
}

function formatHm(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 6,
    width: 38,
  },
  barItem: {
    alignItems: "center",
    gap: 8,
    height: 87,
    justifyContent: "flex-end",
  },
  barLabel: {
    color: "#596C59",
    fontSize: 12,
    fontWeight: "500",
  },
  bars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 20,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: 30,
    minHeight: 157,
    paddingHorizontal: 21,
    paddingTop: 22,
    ...shadows.soft,
  },
  chartHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateRange: {
    color: "#596C59",
    fontSize: 12,
    fontWeight: "500",
  },
  heroCaption: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0,
    marginTop: 5,
  },
  heroLine: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    height: 1,
    marginTop: 10,
  },
  heroMetric: {
    flex: 1,
    minWidth: 0,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 10,
  },
  heroUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
  heroValue: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
  },
  monthLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  moreText: {
    alignSelf: "flex-end",
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 25,
    marginTop: 14,
  },
  recentTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0,
    marginLeft: 24,
    marginTop: 22,
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: 12,
    overflow: "hidden",
    ...shadows.soft,
  },
  recordCopy: {
    flex: 1,
    gap: 8,
  },
  recordPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 96,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  recordPlaceholderText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  recordDistance: {
    alignItems: "flex-end",
    minWidth: 70,
  },
  recordPlace: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  recordRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 15,
    minHeight: 77,
    paddingHorizontal: 16,
  },
  recordRowPressed: {
    opacity: 0.7,
  },
  recordTime: {
    color: "#616161",
    fontSize: 13,
    fontWeight: "500",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryHero: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 24,
    paddingHorizontal: 40,
    paddingTop: 32,
    ...shadows.soft,
  },
  totalSteps: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 8,
  },
  totalUnit: {
    fontSize: 16,
    fontWeight: "500",
  },
});
