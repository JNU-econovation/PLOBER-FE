import { useEffect, type ReactNode } from "react";
import { useFonts } from "expo-font";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthSessionProvider, useAuthSession } from "@/src/features/auth";
import { PloggingSessionProvider } from "@/src/features/plogging-session/hooks/use-plogging-session";
import "@/src/features/plogging-session/services/plogging-background-location-task";
import { DeviceLocationProvider } from "@/src/shared/location";
import { colors } from "@/src/shared/theme";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    GiantsRegular: require("../assets/fonts/Giants-Regular.ttf"),
    GothicA1Bold: require("../assets/fonts/GothicA1-Bold.ttf"),
    GothicA1ExtraBold: require("../assets/fonts/GothicA1-ExtraBold.ttf"),
    GothicA1Regular: require("../assets/fonts/GothicA1-Regular.ttf"),
    GothicA1SemiBold: require("../assets/fonts/GothicA1-SemiBold.ttf"),
    PretendardBold: require("../assets/fonts/Pretendard-Bold.ttf"),
    PretendardExtraBold: require("../assets/fonts/Pretendard-ExtraBold.ttf"),
    PretendardMedium: require("../assets/fonts/Pretendard-Medium.ttf"),
    PretendardRegular: require("../assets/fonts/Pretendard-Regular.ttf"),
    PretendardSemiBold: require("../assets/fonts/Pretendard-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthSessionProvider>
      <PloggingSessionProvider>
        <StatusBar style="dark" />
        <AuthGate>
          <RootStack />
        </AuthGate>
      </PloggingSessionProvider>
    </AuthSessionProvider>
  );
}

function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="support" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ai-route" />
      <Stack.Screen name="plogging" options={{ gestureEnabled: false }} />
      <Stack.Screen name="report" options={{ gestureEnabled: false }} />
      <Stack.Screen name="Map" />
      <Stack.Screen name="plogging-sessions/[id]" />
    </Stack>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const { status } = useAuthSession();
  const onAuthRoute = segments[0] === "login";
  const onPublicRoute = segments[0] === "privacy" || segments[0] === "support";

  if (status === "loading") {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === "unauthenticated" && !onAuthRoute && !onPublicRoute) {
    return <Redirect href="/login" />;
  }

  if (status === "authenticated" && onAuthRoute) {
    return <Redirect href="/" />;
  }

  return status === "authenticated" ? (
    <DeviceLocationProvider>{children}</DeviceLocationProvider>
  ) : (
    children
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});
