export const weeklyBars = [
  { day: "월", height: 53, color: "#6FB381" },
  { day: "화", height: 67, color: "#47905A" },
  { day: "수", height: 7, color: "#D9D9D9" },
  { day: "목", height: 67, color: "#47905A" },
  { day: "금", height: 53, color: "#6FB381" },
  { day: "토", height: 7, color: "#D9D9D9" },
  { day: "일", height: 23, color: "#87CC9B" },
] as const;

export const historyRecords = [
  {
    place: "용봉동 일대",
    time: "4월 21일 화 12:56 - 13:34",
    distance: "3.42",
    color: "#F7CF46",
    background: "#FDF7E6",
  },
  {
    place: "전남대 캠퍼스",
    time: "4월 18일 토 12:56 - 13:34",
    distance: "5.10",
    color: "#74A5F8",
    background: "#F3F8FE",
  },
  {
    place: "전남대 캠퍼스",
    time: "4월 18일 토 12:56 - 13:34",
    distance: "7.20",
    color: "#D9D9D9",
    background: "#F9F9F9",
  },
] as const;

export type HistoryRecord = (typeof historyRecords)[number];
