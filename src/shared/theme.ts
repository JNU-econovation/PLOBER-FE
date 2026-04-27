import type { TextStyle } from "react-native";

export const colors = {
  background: "#FCFCFD",
  surface: "#FFFFFF",
  text: "#111111",
  muted: "#757575",
  subtle: "#A7A7A7",
  line: "#E6E6E6",
  primary: "#40A461",
  primaryDark: "#47905A",
  primarySoft: "#F0FAF3",
  danger: "#FF5F6A",
  icon: "#222222",
} as const;

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
