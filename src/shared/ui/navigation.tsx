import { Image } from "expo-image";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { usePathname, useSegments } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontFamilies, getSafeLineHeight } from "@/src/shared/theme";

type TabIconSource = ComponentProps<typeof Image>["source"];

export const TAB_BAR_HEIGHT = 56;

export function useTabBarHeight() {
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
  crews: {
    activeIcon: require("@/assets/icons/tab-crew-active.svg"),
    icon: require("@/assets/icons/tab-crew.svg"),
    label: "크루",
  },
};

export function PloggingTabBar({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const bottomInset = insets.bottom;
  const activeRouteName = state.routes[state.index]?.name;

  // Expo Router may expose a nested dynamic route as either resolved ids or
  // bracketed route segments. Record detail is a full-screen report in Figma,
  // so match the stable segment instead of assuming numeric pathname values.
  const recordsSegmentIndex = segments.findIndex(
    (segment) => segment === "records",
  );
  if (
    /\/records\/[^/]+\/?$/.test(pathname) ||
    (recordsSegmentIndex >= 0 && recordsSegmentIndex < segments.length - 1)
  ) {
    return null;
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bottomTabs,
        {
          height: TAB_BAR_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const routeSelected = state.index === index;
          const selected =
            activeRouteName === "profile"
              ? route.name === "index"
              : routeSelected;
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

                if (!routeSelected && !event.defaultPrevented) {
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
              <Text
                style={[
                  styles.tabLabel,
                  selected ? styles.tabLabelSelected : null,
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabs: {
    backgroundColor: "#FFFFFF",
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    left: 0,
    position: "absolute",
    right: 0,
    boxShadow: "0 0 21.2px rgba(0, 0, 0, 0.07)",
    elevation: 8,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    gap: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: "center",
    minWidth: 44,
  },
  tabIcon: {
    height: 28,
    width: 28,
  },
  tabLabel: {
    color: "#535353",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: getSafeLineHeight(11, fontFamilies.medium, 13),
  },
  tabLabelSelected: {
    color: "#121212",
  },
  tabRow: {
    alignItems: "center",
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
});
