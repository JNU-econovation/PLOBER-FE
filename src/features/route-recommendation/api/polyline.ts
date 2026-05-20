import type { RoutePoint } from "@/src/features/plogging-session/api/types";

export function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latResult = decodeValue(encoded, index);
    index = latResult.nextIndex;
    latitude += latResult.delta;

    const lonResult = decodeValue(encoded, index);
    index = lonResult.nextIndex;
    longitude += lonResult.delta;

    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return points;
}

function decodeValue(encoded: string, startIndex: number) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte = 0;

  do {
    byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20 && index <= encoded.length);

  return {
    delta: result & 1 ? ~(result >> 1) : result >> 1,
    nextIndex: index,
  };
}
