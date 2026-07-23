import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { useMonthlyPloggingSummary } from "../hooks/use-monthly-plogging-summary";
import { usePloggingSessions } from "../hooks/use-plogging-sessions";
import { useWeeklyPloggingSummary } from "../hooks/use-weekly-plogging-summary";
import type {
  DailyPloggingStat,
  DayOfWeek,
  MonthlyPloggingSummary,
  PloggingSessionSummary,
  WeeklyPloggingSummary,
} from "../api/types";
import {
  ScreenRoot,
  TopInset,
  useTabBarHeight,
} from "@/src/shared/ui";
import { colors, fontFamilies, shadows } from "@/src/shared/theme";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 차트 표시 기준값.
const CHART_BAR_MAX_HEIGHT = 67; // 최댓값일 때 바의 픽셀 높이
const CHART_BAR_EMPTY_HEIGHT = 7; // 활동 0인 날의 최소 바 높이
const CHART_DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const CHART_DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일",
};

export function HistoryScreen() {
  const tabBarHeight = useTabBarHeight();

  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      // 앱을 자정·월/주 경계 너머까지 켜 둔 뒤 돌아와도 최신 기간을 조회한다.
      setNow(new Date());
    }, [])
  );
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const weekStartDate = useMemo(() => getMondayDateString(now), [now]);

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TopInset />
        <MonthlySummaryHero month={month} year={year} />

        <MonthlyChartCard month={month} weekStartDate={weekStartDate} />

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
      <View style={styles.recordsList}>
        <View style={[styles.recordCard, styles.recordPlaceholder]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.recordsList}>
        <View style={[styles.recordCard, styles.recordPlaceholder]}>
          <Text selectable style={styles.recordPlaceholderText}>
            {state.message}
          </Text>
        </View>
      </View>
    );
  }

  if (state.sessions.length === 0) {
    return (
      <View style={styles.recordsList}>
        <View style={[styles.recordCard, styles.recordPlaceholder]}>
          <Text selectable style={styles.recordPlaceholderText}>
            아직 플로깅 기록이 없습니다.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.recordsList}>
      {state.sessions.map((session) => (
        <View key={session.ploggingSessionId} style={styles.recordCard}>
          <RecordRow session={session} />
        </View>
      ))}
    </View>
  );
}

function MonthlySummaryHero({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const state = useMonthlyPloggingSummary({ year, month });

  return (
    <LinearGradient
      colors={["#8DC3EC", "#449DDD"]}
      end={{ x: 0.9, y: 0.9 }}
      start={{ x: 0.1, y: 0.1 }}
      style={styles.summaryHero}
    >
      <Text selectable style={styles.monthLabel}>
        {month}월달 누적
      </Text>
      <MonthlySummaryHeroBody state={state} />
    </LinearGradient>
  );
}

function MonthlySummaryHeroBody({
  state,
}: {
  state: ReturnType<typeof useMonthlyPloggingSummary>;
}) {
  if (state.status === "loading" || state.status === "idle") {
    return (
      <View style={styles.heroLoading}>
        <ActivityIndicator color={colors.surface} />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.heroLoading}>
        <Text selectable style={styles.heroErrorText}>
          {state.message}
        </Text>
      </View>
    );
  }

  return <MonthlySummaryHeroData summary={state.summary} />;
}

