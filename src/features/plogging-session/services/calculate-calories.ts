// 보편적으로 사용되는 단순 추정치: 1걸음당 약 0.04 kcal.
// 백엔드가 다른 공식을 기대하면 이 한 곳만 교체하면 된다.
const KCAL_PER_STEP = 0.04;

export function caloriesFromSteps(stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.round(stepCount * KCAL_PER_STEP);
}
