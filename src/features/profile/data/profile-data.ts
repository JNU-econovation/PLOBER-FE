export const profileSummaryStats = [
  { label: "플로깅", value: "41", unit: "회" },
  { label: "총 누적 걸음", value: "20.1", unit: "만보" },
  { label: "총 누적 거리", value: "3.42", unit: "km" },
] as const;

export const monthlyActivityDays: Record<string, readonly number[]> = {
  "2026-03": [2, 6, 12, 15, 21, 28],
  "2026-04": [3, 4, 8, 10, 11, 17, 23, 25],
  "2026-05": [1, 5, 9, 14, 18, 22, 27],
};

export type CalendarMonth = {
  month: number;
  year: number;
};

export const DEFAULT_PROFILE_CALENDAR: CalendarMonth = {
  month: 3,
  year: 2026,
};
