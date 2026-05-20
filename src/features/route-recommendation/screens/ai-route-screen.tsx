import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { PloggingMap, RouteSketch } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  MapControls,
  PrimaryBottomButton,
  ScreenRoot,
  TopInset,
} from "@/src/shared/ui";

import { routeOptions, type RouteOptionId } from "../data/route-options";

type RouteOption = (typeof routeOptions)[number];

export function AiRouteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 🌟 Safe Area 훅 추가
  const { setMode: setSessionMode } = usePloggingSession();
  const [selectedRouteId, setSelectedRouteId] = useState<RouteOptionId>(
    routeOptions[0].id,
  );
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
      <PloggingMap dimmed routeVisible toilets={toiletMarkers} zoom={15.1}>
        <RouteHeader onClose={() => router.back()} />
        <View style={styles.routeSketch}>
          <RouteSketch />
        </View>
        <MapControls
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
          {routeOptions.map((option) => {
            const selected = selectedRouteId === option.id;

            return (
              <RouteOptionCard
                key={option.id}
                option={option}
                selected={selected}
                onPress={() => setSelectedRouteId(option.id)}
              />
            );
          })}
        </ScrollView>
        <PrimaryBottomButton
          onPress={() => {
            setSessionMode("RECOMMENDED");
            router.push({
              pathname: "/plogging",
              params: { routeId: selectedRouteId },
            });
          }}
          title="플로깅 시작하기"
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

function RouteOptionCard({
  option,
  selected,
  onPress,
}: {
  option: RouteOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={option.title}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeCard,
        selected ? styles.routeCardActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.routeCardTitle,
          selected ? styles.routeCardTitleActive : styles.routeCardMuted,
        ]}
      >
        {option.title}
      </Text>
      <Text
        style={[
          styles.routeCardMetric,
          selected ? styles.routeCardMetricActive : styles.routeCardMuted,
        ]}
      >
        {option.minutes}
        <Text style={styles.routeCardMinute}>분</Text>
        <Text
          style={[
            styles.routeCardDistance,
            selected ? styles.routeCardDistanceActive : null,
          ]}
        >
          {" "}
          {option.distance}
        </Text>
      </Text>
    </Pressable>
  );
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
  routeSketch: {
    height: 300,
    left: 34,
    position: "absolute",
    top: 278,
    width: 300,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    letterSpacing: 0,
  },
});