export const reportMetrics = [
  { label: "걸음 수", value: "17,000", unit: "steps" },
  { label: "플로깅 시간", value: "1:41", unit: "H:M" },
  { label: "소모 칼로리", value: "428", unit: "kcal" },
  { label: "휴식", value: "0:30", unit: "H:M" },
] as const;

export type ReportMetric = (typeof reportMetrics)[number];
