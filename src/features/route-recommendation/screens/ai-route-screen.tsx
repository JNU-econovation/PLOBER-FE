import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePloggingSession } from "@/src/features/plogging-session";
import {
  getToiletTintColor,
  useNearbyToilets,
} from "@/src/features/public-facilities";
import { PloggingMap } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  MapControls,
  PrimaryBottomButton,
  ScreenRoot,
  TopInset,
} from "@/src/shared/ui";

import type { RecommendedRoute } from "../api";
import { useRecommendedRoute } from "../hooks/use-recommended-route";

type RouteCardState =
  | { status: "loading" }
  | { status: "success"; route: RecommendedRoute }
  | { status: "error"; message: string; onRetry: () => void };

export function AiRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ time?: string }>();
  const insets = useSafeAreaInsets(); // 🌟 Safe Area 훅 추가
  const { setMode: setSessionMode } = usePloggingSession();
  const timeMinutes = parseRouteTimeMinutes(params.time);
  const recommendedRoute = useRecommendedRoute({ timeMinutes });
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [restroomVisible, setRestroomVisible] = useState(false);
  const toiletsState = useNearbyToilets({ enabled: restroomVisible });
  const toiletMarkers =
    restroomVisible && toiletsState.status === "success"
      ? toiletsState.toilets.map((toilet) => ({
          id: toilet.id,
          latitude: toilet.latitude,
          longitude: toilet.longitude,
          tintColor: getToiletTintColor(toilet.openTimeType),
        }))
      : undefined;

  return (
    <ScreenRoot>
      {/* 🛠 fix(gps): followUserLocation 기본값(true) 사용하여 사용자의 실제 GPS 위치를 표시하고 카메라가 추적하도록 한다.
          기존에는 followUserLocation={false}여서 home에서는 잘 잡히던 GPS가 이 화면에서는
          CAMPUS_CAMERA 고정 좌표에 머물렀다. zoom만 유지한다. */}
      <PloggingMap
        dimmed
        heatmapVisible={heatmapVisible}
        routePoints={
          recommendedRoute.status === "success"
            ? recommendedRoute.route.routePoints
            : undefined
        }
        routeVisible={recommendedRoute.status === "success"}
        toilets={toiletMarkers}
        zoom={15.1}
      >
        <RouteHeader onClose={() => router.back()} />
        <MapControls
          heatmapActive={heatmapVisible}
          onToggleHeatmap={() => setHeatmapVisible((prev) => !prev)}
          onToggleRestroom={() => setRestroomVisible((prev) => !prev)}
          restroomActive={restroomVisible}
          top={Math.max(insets.top, 44) + 100}
        />
        
        <ScrollView
          contentContainerStyle={styles.routeCardsContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.routeCards, 
            // 🌟 하단 PrimaryButton 높이를 고려하여 동적 여백 설정
            { bottom: Math.max(insets.bottom, 30) + 110 } 
          ]}
        >
          <RouteOptionCard
            state={
              recommendedRoute.status === "success"
                ? { route: recommendedRoute.route, status: "success" }
                : recommendedRoute.status === "error"
                  ? {
                      message: recommendedRoute.message,
                      onRetry: recommendedRoute.refetch,
                      status: "error",
                    }
                  : { status: "loading" }
            }
          />
        </ScrollView>
        <PrimaryBottomButton
          onPress={() => {
            if (recommendedRoute.status !== "success") return;
            setSessionMode("RECOMMENDED");
            router.push({
              pathname: "/plogging",
              params: { routeId: "recommended" },
            });
          }}
          style={
            recommendedRoute.status === "success"
              ? undefined
              : styles.primaryButtonDisabled
          }
          title={
            recommendedRoute.status === "success"
              ? "플로깅 시작하기"
              : "추천 경로를 불러오는 중"
          }
        />
      </PloggingMap>
    </ScreenRoot>
  );
}

function RouteHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <TopInset />
      <View style={styles.headerRow}>
        <Text selectable style={styles.title}>
          AI 경로 추천
        </Text>
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Feather color="#33363F" name="x" size={34} />
        </Pressable>
      </View>
    </View>
  );
}

function RouteOptionCard({ state }: { state: RouteCardState }) {
  if (state.status === "loading") {
    return (
      <View style={[styles.routeCard, styles.routeCardActive]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.routeCardTitle}>추천 경로 계산 중</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <Pressable
        accessibilityLabel="추천 경로 다시 불러오기"
        accessibilityRole="button"
        onPress={state.onRetry}
        style={({ pressed }) => [
          styles.routeCard,
          styles.routeCardError,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text numberOfLines={1} style={styles.routeCardTitle}>
          경로 불러오기 실패
        </Text>
        <Text numberOfLines={1} style={styles.routeCardErrorText}>
          {state.message}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel="추천 경로"
      style={[styles.routeCard, styles.routeCardActive]}
    >
      <Text
        style={[
          styles.routeCardTitle,
          styles.routeCardTitleActive,
        ]}
      >
        AI 추천 경로
      </Text>
      <Text
        style={[
          styles.routeCardMetric,
          styles.routeCardMetricActive,
        ]}
      >
        {formatMinutes(state.route.timeMillis)}
        <Text style={styles.routeCardMinute}>분</Text>
        <Text
          style={[
            styles.routeCardDistance,
            styles.routeCardDistanceActive,
          ]}
        >
          {" "}
          {formatDistanceKm(state.route.distanceMeter)}
        </Text>
      </Text>
    </View>
  );
}

function formatMinutes(timeMillis: number): number {
  return Math.max(1, Math.round(timeMillis / 60_000));
}

function formatDistanceKm(distanceMeter: number): string {
  return `${(distanceMeter / 1000).toFixed(1)}km`;
}

function parseRouteTimeMinutes(rawTime: string | undefined): number {
  const parsed = Number(rawTime);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(10, Math.min(120, Math.round(parsed)));
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  header: {
    backgroundColor: colors.surface,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    ...shadows.raised,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 89,
    justifyContent: "space-between",
    paddingLeft: 24,
    paddingRight: 20,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonDisabled: {
    backgroundColor: colors.muted,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderColor: "transparent",
    borderWidth: 3,
    borderRadius: 6,
    height: 87,
    justifyContent: "center",
    paddingHorizontal: 16,
    width: 149,
    ...shadows.soft,
  },
  routeCardActive: {
    borderColor: colors.primary,
  },
  routeCardError: {
    borderColor: colors.danger,
  },
  routeCardErrorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 12,
  },
  routeCardDistance: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "500",
  },
  routeCardMetric: {
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: 0,
    marginTop: 14,
  },
  routeCardMetricActive: {
    color: colors.text,
  },
  routeCardMinute: {
    fontSize: 18,
  },
  routeCardMuted: {
    color: "#4D4D4D",
  },
  routeCardTitle: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  routeCardTitleActive: {
    color: colors.text,
  },
  routeCardDistanceActive: {
    color: colors.muted,
  },
  routeCards: {
    bottom: 122,
    left: 0,
    position: "absolute",
    right: 0,
  },
  routeCardsContent: {
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    letterSpacing: 0,
  },
});
