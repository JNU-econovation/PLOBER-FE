import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthSessionProvider, useAuthSession } from "@/src/features/auth";
import { PloggingSessionProvider } from "@/src/features/plogging-session/hooks/use-plogging-session";
import "@/src/features/plogging-session/services/plogging-background-location-task";
import { DeviceLocationProvider } from "@/src/shared/location";
import { colors } from "@/src/shared/theme";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <PloggingSessionProvider>
        <DeviceLocationProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <RootStack />
          </AuthGate>
        </DeviceLocationProvider>
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
      <Stack.Screen name="plogging" />
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

  return children;
}

const styles = StyleSheet.create({
  loadingRoot: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});
