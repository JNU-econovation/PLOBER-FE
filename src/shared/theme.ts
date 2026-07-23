import type { TextStyle } from "react-native";

export const colors = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  text: "#121212",
  muted: "#727272",
  subtle: "#A3A3A3",
  line: "#E6E6E6",
  primary: "#449DDD",
  primaryDark: "#1B6CAE",
  primarySoft: "#8DC3EC",
  danger: "#FF5E5E",
  icon: "#222222",
} as const;

export const fontFamilies = {
  regular: "PretendardRegular",
  medium: "PretendardMedium",
  semiBold: "PretendardSemiBold",
  bold: "PretendardBold",
  extraBold: "PretendardExtraBold",
  gothicA1Regular: "GothicA1Regular",
  gothicA1SemiBold: "GothicA1SemiBold",
  gothicA1Bold: "GothicA1Bold",
  gothicA1ExtraBold: "GothicA1ExtraBold",
  giantsRegular: "GiantsRegular",
} as const;

type FontFamily = (typeof fontFamilies)[keyof typeof fontFamilies];

const fontLineHeightRatios: Record<FontFamily, number> = {
  [fontFamilies.regular]: 2444 / 2048,
  [fontFamilies.medium]: 2444 / 2048,
  [fontFamilies.semiBold]: 2444 / 2048,
  [fontFamilies.bold]: 2444 / 2048,
  [fontFamilies.extraBold]: 2444 / 2048,
  [fontFamilies.gothicA1Regular]: 1616 / 1024,
  [fontFamilies.gothicA1SemiBold]: 1616 / 1024,
  [fontFamilies.gothicA1Bold]: 1616 / 1024,
  [fontFamilies.gothicA1ExtraBold]: 1616 / 1024,
  [fontFamilies.giantsRegular]: 1410 / 1000,
};

/**
 * Returns a line height large enough for the custom font's vertical metrics.
 * Keeping this calculation centralized prevents ascenders from being clipped
 * when a design specifies a line height that is too close to the font size.
 */
export function getSafeLineHeight(
  fontSize: number,
  fontFamily: FontFamily,
  preferredLineHeight = 0
) {
  const minimumLineHeight = Math.ceil(
    fontSize * fontLineHeightRatios[fontFamily]
  );

  return Math.max(preferredLineHeight, minimumLineHeight);
}

export const shadows = {
  soft: {
    boxShadow: "0 0 21px rgba(0, 0, 0, 0.07)",
  },
  raised: {
    boxShadow: "0 0 30px rgba(0, 0, 0, 0.10)",
  },
  button: {
    boxShadow: "0 0 25px rgba(0, 0, 0, 0.12)",
  },
} as const;

export const typography: { number: TextStyle } = {
  number: {
    fontVariant: ["tabular-nums"],
  },
};