function MonthlySummaryHeroData({
  summary,
}: {
  summary: MonthlyPloggingSummary;
}) {
  // 칼로리는 kcal 단위가 클 수 있으니 시안의 "K"(천 단위) 표기를 유지.
  // ex) 20312 → "20.3"
  const caloriesInThousands = (summary.totalCaloriesBurned / 1000).toFixed(1);
  const distanceKilometers = formatSummaryKilometers(
    summary.totalDistanceMeters,
  );
  const stepCountLabel = formatInteger(summary.totalStepCount);
  const ploggingCountLabel = formatInteger(summary.totalPloggingCount);

  return (
    <>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        selectable
        style={styles.totalSteps}
      >
        {stepCountLabel}
        <Text style={styles.totalUnit}> 걸음</Text>
      </Text>
      <View style={styles.heroLine} />
      <View style={styles.heroStats}>
        <SummaryMetric
          caption="걸은 거리"
          unit="km"
          value={distanceKilometers}
        />
        <SummaryMetric caption="칼로리" unit="K" value={caloriesInThousands} />
        <SummaryMetric caption="플로깅" unit="회" value={ploggingCountLabel} />
      </View>
    </>
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
      <Text numberOfLines={1} selectable style={styles.heroCaption}>
        {caption}
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        selectable
        style={styles.heroValue}
      >
        {value} <Text style={styles.heroUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

// 🛠 fix(api-integrate): 주간 차트 - 주간 누적 API 연동.
// 일별 걸음 수 기준으로 막대 높이를 정규화한다.
function MonthlyChartCard({
  month,
  weekStartDate,
}: {
  month: number;
  weekStartDate: string;
}) {
  const state = useWeeklyPloggingSummary({ startDate: weekStartDate });

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text selectable style={styles.sectionTitle}>
          이번 주 누적
        </Text>
        <Text selectable style={styles.dateRange}>
          {formatWeekRangeLabel(state, month)}
        </Text>
      </View>
      <MonthlyChartBars state={state} />
    </View>
  );
}

function MonthlyChartBars({
  state,
}: {
  state: ReturnType<typeof useWeeklyPloggingSummary>;
}) {
  if (state.status === "loading" || state.status === "idle") {
    return (
      <View style={styles.chartLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.chartLoading}>
        <Text selectable style={styles.recordPlaceholderText}>
          {state.message}
        </Text>
      </View>
    );
  }

  const bars = buildWeeklyBars(state.summary);

  return (
    <View style={styles.bars}>
      {bars.map((bar) => (
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
      <View style={styles.recordGlyph} />
      <View style={styles.recordCopy}>
        <Text selectable style={styles.recordPlace}>
          {session.placeName}
        </Text>
        <Text selectable style={styles.recordTime}>
          {formatSessionTimeRange(session.startedAt, session.finishedAt)}
        </Text>
      </View>
      <Text selectable style={styles.recordDistanceValue}>
        {formatKilometers(session.distanceMeters)}
        <Text style={styles.recordDistanceUnit}> km</Text>
      </Text>
    </Pressable>
  );
}

// ===== formatter / helper =====

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatSummaryKilometers(meters: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
  }).format(meters / 1000);
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

// 오늘이 속한 주의 월요일을 "YYYY-MM-DD"로 반환한다.
// 한국 관례를 따라 월요일을 주 시작으로 본다.
function getMondayDateString(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay(); // 0(일) ~ 6(토)
  // 일요일(0)이면 6일 전, 그 외에는 (요일 - 1)일 전이 월요일.
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - diffToMonday);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 차트 우상단의 "4월 14 ~ 20" 라벨을 만든다.
// 응답 도착 전까지는 현재 월만 표기.
function formatWeekRangeLabel(
  state: ReturnType<typeof useWeeklyPloggingSummary>,
  fallbackMonth: number,
): string {
  if (state.status !== "success") {
    return `${fallbackMonth}월`;
  }
  const start = new Date(state.summary.startDate);
  const end = new Date(state.summary.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${fallbackMonth}월`;
  }
  return `${start.getMonth() + 1}월 ${start.getDate()} ~ ${end.getDate()}`;
}

type WeeklyBar = {
  day: string;
  height: number;
  color: string;
};

// 주간 응답을 차트용 바 7개로 변환한다.
// 응답이 7일치 미만이거나 요일이 누락돼도 안전하게 0 처리한다.
// 색상 규칙: 최댓값(주중 최고) = primaryDark, 그 외 활동 있는 날 = primary,
// 활동 없는 날 = #D9D9D9. 시안 톤(primary/primaryDark/회색)을 유지.
function buildWeeklyBars(summary: WeeklyPloggingSummary): WeeklyBar[] {
  const byDay = new Map<DayOfWeek, DailyPloggingStat>();
  for (const stat of summary.dailyStats) {
    byDay.set(stat.dayOfWeek, stat);
  }

  const steps = CHART_DAY_ORDER.map(
    (day) => byDay.get(day)?.stepCount ?? 0,
  );
  const maxSteps = Math.max(0, ...steps);

  return CHART_DAY_ORDER.map((day, idx) => {
    const stepCount = steps[idx];
    if (stepCount === 0) {
      return {
        day: CHART_DAY_LABEL[day],
        height: CHART_BAR_EMPTY_HEIGHT,
        color: "#D9D9D9",
      };
    }
    const ratio = maxSteps > 0 ? stepCount / maxSteps : 0;
    // 너무 작은 활동도 시각적으로 보이도록 최소 높이를 보장.
    const height = Math.max(
      CHART_BAR_EMPTY_HEIGHT + 6,
      Math.round(ratio * CHART_BAR_MAX_HEIGHT),
    );
    const isMax = stepCount === maxSteps;
    return {
      day: CHART_DAY_LABEL[day],
      height,
      color:
        isMax
          ? colors.primary
          : ratio >= 0.7
            ? colors.primarySoft
            : "#C3DEF4",
    };
  });
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 6,
    maxWidth: 28,
    minWidth: 8,
    width: "70%",
  },
  barItem: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    height: 87,
    justifyContent: "flex-end",
  },
  barLabel: {
    color: "#404040",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  bars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    marginTop: 20,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 157,
    marginHorizontal: 24,
    marginTop: 21,
    paddingHorizontal: 21,
    paddingTop: 22,
    ...shadows.soft,
  },
  chartHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLoading: {
    alignItems: "center",
    height: 87,
    justifyContent: "center",
    marginTop: 20,
  },
  dateRange: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  heroCaption: {
    color: colors.surface,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
    marginBottom: 4,
  },
  heroErrorText: {
    color: colors.surface,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: "center",
  },
  heroLine: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    height: 1,
    marginTop: 13,
  },
  heroLoading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 110,
  },
  heroMetric: {
    flex: 1,
    minWidth: 0,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
  },
  heroUnit: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  heroValue: {
    color: colors.surface,
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  monthLabel: {
    color: colors.surface,
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  recentTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    letterSpacing: -0.32,
    marginLeft: 24,
    marginTop: 33,
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 77,
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
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: "center",
  },
  recordDistanceUnit: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  recordDistanceValue: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 16,
    letterSpacing: 0.64,
    minWidth: 72,
    textAlign: "right",
  },
  recordGlyph: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 45,
    width: 45,
  },
  recordPlace: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  recordRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
    height: 77,
    paddingHorizontal: 16,
  },
  recordRowPressed: {
    opacity: 0.7,
  },
  recordTime: {
    color: "#737373",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  recordsList: {
    gap: 12,
    marginHorizontal: 24,
    marginTop: 12,
  },
  sectionTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  summaryHero: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    height: 264,
    paddingHorizontal: 24,
    paddingTop: 74,
    ...shadows.soft,
  },
  totalSteps: {
    color: colors.surface,
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    letterSpacing: -0.72,
    marginTop: 8,
  },
  totalUnit: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    letterSpacing: -0.32,
  },
});
