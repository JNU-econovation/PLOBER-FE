import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  NaverMapMarkerOverlay,
  NaverMapPolygonOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";

import { useDeviceLocation } from "../../location";
import { colors } from "../../theme";
import { CAMPUS_CAMERA, ROUTE_COORDS } from "../data/map-data";
import { useHotspotPolygons } from "../hooks/use-hotspot-polygons";
import { getHotspotColor } from "../services/hotspot-tiles";
import type { PloggingMapProps } from "./types";

// 이 이상 좌표가 변할 때만 카메라를 다시 애니메이션한다(약 22m).
// GPS 지터로 카메라가 계속 흔들리지 않게 막는 임계값.
const CAMERA_ANIMATE_THRESHOLD = 0.0002;

export function PloggingMap({
  children,
  routeVisible = false,
  routePoints,
  heatmapVisible = false,
  dimmed = false,
  style,
  zoom,
  followUserLocation = true,
  trashBins,
  toilets,
}: PloggingMapProps) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const { position } = useDeviceLocation();
  const hotspots = useHotspotPolygons(heatmapVisible);
  const visibleRoutePoints =
    routePoints && routePoints.length >= 2 ? routePoints : ROUTE_COORDS;

  // 최초 카메라는 mount 시점 공유 위치(없으면 CAMPUS_CAMERA fallback).
  // 이후 위치 변경은 animateCameraTo로 부드럽게 이동시킨다.
  const initialPositionRef = useRef(position);
  const lastAnimatedRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  // 카메라 점프 검증용(>100m 이동 시만 로그).
  const lastCameraLogRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const initialCamera = {
    latitude:
      initialPositionRef.current?.latitude ?? CAMPUS_CAMERA.latitude,
    longitude:
      initialPositionRef.current?.longitude ?? CAMPUS_CAMERA.longitude,
    zoom: zoom ?? CAMPUS_CAMERA.zoom,
  };

  useEffect(() => {
    if (!followUserLocation || !position) return;
    const prev = lastAnimatedRef.current;
    if (prev) {
      const dLat = Math.abs(position.latitude - prev.latitude);
      const dLng = Math.abs(position.longitude - prev.longitude);
      if (dLat < CAMERA_ANIMATE_THRESHOLD && dLng < CAMERA_ANIMATE_THRESHOLD) {
        return;
      }
    }
    mapRef.current?.animateCameraTo({
      latitude: position.latitude,
      longitude: position.longitude,
      zoom: zoom ?? CAMPUS_CAMERA.zoom,
      duration: 500,
    });
    lastAnimatedRef.current = {
      latitude: position.latitude,
      longitude: position.longitude,
    };
  }, [followUserLocation, position?.latitude, position?.longitude, zoom]);

  const handleInitialized = () => {
    if (__DEV__) {
      console.log("[map-gps] map initialized", { followUserLocation });
    }
    // Naver SDK Follow 모드는 자체 위치 캐시(서울)로 카메라를 보내는 버그가 있어
    // 사용하지 않는다. 파란 점 오버레이만 표시한다.
    mapRef.current?.setLocationTrackingMode("NoFollow");
  };

  return (
    <View style={[styles.container, style]}>
      <NaverMapView
        ref={mapRef}
        initialCamera={initialCamera}
        isShowLocationButton={false}
        isShowZoomControls={false}
        locationOverlay={
          followUserLocation ? { isVisible: true } : undefined
        }
        onCameraChanged={
          __DEV__
            ? (params) => {
                const prev = lastCameraLogRef.current;
                const dLat = prev
                  ? Math.abs(params.latitude - prev.latitude)
                  : Infinity;
                const dLng = prev
                  ? Math.abs(params.longitude - prev.longitude)
                  : Infinity;
                if (dLat > 0.001 || dLng > 0.001) {
                  console.log("[map-gps] camera moved", {
                    latitude: params.latitude,
                    longitude: params.longitude,
                    reason: params.reason,
                  });
                  lastCameraLogRef.current = {
                    latitude: params.latitude,
                    longitude: params.longitude,
                  };
                }
              }
            : undefined
        }
        onInitialized={handleInitialized}
        style={StyleSheet.absoluteFill}
      >
        {heatmapVisible
          ? hotspots.polygons.map((polygon) => (
              <NaverMapPolygonOverlay
                key={polygon.id}
                color={getHotspotColor(polygon.trashScore)}
                coords={polygon.coords}
                outlineColor="rgba(185, 28, 28, 0.12)"
                outlineWidth={0}
                zIndex={1}
              />
            ))
          : null}
        {routeVisible ? (
          <NaverMapPolylineOverlay
            color={colors.primary}
            coords={visibleRoutePoints}
            zIndex={2}
            width={8}
          />
        ) : null}
        {trashBins?.map((bin) => (
          <NaverMapMarkerOverlay
            key={`trash-${bin.id}`}
            latitude={bin.latitude}
            longitude={bin.longitude}
            tintColor={bin.tintColor}
          />
        ))}
        {toilets?.map((toilet) => (
          <NaverMapMarkerOverlay
            key={`toilet-${toilet.id}`}
            latitude={toilet.latitude}
            longitude={toilet.longitude}
            tintColor={toilet.tintColor}
          />
        ))}
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
