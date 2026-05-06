import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenRoot } from "@/src/shared/ui";
import { colors, shadows } from "@/src/shared/theme";

import { useAuthSession } from "../hooks/use-auth-session";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithKakao } = useAuthSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await signInWithKakao();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "카카오 로그인 중 문제가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenRoot>
      <View
        style={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 24,
            paddingTop: Math.max(insets.top, 44) + 48,
          },
        ]}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoFace}>{">  ·"}</Text>
          </View>
          <Text selectable style={styles.title}>
            PLOBER
          </Text>
          <Text selectable style={styles.subtitle}>
            카카오 계정으로 로그인하고 플로깅 기록을 이어가세요.
          </Text>
        </View>

        <View style={styles.actionBlock}>
          {errorMessage ? (
            <Text selectable style={styles.errorText}>
              {errorMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="카카오로 로그인"
            accessibilityRole="button"
            disabled={submitting}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.kakaoButton,
              pressed && !submitting ? styles.pressed : null,
              submitting ? styles.disabled : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Text selectable style={styles.kakaoButtonText}>
                카카오로 로그인
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  actionBlock: {
    gap: 14,
  },
  brandBlock: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.64,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  kakaoButton: {
    alignItems: "center",
    backgroundColor: "#FEE500",
    borderRadius: 14,
    height: 58,
    justifyContent: "center",
    ...shadows.button,
  },
  kakaoButtonText: {
    color: "#111111",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0,
  },
  logoFace: {
    color: colors.icon,
    fontSize: 28,
    fontWeight: "800",
    transform: [{ rotate: "7deg" }],
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "#E9FFBE",
    borderRadius: 24,
    height: 108,
    justifyContent: "center",
    marginBottom: 28,
    width: 108,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
