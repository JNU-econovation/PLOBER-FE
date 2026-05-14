import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PloggingMap } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  CameraGlyph,
  MapControls,
  PauseGlyph,
  PlayGlyph,
  ScreenRoot,
  StatNumber,
  useSafeBottomInset,
  useSafeTopInset,
} from "@/src/shared/ui";

import { usePloggingSession } from "../hooks/use-plogging-session";
import { usePloggingTimer } from "../hooks/use-plogging-timer";
import { usePloggingTracker } from "../hooks/use-plogging-tracker";
import { capturePloggingPhoto } from "../services/capture-plogging-photo";
import { uploadPloggingPhoto } from "../services/upload-plogging-photo";

type LiveStat = { label: string; unit: string; value: string };

export function ActivePloggingScreen() {
  const router = useRouter();
  const topInset = useSafeTopInset();
  const bottomInset = useSafeBottomInset();
  const timer = usePloggingTimer();
  const {
    addPhoto,
    addPhotoObjectUrl,
    caloriesBurned,
    distanceMeters,
    photoUris,
    resetSession,
    stepCount,
  } = usePloggingSession();

  // 새 세션 시작 시 이전 세션의 누적 데이터(사진/좌표/걸음 등)를 비운다.
  // 사용자가 /report 까지 갔다가 뒤로 와서 새로 시작하는 경우에도 같은 화면이 다시 mount 되므로 안전하다.
  useEffect(() => {
    resetSession();
  }, [resetSession]);

  // GPS + 만보기 구독은 화면이 마운트되어 있는 동안에만 동작한다.
  // 일시정지 시 누적이 멈추고, 화면 unmount 시 자동으로 해제된다.
  usePloggingTracker({ isPaused: timer.isPaused });

  const handleCapturePhoto = async () => {
    const result = await capturePloggingPhoto();
    if (result.status !== "captured") return;

    addPhoto(result.uri);

    // 백그라운드로 S3 업로드. 사용자 동선은 막지 않고, 실패해도 다음 사진에 영향 없음.
    void (async () => {
      const uploadResult = await uploadPloggingPhoto(result.uri, "image/jpeg");
      if (uploadResult.status === "uploaded") {
        addPhotoObjectUrl(result.uri, uploadResult.objectUrl);
      }
    })();
  };

  const liveStats = useMemo<LiveStat[]>(
    () => [
      { label: "거리", unit: "km", value: formatKilometers(distanceMeters) },
      { label: "걸음", unit: "보", value: formatInteger(stepCount) },
      { label: "소모", unit: "kcal", value: formatInteger(caloriesBurned) },
    ],
    [caloriesBurned, distanceMeters, stepCount]
  );

  return (
    <ScreenRoot>
      <PloggingMap dimmed zoom={17}>
        <PloggingTimerCard
          formattedElapsed={timer.formatted}
          stats={liveStats}
          top={topInset + 16}
        />
        {/* 타이머 카드(약 152px) 아래로 16px 여유를 두고 컨트롤 배치 */}
        <MapControls top={topInset + 184} />
        <ActionDock
          bottom={bottomInset + 24}
          isPaused={timer.isPaused}
          onCapturePhoto={handleCapturePhoto}
          onEnd={() => router.push("/report")}
          onTogglePause={timer.toggle}
          photoCount={photoUris.length}
        />
      </PloggingMap>
    </ScreenRoot>
  );
}

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function PloggingTimerCard({
  top,
  formattedElapsed,
  stats,
}: {
  top: number;
  formattedElapsed: string;
  stats: LiveStat[];
}) {
  return (
    <View style={[styles.timerCard, { top }]}>
      <Text selectable style={styles.modeLabel}>
        자유모드
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        selectable
        style={styles.timerText}
      >
        {formattedElapsed}
      </Text>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => (
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
            {index < stats.length - 1 ? (
              <View style={styles.statDivider} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionDock({
  onCapturePhoto,
  onEnd,
  bottom,
  isPaused,
  onTogglePause,
  photoCount,
}: {
  onCapturePhoto: () => void;
  onEnd: () => void;
  bottom: number;
  isPaused: boolean;
  onTogglePause: () => void;
  photoCount: number;
}) {
  const pauseLabel = isPaused ? "재개" : "일시 정지";
  const cameraLabel =
    photoCount > 0 ? `사진 촬영 (${photoCount}장 촬영됨)` : "사진 촬영";
  return (
    <View style={[styles.actionDock, { bottom }]}>
      <Pressable
        accessibilityLabel={cameraLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onCapturePhoto}
        style={({ pressed }) => [
          styles.cameraButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <CameraGlyph light />
        {photoCount > 0 ? (
          <View style={styles.photoBadge}>
            <Text selectable style={styles.photoBadgeText}>
              {photoCount > 99 ? "99+" : String(photoCount)}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityLabel={pauseLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onTogglePause}
        style={({ pressed }) => [
          styles.pauseButton,
          pressed ? styles.pressed : null,
        ]}
      >
        {isPaused ? <PlayGlyph /> : <PauseGlyph />}
        <Text selectable style={styles.pauseText}>
          {pauseLabel}
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
  cameraButton: {
    position: "relative",
  },
  photoBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -6,
    top: -6,
  },
  photoBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "700",
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
