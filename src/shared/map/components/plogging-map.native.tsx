import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";

import { colors } from "../../theme";
import { CAMPUS_CAMERA, ROUTE_COORDS } from "../data/map-data";
import type { PloggingMapProps } from "./types";

export function PloggingMap({
  children,
  routeVisible = false,
  dimmed = false,
  style,
  zoom,
  followUserLocation = true,
}: PloggingMapProps) {
  const mapRef = useRef<NaverMapViewRef>(null);

  const handleInitialized = () => {
    if (followUserLocation) {
      // Follow: 위치 오버레이 표시 + 카메라 자동 추적.
      // 권한이 없으면 SDK 내부에서 no-op으로 처리된다.
      mapRef.current?.setLocationTrackingMode("Follow");
    }
  };

  return (
    <View style={[styles.container, style]}>
      <NaverMapView
        ref={mapRef}
        initialCamera={{ ...CAMPUS_CAMERA, zoom: zoom ?? CAMPUS_CAMERA.zoom }}
        isShowLocationButton={false}
        isShowZoomControls={false}
        locationOverlay={
          followUserLocation ? { isVisible: true } : undefined
        }
        onInitialized={handleInitialized}
        style={StyleSheet.absoluteFill}
      >
        {routeVisible ? (
          <NaverMapPolylineOverlay
            color={colors.primary}
            coords={ROUTE_COORDS}
            width={8}
          />
        ) : null}
      </NaverMapView>
      {dimmed ? <View style={styles.dimmed} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  dimmed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.50)",
    pointerEvents: "none",
  },
});
