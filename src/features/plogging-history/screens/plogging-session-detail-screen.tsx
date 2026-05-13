import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows } from "@/src/shared/theme";
import { BackButton, ScreenRoot, StatNumber } from "@/src/shared/ui";

import type { PloggingSessionDetail } from "../api/types";
import { usePloggingSessionDetail } from "../hooks/use-plogging-session-detail";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function PloggingSessionDetailScreen({
  ploggingSessionId,
}: {
  ploggingSessionId: number | null;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = usePloggingSessionDetail(ploggingSessionId);

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 44) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader onBack={() => router.back()} />

        {state.status === "loading" || state.status === "idle" ? (
          <View style={styles.statusBlock}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : state.status === "error" ? (
          <View style={styles.statusBlock}>
            <Text selectable style={styles.statusText}>
              {state.message}
            </Text>
          </View>
        ) : (
          <DetailBody detail={state.detail} />
        )}
      </ScrollView>
    </ScreenRoot>
  );
}

function DetailHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerActions}>
      <BackButton onPress={onBack} />
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
  );
}

function DetailBody({ detail }: { detail: PloggingSessionDetail }) {
  const startedAt = new Date(detail.startedAt);
  const finishedAt = new Date(detail.finishedAt);
  const validDates =
    !Number.isNaN(startedAt.getTime()) && !Number.isNaN(finishedAt.getTime());

  const modeLabel = detail.mode === "AI" ? "AI 추천 · 완료" : "자유모드 · 완료";
  const titleDate = validDates
    ? `${startedAt.getMonth() + 1}월 ${startedAt.getDate()}일`
    : "";
  const subTimeRange = validDates
    ? `${formatHm(startedAt)} → ${formatHm(finishedAt)}`
    : "";

  return (
    <>
      <View style={styles.statusPill}>
        <Text selectable style={styles.statusPillText}>
          {modeLabel}
        </Text>
      </View>

      {titleDate ? (
        <Text selectable style={styles.titleText}>
          <Text style={styles.titleBold}>{titleDate}</Text> 플로깅
        </Text>
      ) : null}
      {subTimeRange ? (
        <Text selectable style={styles.subTitleText}>
          {subTimeRange} ·{" "}
          <Text style={styles.subTitleBold}>{detail.placeName}</Text>
        </Text>
      ) : null}

      <View style={styles.distanceCard}>
        <Text selectable style={styles.cardCaption}>
          DISTANCE
        </Text>
        <View style={styles.distanceHeader}>
          <StatNumber
            size={36}
            unit="km"
            value={formatKilometers(detail.distanceMeters)}
          />
        </View>
        <View style={styles.miniMap}>
          {detail.mapImageUrl ? (
            <Image
              accessibilityLabel="플로깅 경로 이미지"
              source={{ uri: detail.mapImageUrl }}
              style={styles.miniMapImage}
            />
          ) : (
            <View style={styles.miniMapEmpty}>
              <Text selectable style={styles.miniMapEmptyText}>
                지도 이미지가 없습니다.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.metricsCard}>
        <MetricCell
          label="걸음 수"
          unit="steps"
          value={formatInteger(detail.stepCount)}
        />
        <MetricCell
          label="플로깅 시간"
          unit="H:M"
          value={formatHmDuration(detail.ploggingSeconds)}
        />
        <MetricCell
          label="소모 칼로리"
          unit="kcal"
          value={formatInteger(detail.caloriesBurned)}
        />
        <MetricCell
          label="휴식"
          unit="H:M"
          value={formatHmDuration(detail.restSeconds)}
        />
      </View>

      {detail.photoUrls.length > 0 ? (
        <View style={styles.photoSection}>
          <Text selectable style={styles.photoSectionTitle}>
            인증샷
          </Text>
          <ScrollView
            contentContainerStyle={styles.photoStripContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {detail.photoUrls.map((url) => (
              <Image
                key={url}
                accessibilityLabel="플로깅 인증샷"
                source={{ uri: url }}
                style={styles.photoThumb}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

function MetricCell({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.metricCell}>
      <Text selectable style={styles.metricLabel}>
        {label}
      </Text>
      <StatNumber size={24} unit={unit} value={value} />
    </View>
  );
}

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatHm(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// 초 → "H:MM" (예: 6060 → "1:41", 1800 → "0:30")
function formatHmDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  cardCaption: {
    color: colors.subtle,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  content: {
    gap: 14,
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
    backgroundColor: colors.line,
    borderRadius: 24,
    flex: 1,
    minHeight: 196,
    overflow: "hidden",
  },
  miniMapEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  miniMapEmptyText: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: "500",
  },
  miniMapImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  photoSection: {
    gap: 10,
    marginTop: 4,
  },
  photoSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
  },
  photoStripContent: {
    gap: 10,
    paddingVertical: 2,
  },
  photoThumb: {
    backgroundColor: colors.line,
    borderRadius: 16,
    height: 110,
    width: 110,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  statusBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
  statusPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  statusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  subTitleBold: {
    fontWeight: "600",
  },
  subTitleText: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 2,
  },
  titleBold: {
    fontWeight: "800",
  },
  titleText: {
    color: colors.text,
    fontSize: 28,
    letterSpacing: 0,
    marginTop: 8,
  },
});
