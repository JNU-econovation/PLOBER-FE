import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthSessionProvider, useAuthSession } from "@/src/features/auth";
import { colors } from "@/src/shared/theme";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <RootStack />
      </AuthGate>
    </AuthSessionProvider>
  );
}

function RootStack() {
  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ai-route" />
        <Stack.Screen name="plogging" />
        <Stack.Screen name="report" />
        <Stack.Screen name="Map" />
      </Stack>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const { status } = useAuthSession();
  const onLoginRoute = segments[0] === "login";

  if (status === "loading") {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === "unauthenticated" && !onLoginRoute) {
    return <Redirect href="/login" />;
  }

  if (status === "authenticated" && onLoginRoute) {
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
