import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/shared/theme";
import { BackButton, ScreenRoot } from "@/src/shared/ui";

const SUPPORT_URL = "https://econovation.kr/contact";

export function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const openSupport = async () => {
    try {
      await Linking.openURL(SUPPORT_URL);
    } catch {
      Alert.alert("문의 페이지를 열 수 없습니다", SUPPORT_URL);
    }
  };

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 36,
            paddingTop: Math.max(insets.top, 44) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.back()} />
        <View style={styles.header}>
          <Text selectable style={styles.title}>
            문의 및 지원
          </Text>
          <Text selectable style={styles.lead}>
            계정, 기록, 권한, 오류 문의가 필요하면 아래 지원 페이지로 연락해주세요.
          </Text>
        </View>

        <Pressable
          accessibilityLabel="지원 페이지 열기"
          accessibilityRole="link"
          onPress={openSupport}
          style={({ pressed }) => [
            styles.supportLink,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.supportIcon}>
            <Feather color={colors.surface} name="external-link" size={18} />
          </View>
          <View style={styles.supportTextBlock}>
            <Text selectable style={styles.supportTitle}>
              지원 페이지
            </Text>
            <Text selectable numberOfLines={1} style={styles.supportUrl}>
              {SUPPORT_URL}
            </Text>
          </View>
          <Feather color={colors.subtle} name="chevron-right" size={20} />
        </Pressable>

        <View style={styles.section}>
          <Text selectable style={styles.sectionTitle}>
            계정 삭제
          </Text>
          <Text selectable style={styles.bodyText}>
            프로필 화면의 회원 탈퇴 버튼으로 계정 삭제를 요청할 수 있습니다. 삭제 요청 후에는 계정과 연결된 플로깅 기록도 함께 삭제 요청됩니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text selectable style={styles.sectionTitle}>
            권한 변경
          </Text>
          <Text selectable style={styles.bodyText}>
            위치, 동작 및 피트니스, 카메라, 사진 접근 권한은 iOS 설정 앱에서 언제든 변경할 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 22,
  },
  content: {
    gap: 26,
    paddingHorizontal: 24,
  },
  header: {
    gap: 10,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 23,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
  },
  supportIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  supportLink: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  supportTextBlock: {
    flex: 1,
    gap: 3,
  },
  supportTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0,
  },
  supportUrl: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
