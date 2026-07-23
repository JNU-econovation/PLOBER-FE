import { Image } from "expo-image";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  LeaderEndConfirmationRenderProps,
} from "@/src/features/plogging-session/screens/active-plogging-screen";
import { fontFamilies, getSafeLineHeight } from "@/src/shared/theme";

type RecruitingCancelModalProps = {
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export function RecruitingCancelModal({
  confirming,
  onCancel,
  onConfirm,
  visible,
}: RecruitingCancelModalProps) {
  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable disabled={confirming} onPress={onCancel} style={styles.dim} />
        <View style={styles.choiceCard}>
          <Pressable
            accessibilityLabel="닫기"
            disabled={confirming}
            hitSlop={8}
            onPress={onCancel}
            style={styles.closeButton}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/icons/crew-close.svg")}
              style={styles.closeIcon}
            />
          </Pressable>
          <Text style={styles.recruitCancelTitle}>
            같이 뛰기를 <Text style={styles.recruitCancelStrong}>취소</Text>하시겠습니까?
          </Text>
          <View style={styles.choiceButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: confirming }}
              disabled={confirming}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.smallButton,
                styles.mineButton,
                pressed ? styles.pressed : null,
              ]}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.recruitConfirmText}>예</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={confirming}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.smallButton,
                styles.allButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.recruitCancelButtonText}>아니오</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function LeaderEndConfirmationModal({
  confirming,
  onCancel,
  onConfirm,
  visible,
}: LeaderEndConfirmationRenderProps) {
  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          disabled={confirming}
          onPress={onCancel}
          style={styles.dim}
        />
        <View style={styles.confirmCard}>
          <Pressable
            accessibilityLabel="닫기"
            disabled={confirming}
            hitSlop={8}
            onPress={onCancel}
            style={styles.closeButton}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/icons/crew-close.svg")}
              style={styles.closeIcon}
            />
          </Pressable>
          <Text style={styles.confirmTitle}>같이줍기를 종료하시겠습니까?</Text>
          <Text style={styles.confirmDescription}>
            종료하면 참여 중인 모든 크루원의{"\n"}같이줍기가 함께 종료됩니다.
          </Text>
          <View style={styles.confirmButtons}>
            <Pressable
              accessibilityRole="button"
              disabled={confirming}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.smallButton,
                styles.allButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.allButtonText}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: confirming }}
              disabled={confirming}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.smallButton,
                styles.dangerButton,
                pressed ? styles.pressed : null,
              ]}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.dangerButtonText}>전체 종료</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  allButton: {
    backgroundColor: "#F5F5F5",
  },
  allButtonText: {
    color: "#727272",
    fontFamily: fontFamilies.gothicA1SemiBold,
    fontSize: 15,
    letterSpacing: -0.36,
  },
  choiceButtons: {
    bottom: 16,
    flexDirection: "row",
    gap: 12,
    left: 20,
    position: "absolute",
    right: 20,
  },
  choiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 14px 40px rgba(0,0,0,0.2)",
    elevation: 12,
    height: 184,
    maxWidth: 340,
    width: "100%",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 12,
    width: 44,
    zIndex: 2,
  },
  closeIcon: {
    height: 14,
    width: 14,
  },
  confirmButtons: {
    bottom: 16,
    flexDirection: "row",
    gap: 12,
    left: 20,
    position: "absolute",
    right: 20,
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 14px 40px rgba(0,0,0,0.2)",
    elevation: 12,
    height: 232,
    maxWidth: 340,
    width: "100%",
  },
  confirmDescription: {
    color: "#5C635C",
    fontFamily: fontFamilies.gothicA1Regular,
    fontSize: 12.5,
    left: 20,
    lineHeight: getSafeLineHeight(12.5, fontFamilies.gothicA1Regular, 19),
    position: "absolute",
    right: 20,
    textAlign: "center",
    top: 96,
  },
  confirmTitle: {
    color: "#121212",
    fontFamily: fontFamilies.gothicA1Regular,
    fontSize: 17,
    left: 20,
    letterSpacing: -0.34,
    lineHeight: getSafeLineHeight(17, fontFamilies.gothicA1Regular, 23.8),
    position: "absolute",
    right: 20,
    textAlign: "center",
    top: 58,
  },
  dangerButton: {
    backgroundColor: "#FF383C",
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.gothicA1SemiBold,
    fontSize: 15,
    letterSpacing: -0.36,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,18,18,0.35)",
  },
  mineButton: {
    backgroundColor: "#449DDD",
  },
  pressed: {
    opacity: 0.72,
  },
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  recruitCancelButtonText: {
    color: "#727272",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  recruitCancelStrong: {
    fontFamily: fontFamilies.semiBold,
  },
  recruitCancelTitle: {
    color: "#000000",
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    left: 20,
    letterSpacing: -0.36,
    lineHeight: 25.2,
    position: "absolute",
    right: 20,
    textAlign: "center",
    top: 59,
  },
  recruitConfirmText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  smallButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
});
