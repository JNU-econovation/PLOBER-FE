import { colors, shadows } from "@/src/shared/theme";
import {
  DecorativeLeafFace,
  BackButton,
  LevelBadge,
  PrimaryBottomButton,
  ScreenRoot,
  StatNumber,
  useSafeBottomInset,
  useSafeTopInset,
} from "@/src/shared/ui";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { usePloggingSession } from "@/src/features/plogging-session/hooks/use-plogging-session";
import { uploadMapImage } from "@/src/features/plogging-session/services/upload-map-image";

import { RouteSnapshotMap } from "../components/route-snapshot-map";
import { reportMetrics, type ReportMetric } from "../data/report-data";

export function ReportScreen() {
  const router = useRouter();
  const topInset = useSafeTopInset();
  const bottomInset = useSafeBottomInset(30);

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset + 16,
            // 하단 PrimaryButton 높이 + SafeArea만큼 스크롤 여백 확보
            paddingBottom: bottomInset + 120
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
  const {
    mapImageObjectUrl,
    mapImageUri,
    routePoints,
    setMapImageObjectUrl,
    setMapImageUri,
  } = usePloggingSession();
  // 좌표가 1개라도 있으면 마커로 캡처, 0개일 때만 placeholder.
  const hasRoute = routePoints.length >= 1;
  const uploadedUriRef = useRef<string | null>(null);

  // 로컬 캡처가 끝나면 백그라운드로 S3 업로드 → objectUrl을 세션에 보관.
  // 같은 URI에 대해 중복 업로드되지 않도록 ref로 가드한다.
  useEffect(() => {
    if (!mapImageUri) return;
    if (mapImageObjectUrl) return;
    if (uploadedUriRef.current === mapImageUri) return;
    uploadedUriRef.current = mapImageUri;

    let cancelled = false;
    void (async () => {
      const result = await uploadMapImage(mapImageUri, "image/png");
      if (cancelled) return;
      if (result.status === "uploaded") {
        setMapImageObjectUrl(result.objectUrl);
      } else {
        // 실패 시 다음 mount/재시도에 다시 시도할 수 있도록 가드 해제.
        uploadedUriRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapImageObjectUrl, mapImageUri, setMapImageObjectUrl]);

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
      <View style={styles.miniMap}>
        {mapImageUri ? (
          <Image
            accessibilityLabel="플로깅 경로 이미지"
            source={{ uri: mapImageUri }}
            style={styles.miniMapImage}
          />
        ) : hasRoute ? (
          <RouteSnapshotMap
            onCaptured={setMapImageUri}
            routePoints={routePoints}
          />
        ) : (
          <View style={styles.miniMapEmpty}>
            <Text selectable style={styles.miniMapEmptyText}>
              경로 정보가 없습니다.
            </Text>
          </View>
        )}
      </View>
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
    backgroundColor: colors.line,
  },
  miniMapImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
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
    backgroundColor: colors.primary,
    borderRadius: 7,
    height: 5,
    width: "82%",
  },
  progressMarker: {
    bottom: -14,
    color: colors.primary,
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
