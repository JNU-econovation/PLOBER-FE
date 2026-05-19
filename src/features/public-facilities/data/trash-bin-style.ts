import type { TrashType } from "../api/types";

// 분류에 따른 마커 색상.
// "+ 겸용"은 두 색의 시각적 혼합이 어려워 별개 색(청록)으로,
// "기타"는 분류 불명을 암시하기 위해 옅은 회색으로 표현한다.
const TRASH_TYPE_TINT: Record<TrashType, string> = {
  일반쓰레기: "#6B7280",
  재활용쓰레기: "#22C55E",
  "일반쓰레기+재활용 겸용": "#0EA5E9",
  기타: "#A1A1AA",
};

// 알 수 없는 분류 값이 내려와도 마커가 사라지지 않도록 안전한 기본값을 둔다.
const FALLBACK_TINT = TRASH_TYPE_TINT["기타"];

export function getTrashBinTintColor(trashType: string): string {
  return TRASH_TYPE_TINT[trashType as TrashType] ?? FALLBACK_TINT;
}
