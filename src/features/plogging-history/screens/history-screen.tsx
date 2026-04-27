import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  historyRecords,
  weeklyBars,
  type HistoryRecord,
} from "../data/history-data";
import {
  MiniGlyph,
  ScreenRoot,
  StatNumber,
  TopInset,
} from "@/src/shared/ui";
import { colors, shadows } from "@/src/shared/theme";

export function HistoryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 24) + 118,
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
        <View style={styles.recordCard}>
          {historyRecords.map((record, index) => (
            <RecordRow key={`${record.place}-${index}`} record={record} />
          ))}
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

function MonthlySummaryHero() {
  return (
    <View style={styles.summaryHero}>
      <Text selectable style={styles.monthLabel}>
        4월달 누적
      </Text>
      <Text selectable style={styles.totalSteps}>
        20,041<Text style={styles.totalUnit}> 걸음</Text>
      </Text>
      <View style={styles.heroLine} />
      <View style={styles.heroStats}>
        <SummaryMetric caption="수거한 쓰레기" unit="개" value="80" />
        <SummaryMetric caption="칼로리" unit="K" value="20.3" />
        <SummaryMetric caption="플로깅" unit="회" value="5" />
      </View>
    </View>
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
    <View>
      <Text selectable style={styles.heroValue}>
        {value} <Text style={styles.heroUnit}>{unit}</Text>
      </Text>
      <Text selectable style={styles.heroCaption}>
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

function RecordRow({ record }: { record: HistoryRecord }) {
  return (
    <View style={styles.recordRow}>
      <MiniGlyph background={record.background} color={record.color} />
      <View style={styles.recordCopy}>
        <Text selectable style={styles.recordPlace}>
          {record.place}
        </Text>
        <Text selectable style={styles.recordTime}>
          {record.time}
        </Text>
      </View>
      <View style={styles.recordDistance}>
        <StatNumber size={18} unit="km" value={record.distance} />
      </View>
    </View>
  );
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
  heroStats: {
    flexDirection: "row",
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
    backgroundColor: "#57AE71",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    height: 200,
    paddingHorizontal: 40,
    paddingTop: 48,
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
