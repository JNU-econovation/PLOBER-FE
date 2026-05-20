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
import { useRestroomToggle } from "@/src/features/public-facilities";
import { PloggingMap } from "@/src/shared/map";
import { colors } from "@/src/shared/theme";
import {
  CenterToast,
  MapControls,
  ScreenRoot,
  TopInset,
} from "@/src/shared/ui";

import type { RecommendedRoute } from "../api";
import { useRecommendedRoute } from "../hooks/use-recommended-route";

type RouteCardState =
  | { status: "loading" }
  | { status: "success"; route: RecommendedRoute }
  | { status: "error"; message: string; onRetry: () => void };

const MAP_CONTROL_TOP_OFFSET = 131;
const HEATMAP_LEGEND_TOP_OFFSET = 112;
const ROUTE_CARD_GAP = 28;
const ROUTE_CARD_HEIGHT = 86;
const START_BUTTON_HEIGHT = 98;
const ROUTE_CARD_TITLE = "시간 우선 경로";

export function AiRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ time?: string }>();
  const insets = useSafeAreaInsets();
  const {
    setMode: setSessionMode,
    setRecommendedRoutePoints,
  } = usePloggingSession();
  const timeMinutes = parseRouteTimeMinutes(params.time);
  const recommendedRoute = useRecommendedRoute({ timeMinutes });
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const {
    noNearbyToiletsMessage,
    noNearbyToiletsNoticeVisible,
    restroomVisible,
    toggleRestroom,
    toiletMarkers,
  } = useRestroomToggle();

  return (
    <ScreenRoot>
      {/* 🛠 fix(gps): followUserLocation 기본값(true) 사용하여 사용자의 실제 GPS 위치를 표시하고 카메라가 추적하도록 한다.
          기존에는 followUserLocation={false}여서 home에서는 잘 잡히던 GPS가 이 화면에서는
          CAMPUS_CAMERA 고정 좌표에 머물렀다. zoom만 유지한다. */}
      <PloggingMap
        dimmed
        heatmapLegendTop={Math.max(insets.top, 44) + HEATMAP_LEGEND_TOP_OFFSET}
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
          onToggleRestroom={toggleRestroom}
          restroomActive={restroomVisible}
          top={Math.max(insets.top, 44) + MAP_CONTROL_TOP_OFFSET}
        />
        <CenterToast
          message={noNearbyToiletsMessage}
          visible={noNearbyToiletsNoticeVisible}
        />
        
        <ScrollView
          contentContainerStyle={styles.routeCardsContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.routeCards}
        >
          {recommendedRoute.status === "success" ? (
            <RouteOptionCard
              route={recommendedRoute.route}
              selected
              title={ROUTE_CARD_TITLE}
            />
          ) : (
            <RouteStatusCard
              state={
                recommendedRoute.status === "error"
                  ? {
                      message: recommendedRoute.message,
                      onRetry: recommendedRoute.refetch,
                      status: "error",
                    }
                  : { status: "loading" }
              }
            />
          )}
        </ScrollView>
        <RouteStartButton
          disabled={recommendedRoute.status !== "success"}
          onPress={() => {
            if (recommendedRoute.status !== "success") return;
            setSessionMode("RECOMMENDED");
            setRecommendedRoutePoints(recommendedRoute.route.routePoints);
            router.push({
              pathname: "/plogging",
              params: { routeId: "recommended" },
            });
          }}
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
          AI 경로추천
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

function RouteStatusCard({
  state,
}: {
  state: Exclude<RouteCardState, { status: "success" }>;
}) {
  if (state.status === "loading") {
    return (
      <View style={[styles.routeCard, styles.routeCardActive]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.routeCardTitle}>추천 경로 계산 중</Text>
      </View>
    );
  }

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

function RouteOptionCard({
  route,
  selected,
  title,
}: {
  route: RecommendedRoute;
  selected: boolean;
  title: string;
}) {
  return (
    <View
      accessibilityLabel={title}
      style={[styles.routeCard, selected ? styles.routeCardActive : null]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.routeCardTitle,
          selected ? styles.routeCardTitleActive : styles.routeCardTitleMuted,
        ]}
      >
        {title}
      </Text>
      <View style={styles.routeCardMetricRow}>
        <Text
          style={[
            styles.routeCardMetric,
            selected
              ? styles.routeCardMetricActive
              : styles.routeCardMetricMuted,
          ]}
        >
          {formatMinutes(route.timeMillis)}
          <Text style={styles.routeCardMinute}>분</Text>
        </Text>
        <Text
          style={[
            styles.routeCardDistance,
            selected
              ? styles.routeCardDistanceActive
              : styles.routeCardDistanceMuted,
          ]}
        >
          {formatDistanceKm(route.distanceMeter)}
        </Text>
      </View>
    </View>
  );
}

function RouteStartButton({
  disabled,
  onPress,
  title,
}: {
  disabled: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={{ top: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.startButton,
        disabled ? styles.startButtonDisabled : null,
        pressed && !disabled ? styles.startButtonPressed : null,
      ]}
    >
      <Text selectable style={styles.startButtonText}>
        {title}
      </Text>
    </Pressable>
  );
}

function formatMinutes(timeMillis: number): number {
  return Math.max(1, Math.round(timeMillis / 60_000));
}

function formatDistanceKm(distanceMeter: number): string {
  return `${(distanceMeter / 1000).toFixed(1).replace(/\.0$/, "")}km`;
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
    boxShadow: "0 0 15.35px rgba(0, 0, 0, 0.10)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 80,
    justifyContent: "space-between",
    paddingLeft: 24,
    paddingRight: 16,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderColor: "transparent",
    borderRadius: 6,
    borderWidth: 3,
    boxShadow: "0 0 15.35px rgba(0, 0, 0, 0.05)",
    height: ROUTE_CARD_HEIGHT,
    paddingHorizontal: 15,
    paddingTop: 13,
    width: 149,
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
    fontSize: 18,
    fontWeight: "500",
  },
  routeCardDistanceActive: {
    color: "#737373",
  },
  routeCardDistanceMuted: {
    color: "#A3A3A3",
  },
  routeCardMetric: {
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: 0,
  },
  routeCardMetricActive: {
    color: "#0A0A0A",
  },
  routeCardMetricMuted: {
    color: "#404040",
  },
  routeCardMetricRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    marginTop: 9,
  },
  routeCardMinute: {
    fontSize: 18,
  },
  routeCardTitle: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  routeCardTitleActive: {
    color: "#0A0A0A",
  },
  routeCardTitleMuted: {
    color: "#404040",
  },
  routeCards: {
    bottom: START_BUTTON_HEIGHT + ROUTE_CARD_GAP,
    left: 0,
    position: "absolute",
    right: 0,
  },
  routeCardsContent: {
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    color: "#0A0A0A",
    fontSize: 22,
    letterSpacing: 0,
  },
  startButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    bottom: 0,
    boxShadow: "0 0 50.1px rgba(0, 0, 0, 0.12)",
    height: START_BUTTON_HEIGHT,
    justifyContent: "center",
    left: 0,
    paddingBottom: 32,
    paddingTop: 12,
    position: "absolute",
    right: 0,
  },
  startButtonDisabled: {
    backgroundColor: colors.muted,
  },
  startButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  startButtonText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 0,
  },
});
