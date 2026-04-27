import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenRoot } from "@/src/shared/ui";
import { colors, shadows, typography } from "@/src/shared/theme";

import {
  type CalendarMonth,
  DEFAULT_PROFILE_CALENDAR,
  monthlyActivityDays,
  profileSummaryStats,
} from "../data/profile-data";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const DAYS_PER_WEEK = 7;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 118,
            paddingTop: Math.max(insets.top, 44) + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsButton />
        <ProfileOverview />
        <SummaryStatsCard />
        <ActivityCalendar />
      </ScrollView>
    </ScreenRoot>
  );
}

function SettingsButton() {
  return (
    <Pressable
      accessibilityLabel="설정"
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [
        styles.settingsButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Feather color={colors.icon} name="settings" size={25} />
    </Pressable>
  );
}

function ProfileOverview() {
  return (
    <View style={styles.profileOverview}>
      <ProfileAvatar />
      <View style={styles.profileTextBlock}>
        <Text selectable style={styles.userName}>
          정아현
        </Text>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text selectable style={styles.levelBadgeText}>
              Lv.7
            </Text>
          </View>
          <Text selectable style={styles.levelTitle}>
            길거리 수호자
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
    </View>
  );
}

function ProfileAvatar() {
  return (
    <View style={styles.avatar}>
      <View style={[styles.avatarLeaf, styles.avatarLeafLeft]} />
      <View style={[styles.avatarLeaf, styles.avatarLeafCenter]} />
      <View style={[styles.avatarLeaf, styles.avatarLeafRight]} />
      <Text style={styles.avatarFace}>{">  ·"}</Text>
    </View>
  );
}

function SummaryStatsCard() {
  return (
    <View style={styles.summaryCard}>
      {profileSummaryStats.map((stat) => (
        <View key={stat.label} style={styles.summaryItem}>
          <Text selectable style={styles.summaryValue}>
            {stat.value}
            <Text style={styles.summaryUnit}> {stat.unit}</Text>
          </Text>
          <Text selectable style={styles.summaryLabel}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ActivityCalendar() {
  const [visibleMonth, setVisibleMonth] = useState(DEFAULT_PROFILE_CALENDAR);
  const monthKey = formatMonthKey(visibleMonth.year, visibleMonth.month);
  const activityDays = monthlyActivityDays[monthKey] ?? [];
  const calendarCells = useMemo(
    () => getCalendarCells(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  const handleChangeMonth = (offset: number) => {
    setVisibleMonth((current) => addMonths(current, offset));
  };

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <MonthButton
          label="이전 달"
          name="chevron-left"
          onPress={() => handleChangeMonth(-1)}
        />
        <Text selectable style={styles.calendarTitle}>
          {visibleMonth.year}년 {visibleMonth.month + 1}월
        </Text>
        <MonthButton
          label="다음 달"
          name="chevron-right"
          onPress={() => handleChangeMonth(1)}
        />
      </View>
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((day) => (
          <Text selectable key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarCells.map((cell, index) => (
          <CalendarCell
            active={cell.day ? activityDays.includes(cell.day) : false}
            day={cell.day}
            inactive={!cell.day}
            key={`${monthKey}-${index}`}
          />
        ))}
      </View>
    </View>
  );
}

function MonthButton({
  label,
  name,
  onPress,
}: {
  label: string;
  name: "chevron-left" | "chevron-right";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Feather color={colors.icon} name={name} size={18} />
    </Pressable>
  );
}

function CalendarCell({
  active = false,
  day,
  inactive = false,
}: {
  active?: boolean;
  day?: number;
  inactive?: boolean;
}) {
  return (
    <View style={[styles.calendarCell, inactive ? styles.calendarCellInactive : null]}>
      {day ? (
        <>
          <Text selectable style={styles.dayText}>
            {day}
          </Text>
          {active ? <View style={styles.activityDot} /> : null}
        </>
      ) : null}
    </View>
  );
}

function addMonths(
  current: CalendarMonth,
  offset: number,
): CalendarMonth {
  const date = new Date(current.year, current.month + offset, 1);

  return {
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

function getCalendarCells(year: number, month: number) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const prefixDays = (firstDay + 6) % DAYS_PER_WEEK;
  const calendarDays = Array.from({ length: totalDays }, (_, index) => ({
    day: index + 1,
  }));
  const cellCount = Math.ceil((prefixDays + totalDays) / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  const suffixDays = cellCount - prefixDays - totalDays;

  return [
    ...Array.from({ length: prefixDays }, () => ({ day: undefined })),
    ...calendarDays,
    ...Array.from({ length: suffixDays }, () => ({ day: undefined })),
  ];
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  activityDot: {
    backgroundColor: "#6CB480",
    borderRadius: 3,
    height: 6,
    marginTop: 13,
    width: 6,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#E9FFBE",
    borderRadius: 16,
    height: 90,
    justifyContent: "center",
    overflow: "hidden",
    width: 90,
  },
  avatarFace: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 24,
    marginTop: 12,
    transform: [{ rotate: "7deg" }],
  },
  avatarLeaf: {
    backgroundColor: "#D9FB8F",
    height: 56,
    position: "absolute",
    top: 6,
    width: 62,
  },
  avatarLeafCenter: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 38,
    left: 16,
    opacity: 0.88,
    transform: [{ rotate: "6deg" }],
  },
  avatarLeafLeft: {
    borderBottomLeftRadius: 34,
    borderTopRightRadius: 34,
    left: -7,
    opacity: 0.78,
    transform: [{ rotate: "-22deg" }],
  },
  avatarLeafRight: {
    borderBottomRightRadius: 34,
    borderTopLeftRadius: 34,
    opacity: 0.82,
    right: -8,
    transform: [{ rotate: "24deg" }],
  },
  calendarCard: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    minHeight: 352,
    paddingHorizontal: 28,
    paddingBottom: 30,
    paddingTop: 12,
    width: "100%",
    ...shadows.soft,
  },
  calendarCell: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    height: 50,
    paddingTop: 10,
    width: `${100 / 7}%`,
  },
  calendarCellInactive: {
    backgroundColor: "#F9F9F9",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 13,
  },
  calendarTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0,
    minWidth: 54,
    textAlign: "center",
  },
  content: {
    gap: 23,
    paddingHorizontal: 24,
  },
  dayText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 14,
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#57AE71",
    borderRadius: 17,
    height: 18,
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  levelBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 14,
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 9,
  },
  levelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  monthButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  profileOverview: {
    alignItems: "center",
    flexDirection: "row",
    gap: 21,
    marginTop: -1,
  },
  profileTextBlock: {
    flex: 1,
    paddingTop: 2,
  },
  progressFill: {
    backgroundColor: "#57AE71",
    height: 4,
    width: "78%",
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: 7,
    height: 4,
    marginTop: 8,
    overflow: "hidden",
    width: "100%",
  },
  settingsButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
    ...shadows.soft,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    height: 96,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    width: "100%",
    ...shadows.soft,
  },
  summaryItem: {
    alignItems: "flex-start",
    minWidth: 76,
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0,
    marginTop: 7,
  },
  summaryUnit: {
    color: "#616161",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
    ...typography.number,
  },
  userName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 0,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0,
    textAlign: "center",
  },
});
