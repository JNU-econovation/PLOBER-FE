import { Image } from "expo-image";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconSource = ComponentProps<typeof Image>["source"];

export const TAB_BAR_HEIGHT = 84;
const TAB_ICON_SIZE = 36;

// 하단 탭바의 실제 점유 높이. SafeArea 인셋(시스템 네비게이션 바)을 포함한다.
// 홈 화면 등 탭바 위에 absolute로 위치를 잡는 곳에서 이 훅을 사용하면 자동으로 정합성이 유지된다.
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom;
}

const tabConfig: Record<
  string,
  {
    activeIcon: TabIconSource;
    icon: TabIconSource;
    label: string;
  }
> = {
  history: {
    activeIcon: require("@/assets/icons/tab-history-active.svg"),
    icon: require("@/assets/icons/tab-history.svg"),
    label: "기록",
  },
  index: {
    activeIcon: require("@/assets/icons/tab-home-active.svg"),
    icon: require("@/assets/icons/tab-home.svg"),
    label: "홈",
  },
  profile: {
    activeIcon: require("@/assets/icons/tab-profile-active.svg"),
    icon: require("@/assets/icons/tab-profile.svg"),
    label: "프로필",
  },
};

export function PloggingTabBar({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bottomTabs,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const config = tabConfig[route.name];

          if (!config) {
            return null;
          }

          const options = descriptors[route.key]?.options;

          return (
            <Pressable
              accessibilityLabel={
                options.tabBarAccessibilityLabel ?? config.label
              }
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              hitSlop={6}
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: "tabPress",
                });

                if (!selected && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({
                  target: route.key,
                  type: "tabLongPress",
                });
              }}
              style={({ pressed }) => [
                styles.tabButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                contentFit="contain"
                source={selected ? config.activeIcon : config.icon}
                style={styles.tabIcon}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabs: {
    backgroundColor: "#FAFAFA",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    boxShadow: "0 0 21.2px rgba(0, 0, 0, 0.07)",
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  tabButton: {
    alignItems: "center",
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  tabIcon: {
    height: TAB_ICON_SIZE,
    width: TAB_ICON_SIZE,
  },
  tabRow: {
    alignItems: "center",
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    justifyContent: "space-between",
    paddingHorizontal: 34,
  },
});
