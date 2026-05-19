import type { OpenTimeType } from "../api/types";

// 운영 시간대에 따른 마커 색상. 플로깅 중 "지금 이용 가능한가?"가 가장 직관적인
// 정보이므로 toiletType(공중/개방) 대신 openTimeType을 색의 기준으로 삼는다.
// 쓰레기통 마커(회색/녹색/청록)와 시각적으로 겹치지 않도록 보라 계열을 사용한다.
const OPEN_TIME_TINT: Record<"상시" | "정시" | "불규칙", string> = {
  상시: "#8B5CF6",
  정시: "#C4B5FD",
  불규칙: "#A1A1AA",
};

// 빈값(정보 없음)이나 알 수 없는 값이 내려와도 마커가 사라지지 않도록 안전한 기본값을 둔다.
const FALLBACK_TINT = OPEN_TIME_TINT["불규칙"];

export function getToiletTintColor(openTimeType: OpenTimeType): string {
  if (openTimeType === "상시") return OPEN_TIME_TINT["상시"];
  if (openTimeType === "정시") return OPEN_TIME_TINT["정시"];
  if (openTimeType === "불규칙") return OPEN_TIME_TINT["불규칙"];
  return FALLBACK_TINT;
}
