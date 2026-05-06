import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenRoot } from "@/src/shared/ui";
import { colors } from "@/src/shared/theme";

import { useAuthSession } from "../hooks/use-auth-session";

export function KakaoLoginRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { completeKakaoLoginWithCode } = useAuthSession();
  const completedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    params.error ?? null
  );

  useEffect(() => {
    if (completedRef.current || errorMessage) return;
    completedRef.current = true;

    const code = Array.isArray(params.code) ? params.code[0] : params.code;

    if (!code) {
      setErrorMessage("카카오 인가 코드를 찾을 수 없습니다.");
      return;
    }

    completeKakaoLoginWithCode(code)
      .then(() => {
        router.replace("/");
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "카카오 로그인 중 문제가 발생했습니다."
        );
      });
  }, [completeKakaoLoginWithCode, errorMessage, params.code, router]);

  return (
    <ScreenRoot>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <Text selectable style={styles.title}>
              로그인에 실패했습니다.
            </Text>
            <Text selectable style={styles.description}>
              {errorMessage}
            </Text>
            <Pressable
              accessibilityLabel="로그인 화면으로 돌아가기"
              accessibilityRole="button"
              onPress={() => router.replace("/login")}
              style={({ pressed }) => [
                styles.button,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text selectable style={styles.buttonText}>
                다시 시도
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text selectable style={styles.description}>
              카카오 로그인 처리 중입니다.
            </Text>
          </>
        )}
      </View>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
});
