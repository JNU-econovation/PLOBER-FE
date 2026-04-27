import { Tabs } from "expo-router";

import { PloggingTabBar } from "@/src/shared/ui";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PloggingTabBar {...props} />}
    >
      <Tabs.Screen name="history" options={{ title: "기록" }} />
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="profile" options={{ title: "프로필" }} />
    </Tabs>
  );
}
