import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/shared/theme";
import { BackButton, ScreenRoot } from "@/src/shared/ui";

const sections = [
  {
    title: "수집하는 정보",
    body:
      "플로버는 서비스 제공을 위해 로그인 식별 정보, 이메일, 닉네임, 프로필 이미지, 플로깅 기록, 위치 좌표, 이동 거리, 걸음 수, 촬영 또는 선택한 이미지, 크루명, 크루 가입 및 활동 참여 정보, 앱 이용 중 발생하는 요청 정보를 처리할 수 있습니다.",
  },
  {
    title: "이용 목적",
    body:
      "수집한 정보는 회원 인증, 플로깅 경로 기록, 경로 추천, 주변 시설 표시, 쓰레기 사진 분석, 프로필 관리, 누적 통계 제공, 크루 생성·가입·멤버 관리, 같이줍기 진행 및 공동 기록 제공, 고객 문의 대응, 서비스 안정성 개선을 위해 사용합니다.",
  },
  {
    title: "권한 사용",
    body:
      "위치 권한은 현재 위치 표시, 플로깅 경로 기록과 사용자가 선택한 쓰레기 제보의 촬영 위치 확인에, 동작 및 피트니스 권한은 걸음 수 측정에 사용합니다. 카메라 권한은 플로깅 인증샷과 쓰레기 제보 사진 촬영에, 사진 보관함 권한은 프로필 이미지 선택과 리포트 이미지 저장에 사용합니다. 권한은 iOS 설정에서 언제든 변경할 수 있습니다.",
  },
  {
    title: "쓰레기 사진 분석",
    body:
      "쓰레기 사진 제보는 선택 사항입니다. 전송 전에 촬영한 사진과 현재 정밀 위치를 플로버 서버로 보내 쓰레기 여부를 분석한다는 내용을 안내하고 동의를 요청합니다. 동의하지 않으면 사진과 위치를 전송하지 않으며 다른 기능은 계속 사용할 수 있습니다.",
  },
  {
    title: "크루 내 정보 공유",
    body:
      "크루에 가입하면 닉네임, 프로필 이미지, 참여 상태, 활동 통계, 제출한 플로깅 기록과 인증 사진이 같은 크루의 구성원에게 표시될 수 있습니다. 크루는 6자리 초대넘버로 가입하며, 공개 피드나 채팅 기능은 제공하지 않습니다.",
  },
  {
    title: "제3자 서비스",
    body:
      "플로버는 서비스 제공을 위해 Apple 로그인, Kakao 로그인, Naver Map SDK, 이미지 저장소, 서버 인프라와 연동할 수 있습니다. 각 제공자는 서비스 수행에 필요한 범위에서만 정보를 처리합니다.",
  },
  {
    title: "보관 및 삭제",
    body:
      "회원 정보와 플로깅 기록은 계정 유지 기간 동안 보관합니다. 크루를 탈퇴하거나 크루에서 제외되어도 공동 활동의 맥락을 유지하기 위해 과거 기록과 공유 사진이 남을 수 있습니다. 사용자가 앱 내 회원 탈퇴를 요청하면 계정과 연결된 정보의 삭제 또는 비식별 처리를 요청하며, 법령상 보관이 필요한 정보는 해당 기간 동안 분리 보관할 수 있습니다.",
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
            시행일 2026.07.22
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
