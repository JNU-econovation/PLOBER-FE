export const routeOptions = [
  { id: "time", title: "시간 우선 경로", minutes: 22, distance: "1km" },
  { id: "street", title: "큰길 우선 경로", minutes: 22, distance: "1km" },
  { id: "clean", title: "수거 우선 경로", minutes: 25, distance: "1.2km" },
] as const;

export type RouteOptionId = (typeof routeOptions)[number]["id"];
