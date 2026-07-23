import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePloggingSession } from "@/src/features/plogging-session";
import { useRestroomToggle } from "@/src/features/public-facilities";
import { PloggingMap } from "@/src/shared/map";
import { colors, fontFamilies, shadows } from "@/src/shared/theme";
import {
  CenterToast,
  PrimaryBottomButton,
  ScreenRoot,
} from "@/src/shared/ui";

import type { RecommendedRoute } from "../api";
import { useRecommendedRoute } from "../hooks/use-recommended-route";

type RouteCardState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void };

const HEADER_HEIGHT = 52;
const MAP_OVERLAY_GAP = 16;
const ROUTE_CARD_GAP = 12;
const ROUTE_CARD_HEIGHT = 104;
const ROUTE_SHEET_HORIZONTAL_PADDING = 20;
const PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT = 70;

const routeIcons = {
  back: require("@/assets/icons/figma-route-back.svg"),
  heatmap: require("@/assets/icons/map-control-heatmap.svg"),
  restroom: require("@/assets/icons/map-control-restroom.svg"),
} as const;

export function AiRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ time?: string }>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { setMode: setSessionMode, setRecommendedRoutePoints } =
    usePloggingSession();
  const timeMinutes = parseRouteTimeMinutes(params.time);
  const recommendedRoute = useRecommendedRoute({ timeMinutes });
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const {
    noNearbyToiletsMessage,
    noNearbyToiletsNoticeVisible,
    restroomVisible,
    toggleRestroom,
    toiletMarkers,
  } = useRestroomToggle();
  const selectedRoute =
    recommendedRoute.status === "success"
      ? (recommendedRoute.routes.find(
          (route) => route.id === selectedRouteId,
        ) ?? null)
      : null;
  const displayedRoute =
    selectedRoute ??
    (recommendedRoute.status === "success"
      ? (recommendedRoute.routes[0] ?? null)
      : null);
  const headerBottom = insets.top + HEADER_HEIGHT;
  const routeCardWidth = Math.max(
    148,
    Math.min(
      168,
      (windowWidth - ROUTE_SHEET_HORIZONTAL_PADDING * 2 - ROUTE_CARD_GAP) / 2,
    ),
  );

  return (
    <ScreenRoot>
      {/* 🛠 fix(gps): followUserLocation 기본값(true) 사용하여 사용자의 실제 GPS 위치를 표시하고 카메라가 추적하도록 한다.
          기존에는 followUserLocation={false}여서 home에서는 잘 잡히던 GPS가 이 화면에서는
          CAMPUS_CAMERA 고정 좌표에 머물렀다. zoom만 유지한다. */}
      <PloggingMap
        heatmapLegendTop={headerBottom + MAP_OVERLAY_GAP}
        heatmapVisible={heatmapVisible}
        routePoints={displayedRoute?.routePoints}
        routeVisible={Boolean(displayedRoute)}
        toilets={toiletMarkers}
        zoom={15.1}
      >
        <RouteHeader onClose={() => router.back()} topInset={insets.top} />
        <RouteMapControls
          heatmapActive={heatmapVisible}
          onToggleHeatmap={() => setHeatmapVisible((prev) => !prev)}
          onToggleRestroom={toggleRestroom}
          restroomActive={restroomVisible}
          top={headerBottom + MAP_OVERLAY_GAP}
        />
        <CenterToast
          message={noNearbyToiletsMessage}
          visible={noNearbyToiletsNoticeVisible}
        />

        <View
          style={[
            styles.routeSheet,
            {
              bottom: PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT + insets.bottom,
              paddingBottom: 20,
            },
          ]}
        >
          <View style={styles.routeSheetHeader}>
            <View style={styles.routeSheetHeading}>
              <Text accessibilityRole="header" style={styles.routeSheetTitle}>
                추천 경로
              </Text>
              <Text style={styles.routeSheetDescription}>
                {selectedRoute
                  ? "선택한 경로가 지도에 표시돼요"
                  : "원하는 경로를 선택해 주세요"}
              </Text>
            </View>
            {recommendedRoute.status === "success" ? (
              <Text style={styles.routeCount}>
                {recommendedRoute.routes.length}개
              </Text>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={styles.routeCardsContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.routeCards}
          >
            {recommendedRoute.status === "success" ? (
              recommendedRoute.routes.map((route, index) => (
                <RouteOptionCard
                  key={route.id}
                  onPress={() => setSelectedRouteId(route.id)}
                  route={route}
                  selected={route.id === selectedRoute?.id}
                  title={getRouteTitle(index)}
                  width={routeCardWidth}
                />
              ))
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
                width={windowWidth - ROUTE_SHEET_HORIZONTAL_PADDING * 2}
              />
            )}
          </ScrollView>

        </View>
        <PrimaryBottomButton
          disabled={!selectedRoute}
          onPress={() => {
            if (!selectedRoute) return;
            setSessionMode("RECOMMENDED");
            setRecommendedRoutePoints(selectedRoute.routePoints);
            router.push({
              pathname: "/plogging",
              params: { routeId: selectedRoute.id },
            });
          }}
          title={selectedRoute ? "플로깅 시작하기" : "경로를 선택해 주세요"}
        />
      </PloggingMap>
    </ScreenRoot>
  );
}

function RouteHeader({
  onClose,
  topInset,
}: {
  onClose: () => void;
  topInset: number;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset }]}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            contentFit="contain"
            source={routeIcons.back}
            style={styles.backIcon}
          />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          AI 경로 추천
        </Text>
      </View>
    </View>
  );
}

