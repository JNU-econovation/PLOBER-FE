import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
} from "@mj-studio/react-native-naver-map";
import { captureRef } from "react-native-view-shot";

import type { RoutePoint } from "@/src/features/plogging-session";
import { colors } from "@/src/shared/theme";

type RouteSnapshotMapProps = {
  routePoints: RoutePoint[];
  onCaptured: (uri: string) => void;
  onCaptureFailed?: (error: unknown) => void;
  style?: StyleProp<ViewStyle>;
};

// 단일 좌표만 있을 때 보여줄 기본 영역 크기 (약 ±275m).
const SINGLE_POINT_DELTA = 0.005;

// 경로 영역 좌우/상하 여백 비율.
const REGION_PADDING_RATIO = 1.4;

// onInitialized 이후 타일이 실제로 그려지기까지 약간의 여유.
const CAPTURE_DELAY_MS = 600;

export function RouteSnapshotMap({
  routePoints,
  onCaptured,
  onCaptureFailed,
  style,
}: RouteSnapshotMapProps) {
  const containerRef = useRef<View>(null);
  const capturedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady || capturedRef.current) return;
    capturedRef.current = true;

    const timer = setTimeout(async () => {
      try {
        if (__DEV__) {
          console.log("[plogging-snapshot] capturing");
        }
        const uri = await captureRef(containerRef, {
          format: "png",
          quality: 0.9,
          result: "tmpfile",
        });
        if (__DEV__) {
          console.log("[plogging-snapshot] captured", { uri });
        }
        onCaptured(uri);
      } catch (error) {
        if (__DEV__) {
          console.log("[plogging-snapshot] capture failed", {
            message:
              error instanceof Error ? error.message : "unknown capture error",
          });
        }
        // 한 번 실패하더라도 다음 mount 시 재시도할 수 있도록 가드 해제.
        capturedRef.current = false;
        onCaptureFailed?.(error);
      }
    }, CAPTURE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [mapReady, onCaptured, onCaptureFailed]);

  const region = computeRegion(routePoints);

  return (
    <View ref={containerRef} collapsable={false} style={[styles.root, style]}>
      <NaverMapView
        initialRegion={region}
        isShowLocationButton={false}
        isShowZoomControls={false}
        onInitialized={() => setMapReady(true)}
        style={StyleSheet.absoluteFill}
      >
        {routePoints.length >= 2 ? (
          <NaverMapPolylineOverlay
            color={colors.primary}
            coords={routePoints}
            width={8}
          />
        ) : routePoints.length === 1 ? (
          <NaverMapMarkerOverlay
            latitude={routePoints[0].latitude}
            longitude={routePoints[0].longitude}
          />
        ) : null}
      </NaverMapView>
    </View>
  );
}

function computeRegion(points: RoutePoint[]) {
  if (points.length === 0) {
    // 호출 측에서 이 컴포넌트를 빈 경로일 때 렌더하지 않도록 가드해야 한다.
    // 방어용 fallback: 한반도 중앙.
    return {
      latitude: 36.5,
      latitudeDelta: 1,
      longitude: 127.8,
      longitudeDelta: 1,
    };
  }

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = (maxLat - minLat) * REGION_PADDING_RATIO;
  const lngSpan = (maxLng - minLng) * REGION_PADDING_RATIO;

  return {
    latitude: minLat - (latSpan - (maxLat - minLat)) / 2,
    latitudeDelta: latSpan || SINGLE_POINT_DELTA,
    longitude: minLng - (lngSpan - (maxLng - minLng)) / 2,
    longitudeDelta: lngSpan || SINGLE_POINT_DELTA,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
});
