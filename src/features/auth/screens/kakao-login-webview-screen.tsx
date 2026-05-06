import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { WebViewProps } from "react-native-webview";

import { ScreenRoot } from "@/src/shared/ui";
import { colors } from "@/src/shared/theme";

import {
  buildKakaoAuthorizeUrl,
  getKakaoRedirectResult,
  isKakaoRedirectUrl,
} from "../services/kakao-auth";

declare const require: <T = unknown>(moduleName: string) => T;

type WebViewModule = {
  WebView: React.ComponentType<WebViewProps>;
};

function getWebViewComponent() {
  if (!NativeModules.RNCWebViewModule) return null;

  try {
    return require<WebViewModule>("react-native-webview").WebView;
  } catch {
    return null;
  }
}

export function KakaoLoginWebviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const WebView = useMemo(() => getWebViewComponent(), []);
  const authorizeUrl = useMemo(() => {
    try {
      return buildKakaoAuthorizeUrl();
    } catch (error) {
      return error instanceof Error ? error.message : "";
    }
  }, []);

  const handleRedirectUrl = (url: string) => {
    if (!isKakaoRedirectUrl(url)) return false;

    try {
      const code = getKakaoRedirectResult(url);
      if (!code) {
        router.replace({
          pathname: "/kakao-redirect",
          params: { error: "카카오 인가 코드를 찾을 수 없습니다." },
        });
        return true;
      }

      router.replace({
        pathname: "/kakao-redirect",
        params: { code },
      });
    } catch (error) {
      router.replace({
        pathname: "/kakao-redirect",
        params: {
          error:
            error instanceof Error
              ? error.message
              : "카카오 로그인 중 문제가 발생했습니다.",
        },
      });
    }

    return true;
  };

  if (!WebView) {
    return (
      <ScreenRoot>
        <View style={[styles.centerContent, { paddingTop: insets.top }]}>
          <Text selectable style={styles.errorTitle}>
            개발 빌드 재생성이 필요합니다.
          </Text>
          <Text selectable style={styles.errorDescription}>
            카카오 로그인 WebView를 사용하려면 react-native-webview가 포함된
            dev client로 다시 빌드해야 합니다.
          </Text>
          <Pressable
            accessibilityLabel="로그인 화면으로 돌아가기"
            accessibilityRole="button"
            onPress={() => router.replace("/login")}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text selectable style={styles.backButtonText}>
              돌아가기
            </Text>
          </Pressable>
        </View>
      </ScreenRoot>
    );
  }

  if (!authorizeUrl.startsWith("https://")) {
    return (
      <ScreenRoot>
        <View style={[styles.centerContent, { paddingTop: insets.top }]}>
          <Text selectable style={styles.errorTitle}>
            카카오 로그인 설정이 필요합니다.
          </Text>
          <Text selectable style={styles.errorDescription}>
            {authorizeUrl}
          </Text>
        </View>
      </ScreenRoot>
    );
  }

  return (
    <ScreenRoot>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          accessibilityLabel="로그인 취소"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.replace("/login")}
          style={({ pressed }) => [
            styles.iconButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Feather color={colors.icon} name="x" size={22} />
        </Pressable>
        <Text selectable style={styles.headerTitle}>
          카카오 로그인
        </Text>
        <View style={styles.iconButton} />
      </View>
      {loading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      <WebView
        incognito
        javaScriptEnabled
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(event) => {
          handleRedirectUrl(event.url);
        }}
        onShouldStartLoadWithRequest={(request) => {
          return !handleRedirectUrl(request.url);
        }}
        originWhitelist={["*"]}
        source={{ uri: authorizeUrl }}
        startInLoadingState
        style={styles.webview}
      />
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorDescription: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: colors.surface,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 64,
    zIndex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  webview: {
    flex: 1,
  },
});
