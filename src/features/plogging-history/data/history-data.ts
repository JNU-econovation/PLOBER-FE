import { colors } from "../../../shared/theme";

export const weeklyBars = [
  { day: "월", height: 53, color: colors.primary },
  { day: "화", height: 67, color: colors.primaryDark },
  { day: "수", height: 7, color: "#D9D9D9" },
  { day: "목", height: 67, color: colors.primaryDark },
  { day: "금", height: 53, color: colors.primary },
  { day: "토", height: 7, color: "#D9D9D9" },
  { day: "일", height: 23, color: colors.primarySoft },
] as const;
