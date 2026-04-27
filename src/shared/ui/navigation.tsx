import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows } from "../theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const tabConfig: Record<
  string,
  {
    activeIcon: IoniconName;
    icon: IoniconName;
    label: string;
  }
> = {
  history: {
    activeIcon: "bar-chart",
    icon: "bar-chart-outline",
    label: "기록",
  },
  index: {
    activeIcon: "home",
    icon: "home-outline",
    label: "홈",
  },
  profile: {
    activeIcon: "person",
    icon: "person-outline",
    label: "프로필",
  },
};

export function PloggingTabBar({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom;
  return (
    <View accessibilityRole="tablist" style={[
        styles.bottomTabs, 
        { 
          paddingBottom,
          // 패딩이 추가된 만큼 전체 높이도 유동적으로 늘려줍니다
          height: 60 + paddingBottom 
        }
      ]}>
      {state.routes.map((route, index) => {
        const selected = state.index === index;
        const config = tabConfig[route.name];

        if (!config) {
          return null;
        }

        const options = descriptors[route.key]?.options;

        return (
          <Pressable
            accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
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
            <Ionicons
              color={selected ? colors.icon : "#33363F"}
              name={selected ? config.activeIcon : config.icon}
              size={34}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabs: {
    alignItems: "center",
    backgroundColor: colors.surface,
    bottom: 0,
    flexDirection: "row",
    // height: 83, <- 이 고정 높이 삭제 (위에서 동적 계산함)
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 34,
    position: "absolute",
    right: 0,
    ...shadows.soft,
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
});
