import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/shared/theme";
import { BackButton, ScreenRoot } from "@/src/shared/ui";

const sections = [
  {
    title: "수집하는 정보",
    body:
      "플로버는 서비스 제공을 위해 로그인 식별 정보, 닉네임, 프로필 이미지, 플로깅 기록, 위치 좌표, 이동 거리, 걸음 수, 촬영 또는 선택한 이미지, 앱 이용 중 발생하는 요청 정보를 처리할 수 있습니다.",
  },
  {
    title: "이용 목적",
    body:
      "수집한 정보는 회원 인증, 플로깅 경로 기록, 경로 추천, 주변 시설 표시, 쓰레기 사진 분석, 프로필 관리, 누적 통계 제공, 고객 문의 대응, 서비스 안정성 개선을 위해 사용합니다.",
  },
  {
    title: "권한 사용",
    body:
      "위치 권한은 현재 위치 표시와 플로깅 경로 기록에, 동작 및 피트니스 권한은 걸음 수 측정에, 카메라 권한은 플로깅 인증샷 촬영에, 사진 보관함 권한은 프로필 이미지 선택에 사용합니다. 권한은 iOS 설정에서 언제든 변경할 수 있습니다.",
  },
  {
    title: "제3자 서비스",
    body:
      "플로버는 서비스 제공을 위해 Apple 로그인, Kakao 로그인, Naver Map SDK, 이미지 저장소, 서버 인프라와 연동할 수 있습니다. 각 제공자는 서비스 수행에 필요한 범위에서만 정보를 처리합니다.",
  },
  {
    title: "보관 및 삭제",
    body:
      "회원 정보와 플로깅 기록은 계정 유지 기간 동안 보관하며, 사용자가 앱 내 회원 탈퇴를 요청하면 계정과 관련 기록의 삭제를 요청합니다. 법령상 보관이 필요한 정보는 해당 기간 동안 분리 보관할 수 있습니다.",
  },
  {
    title: "문의",
    body:
      "개인정보 처리와 서비스 이용에 관한 문의는 앱의 문의 및 지원 화면을 통해 접수할 수 있습니다.",
  },
];

export function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          <Text selectable style={styles.eyebrow}>
            시행일 2026.05.21
          </Text>
          <Text selectable style={styles.title}>
            개인정보 처리방침
          </Text>
          <Text selectable style={styles.lead}>
            플로버는 필요한 정보만 요청하고, 수집한 정보는 플로깅 경험을 제공하는 목적에 맞게 처리합니다.
          </Text>
        </View>

        <View style={styles.sectionList}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text selectable style={styles.sectionTitle}>
                {section.title}
              </Text>
              <Text selectable style={styles.bodyText}>
                {section.body}
              </Text>
            </View>
          ))}
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
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
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
  section: {
    gap: 8,
  },
  sectionList: {
    gap: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
