import { useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenRoot } from "@/src/shared/ui";
import { colors, shadows } from "@/src/shared/theme";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLogin = () => {
    router.push("/kakao-login");
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
          <Pressable
            accessibilityLabel="카카오로 로그인"
            accessibilityRole="button"
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.kakaoButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text selectable style={styles.kakaoButtonText}>
              카카오로 로그인
            </Text>
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