function RouteStatusCard({
  state,
  width,
}: {
  state: Exclude<RouteCardState, { status: "success" }>;
  width: number;
}) {
  if (state.status === "loading") {
    return (
      <View style={[styles.routeCard, styles.routeStatusCard, { width }]}>
        <ActivityIndicator color={colors.primary} />
        <View style={styles.routeStatusCopy}>
          <Text style={styles.routeCardTitle}>추천 경로를 만들고 있어요</Text>
          <Text style={styles.routeStatusDescription}>
            현재 위치에 맞는 경로를 계산 중이에요
          </Text>
        </View>
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
        styles.routeStatusCard,
        styles.routeCardError,
        { width },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.routeStatusCopy}>
        <Text numberOfLines={1} style={styles.routeCardTitle}>
          경로를 불러오지 못했어요
        </Text>
        <Text numberOfLines={2} style={styles.routeCardErrorText}>
          {state.message}
        </Text>
      </View>
      <Text style={styles.retryText}>다시 시도</Text>
    </Pressable>
  );
}

function RouteOptionCard({
  onPress,
  route,
  selected,
  title,
  width,
}: {
  onPress: () => void;
  route: RecommendedRoute;
  selected: boolean;
  title: string;
  width: number;
}) {
  return (
    <Pressable
      accessibilityLabel={`${title}, ${formatMinutes(route.timeMillis)}분, ${formatDistanceKm(route.distanceMeter)}, 플로깅 점수 ${route.ploggingScore}점`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeCard,
        { width },
        selected ? styles.routeCardActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.routeCardHeader}>
        <View style={styles.routeCardTitleRow}>
          {selected ? (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedIndicatorText}>✓</Text>
            </View>
          ) : null}
          <Text numberOfLines={1} style={styles.routeCardTitle}>
            {title}
          </Text>
        </View>
        <View
          style={[
            styles.routeScoreBadge,
            selected ? styles.routeScoreBadgeActive : null,
          ]}
        >
          <Text
            style={[
              styles.routeScoreText,
              selected ? styles.routeScoreTextActive : null,
            ]}
          >
            {route.ploggingScore}점
          </Text>
        </View>
      </View>
      <View style={styles.routeCardMetricRow}>
        <Text style={styles.routeCardMetric}>
          {formatMinutes(route.timeMillis)}
          <Text style={styles.routeCardMinute}>분</Text>
        </Text>
        <Text style={styles.routeCardDistance}>
          {formatDistanceKm(route.distanceMeter)}
        </Text>
      </View>
    </Pressable>
  );
}

function formatMinutes(timeMillis: number): number {
  return Math.max(1, Math.round(timeMillis / 60_000));
}

function formatDistanceKm(distanceMeter: number): string {
  return `${(distanceMeter / 1000).toFixed(1).replace(/\.0$/, "")}km`;
}

function getRouteTitle(index: number): string {
  return `추천 경로 ${index + 1}`;
}

