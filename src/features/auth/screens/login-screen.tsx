import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenRoot } from "@/src/shared/ui";
import { colors, shadows } from "@/src/shared/theme";

import { useAuthSession } from "../hooks/use-auth-session";
import { isAppleLoginCanceled } from "../services/apple-auth";
import { isKakaoLoginCanceled } from "../services/kakao-auth";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeAppleLoginWithCredential, completeKakaoLoginWithSdk } =
    useAuthSession();
  const [appleLoginAvailable, setAppleLoginAvailable] = useState(false);
  const [appleLoginSubmitting, setAppleLoginSubmitting] = useState(false);
  const [appleLoginErrorMessage, setAppleLoginErrorMessage] = useState<
    string | null
  >(null);
  const [kakaoLoginSubmitting, setKakaoLoginSubmitting] = useState(false);
  const [kakaoLoginErrorMessage, setKakaoLoginErrorMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      if (__DEV__) {
        console.log("[apple-login-screen] skip availability check", {
          platform: Platform.OS,
        });
      }
      return;
    }

    let mounted = true;
    if (__DEV__) {
      console.log("[apple-login-screen] availability check start");
    }

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (__DEV__) {
          console.log("[apple-login-screen] availability check result", {
            available,
          });
        }
        if (mounted) setAppleLoginAvailable(available);
      })
      .catch((error) => {
        if (__DEV__) {
          console.log("[apple-login-screen] availability check error", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        if (mounted) setAppleLoginAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
    if (kakaoLoginSubmitting) return;

    setKakaoLoginSubmitting(true);
    setKakaoLoginErrorMessage(null);

    try {
      await completeKakaoLoginWithSdk();
      if (__DEV__) {
        console.log("[kakao-login-screen] login completed");
      }
    } catch (error) {
      if (isKakaoLoginCanceled(error)) {
        if (__DEV__) {
          console.log("[kakao-login-screen] login canceled by user");
        }
        return;
      }

      if (__DEV__) {
        console.log("[kakao-login-screen] login failed", {
          message: error instanceof Error ? error.message : "unknown error",
          name: error instanceof Error ? error.name : "unknown",
        });
      }

      setKakaoLoginErrorMessage(
        error instanceof Error
          ? error.message
          : "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setKakaoLoginSubmitting(false);
    }
  };

  const handleAppleLogin = async () => {
    if (__DEV__) {
      console.log("[apple-login-screen] button pressed", {
        appleLoginAvailable,
        appleLoginSubmitting,
        platform: Platform.OS,
      });
    }

    if (appleLoginSubmitting) return;

    setAppleLoginSubmitting(true);
    setAppleLoginErrorMessage(null);

    try {
      await completeAppleLoginWithCredential();
      if (__DEV__) {
        console.log("[apple-login-screen] login completed");
      }
    } catch (error) {
      if (isAppleLoginCanceled(error)) {
        if (__DEV__) {
          console.log("[apple-login-screen] login canceled by user");
        }
        return;
      }

      if (__DEV__) {
        console.log("[apple] login failed", {
          message: error instanceof Error ? error.message : "unknown error",
          name: error instanceof Error ? error.name : "unknown",
          rawError: error,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      setAppleLoginErrorMessage(
        error instanceof Error
          ? error.message
          : "Apple 로그인에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      if (__DEV__) {
        console.log("[apple-login-screen] login flow finished");
      }
      setAppleLoginSubmitting(false);
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
          {appleLoginAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              cornerRadius={14}
              onPress={handleAppleLogin}
              style={[
                styles.appleButton,
                appleLoginSubmitting ? styles.disabled : null,
              ]}
            />
          ) : null}

          <Pressable
            accessibilityLabel="카카오로 로그인"
            accessibilityRole="button"
            disabled={kakaoLoginSubmitting}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.kakaoButton,
              pressed ? styles.pressed : null,
              kakaoLoginSubmitting ? styles.disabled : null,
            ]}
          >
            <Text selectable style={styles.kakaoButtonText}>
              카카오로 로그인
            </Text>
          </Pressable>

          {appleLoginErrorMessage ? (
            <Text selectable style={styles.errorMessage}>
              {appleLoginErrorMessage}
            </Text>
          ) : null}
          {kakaoLoginErrorMessage ? (
            <Text selectable style={styles.errorMessage}>
              {kakaoLoginErrorMessage}
            </Text>
          ) : null}
          <LegalFooter
            onOpenPrivacy={() => router.push("/privacy")}
            onOpenSupport={() => router.push("/support")}
          />
        </View>
      </View>
    </ScreenRoot>
  );
}

function LegalFooter({
  onOpenPrivacy,
  onOpenSupport,
}: {
  onOpenPrivacy: () => void;
  onOpenSupport: () => void;
}) {
  return (
    <View style={styles.legalFooter}>
      <Pressable
        accessibilityLabel="개인정보 처리방침"
        accessibilityRole="link"
        hitSlop={6}
        onPress={onOpenPrivacy}
        style={({ pressed }) => [
          styles.legalFooterButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text selectable style={styles.legalFooterText}>
          개인정보 처리방침
        </Text>
      </Pressable>
      <View style={styles.legalFooterDivider} />
      <Pressable
        accessibilityLabel="문의 및 지원"
        accessibilityRole="link"
        hitSlop={6}
        onPress={onOpenSupport}
        style={({ pressed }) => [
          styles.legalFooterButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text selectable style={styles.legalFooterText}>
          문의 및 지원
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBlock: {
    gap: 14,
  },
  appleButton: {
    height: 58,
    width: "100%",
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
    opacity: 0.62,
  },
  errorMessage: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
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
  legalFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 2,
  },
  legalFooterButton: {
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 4,
  },
  legalFooterDivider: {
    backgroundColor: colors.line,
    height: 13,
    width: 1,
  },
  legalFooterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
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