function RouteMapControls({
  heatmapActive,
  onToggleHeatmap,
  onToggleRestroom,
  restroomActive,
  top,
}: {
  heatmapActive: boolean;
  onToggleHeatmap: () => void;
  onToggleRestroom: () => void;
  restroomActive: boolean;
  top: number;
}) {
  const controls = [
    {
      active: heatmapActive,
      icon: routeIcons.heatmap,
      label: "히트맵",
      onPress: onToggleHeatmap,
    },
    {
      active: restroomActive,
      icon: routeIcons.restroom,
      label: "화장실",
      onPress: onToggleRestroom,
    },
  ];

  return (
    <View style={[styles.mapControls, { top }]}>
      {controls.map((control) => (
        <Pressable
          key={control.label}
          accessibilityLabel={control.label}
          accessibilityRole="button"
          accessibilityState={{ selected: control.active }}
          onPress={control.onPress}
          style={({ pressed }) => [
            styles.mapControlButton,
            control.active ? styles.mapControlButtonActive : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            contentFit="contain"
            source={control.icon}
            style={styles.mapControlIcon}
            tintColor={control.active ? colors.surface : null}
          />
        </Pressable>
      ))}
    </View>
  );
}

function parseRouteTimeMinutes(rawTime: string | undefined): number {
  const parsed = Number(rawTime);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(10, Math.min(120, Math.round(parsed)));
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    left: 16,
    position: "absolute",
    width: 44,
  },
  backIcon: {
    height: 28,
    width: 28,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: "rgba(18, 18, 18, 0.08)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 30,
  },
  headerRow: {
    alignItems: "center",
    height: HEADER_HEIGHT,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 3px 12px rgba(0, 0, 0, 0.06)",
    height: ROUTE_CARD_HEIGHT,
    justifyContent: "space-between",
    padding: 12,
  },
  routeCardActive: {
    backgroundColor: "#F2F9FE",
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  routeCardError: {
    backgroundColor: "#FFF8F8",
    borderColor: "#FFC7C7",
  },
  routeCardErrorText: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  routeCardDistance: {
    color: colors.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  routeCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  routeCardMetric: {
    color: colors.text,
    fontFamily: fontFamilies.semiBold,
    fontSize: 26,
    letterSpacing: -0.52,
  },
  routeCardMetricRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
  },
  routeCardMinute: {
    fontFamily: fontFamilies.regular,
    fontSize: 17,
  },
  routeCardTitle: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  routeCardTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 5,
    minWidth: 0,
  },
  routeCards: {
    height: ROUTE_CARD_HEIGHT + 8,
    marginBottom: 12,
  },
  routeCardsContent: {
    gap: ROUTE_CARD_GAP,
    paddingBottom: 4,
    paddingHorizontal: ROUTE_SHEET_HORIZONTAL_PADDING,
    paddingTop: 4,
  },
  routeCount: {
    backgroundColor: "#EDF0F2",
    borderRadius: 999,
    color: colors.muted,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 26,
    overflow: "hidden",
    paddingHorizontal: 10,
  },
  routeScoreBadge: {
    backgroundColor: "#F0F2F4",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  routeScoreBadgeActive: {
    backgroundColor: "#DCEFFD",
  },
  routeScoreText: {
    color: colors.muted,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  routeScoreTextActive: {
    color: colors.primaryDark,
  },
  routeSheet: {
    backgroundColor: colors.background,
    borderTopColor: "rgba(18, 18, 18, 0.06)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    boxShadow: "0 -8px 28px rgba(0, 0, 0, 0.10)",
    left: 0,
    paddingTop: 18,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  routeSheetDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 20,
    marginTop: 2,
  },
  routeSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: ROUTE_SHEET_HORIZONTAL_PADDING,
  },
  routeSheetHeading: {
    flex: 1,
  },
  routeSheetTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semiBold,
    fontSize: 19,
    letterSpacing: -0.38,
    lineHeight: 26,
  },
  routeStatusCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-start",
  },
  routeStatusCopy: {
    flex: 1,
  },
  routeStatusDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  retryText: {
    color: colors.primaryDark,
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
  },
  selectedIndicator: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  selectedIndicatorText: {
    color: colors.surface,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    lineHeight: 13,
  },
  mapControlButton: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
    ...shadows.soft,
  },
  mapControlButtonActive: {
    backgroundColor: colors.primary,
  },
  mapControlIcon: {
    height: 24,
    width: 24,
  },
  mapControls: {
    gap: 10,
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
});
