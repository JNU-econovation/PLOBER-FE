import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  NaverMapMarkerOverlay,
  NaverMapPolygonOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewProps,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";

import { useDeviceLocation } from "../../location";
import { colors } from "../../theme";
import { CAMPUS_CAMERA, ROUTE_COORDS } from "../data/map-data";
import { useHotspotPolygons } from "../hooks/use-hotspot-polygons";
import {
  getHotspotFillColor,
  getHotspotOutlineColor,
  getHotspotOutlineWidth,
} from "../services/hotspot-tiles";
import { HeatmapLegend } from "./heatmap-legend";
import type { PloggingMapProps } from "./types";

const FALLBACK_CAMERA = {
  latitude: 36.5,
  longitude: 127.8,
  zoom: 7,
};
// 이 이상 좌표가 변할 때만 카메라를 다시 애니메이션한다(약 22m).
// GPS 지터로 카메라가 계속 흔들리지 않게 막는 임계값.
const CAMERA_ANIMATE_THRESHOLD = 0.0002;
const FACILITY_MARKER_SIZE = 36;
const FACILITY_MARKER_HEIGHT = 44;
const FACILITY_MARKER_ICON_SIZE = 20;
const FACILITY_MARKER_HIDE_ZOOM = 13.8;
const FACILITY_MARKER_FULL_ZOOM = 15;
const FACILITY_MARKER_ZOOM_UPDATE_THRESHOLD = 0.04;
const HOTSPOT_CENTER_UPDATE_THRESHOLD = 0.00001;

type FacilityIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type CameraChangedParams = Parameters<
  NonNullable<NaverMapViewProps["onCameraChanged"]>
>[0];
type MapCoord = {
  latitude: number;
  longitude: number;
};

// 지도 전체를 덮는 내부 디밍 레이어. 경도 180도 경계를 한 폴리곤으로
// 가로지르면 SDK가 짧은 쪽으로 접을 수 있어 동/서반구를 나눠 그린다.
// React Native View로 지도를 덮으면 경로선까지 흐려지므로, 지도 심벌 위이자
// 경로선 아래인 global z-index에 반투명 폴리곤을 그린다.
const DIMMED_MAP_REGIONS: MapCoord[][] = [
  [
    { latitude: 85, longitude: -179.9 },
    { latitude: 85, longitude: 0.1 },
    { latitude: -85, longitude: 0.1 },
    { latitude: -85, longitude: -179.9 },
  ],
  [
    { latitude: 85, longitude: -0.1 },
    { latitude: 85, longitude: 179.9 },
    { latitude: -85, longitude: 179.9 },
    { latitude: -85, longitude: -0.1 },
  ],
];
const DIMMED_MAP_GLOBAL_Z_INDEX = 1;
const ROUTE_GLOBAL_Z_INDEX = 2;
const DIMMED_MAP_COLOR = "rgba(255, 255, 255, 0.50)";
const DIMMED_HEATMAP_COLOR = "rgba(255, 255, 255, 0.18)";

export function PloggingMap({
  children,
  routeVisible = false,
  routePoints,
  heatmapVisible = false,
  heatmapLegendVisible = heatmapVisible,
  heatmapLegendTop,
  dimmed = false,
  style,
  zoom,
  followUserLocation = true,
  recenterRequestId,
  trashBins,
  toilets,
}: PloggingMapProps) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const { permission, position } = useDeviceLocation();
  const positionLatitude = position?.latitude;
  const positionLongitude = position?.longitude;
  const initialZoom = zoom ?? CAMPUS_CAMERA.zoom;
  const [cameraZoom, setCameraZoom] = useState(initialZoom);
  const visibleRoutePoints =
    routePoints && routePoints.length >= 2 ? routePoints : ROUTE_COORDS;
  const facilityMarkerAlpha = getFacilityMarkerAlpha(cameraZoom);

  // 최초 카메라는 실제 위치를 우선하고, 위치 권한이 막힌 경우에만 전국 fallback을 쓴다.
  // 이후 위치 변경은 animateCameraTo로 부드럽게 이동시킨다.
  const initialPositionRef = useRef(position);
  if (!initialPositionRef.current && position) {
    initialPositionRef.current = position;
  }
  const initialPosition = initialPositionRef.current;
  const waitingForInitialPosition =
    followUserLocation &&
    !initialPosition &&
    permission !== "denied" &&
    permission !== "unavailable";
  const lastAnimatedRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const lastRecenterRequestIdRef = useRef(recenterRequestId);
  // 카메라 점프 검증용(>100m 이동 시만 로그).
  const lastCameraLogRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const initialCamera = {
    latitude: initialPosition?.latitude ?? FALLBACK_CAMERA.latitude,
    longitude: initialPosition?.longitude ?? FALLBACK_CAMERA.longitude,
    zoom: initialPosition ? initialZoom : FALLBACK_CAMERA.zoom,
  };
  const [cameraCenter, setCameraCenter] = useState<MapCoord | null>(null);
  const hotspotCenter = useMemo(
    () =>
      cameraCenter ?? {
        latitude: initialCamera.latitude,
        longitude: initialCamera.longitude,
      },
    [cameraCenter, initialCamera.latitude, initialCamera.longitude]
  );
  const hotspots = useHotspotPolygons(
    heatmapVisible && !waitingForInitialPosition,
    cameraZoom,
    hotspotCenter
  );

  useEffect(() => {
    if (
      !followUserLocation ||
      typeof positionLatitude !== "number" ||
      typeof positionLongitude !== "number"
    ) {
      return;
    }
    const recenterRequested =
      recenterRequestId !== lastRecenterRequestIdRef.current;
    const prev = lastAnimatedRef.current;
    if (prev && !recenterRequested) {
      const dLat = Math.abs(positionLatitude - prev.latitude);
      const dLng = Math.abs(positionLongitude - prev.longitude);
      if (dLat < CAMERA_ANIMATE_THRESHOLD && dLng < CAMERA_ANIMATE_THRESHOLD) {
        return;
      }
    }
    mapRef.current?.animateCameraTo({
      latitude: positionLatitude,
      longitude: positionLongitude,
      duration: 500,
    });
    setCameraCenter({
      latitude: positionLatitude,
      longitude: positionLongitude,
    });
    lastAnimatedRef.current = {
      latitude: positionLatitude,
      longitude: positionLongitude,
    };
    lastRecenterRequestIdRef.current = recenterRequestId;
  }, [
    followUserLocation,
    positionLatitude,
    positionLongitude,
    recenterRequestId,
  ]);

  const handleInitialized = () => {
    if (__DEV__) {
      console.log("[map-gps] map initialized", { followUserLocation });
    }
    // Naver SDK Follow 모드는 자체 위치 캐시(서울)로 카메라를 보내는 버그가 있어
    // 사용하지 않는다. 파란 점 오버레이만 표시한다.
    mapRef.current?.setLocationTrackingMode("NoFollow");
  };

  const handleCameraChanged = useCallback((params: CameraChangedParams) => {
    if (
      typeof params.latitude === "number" &&
      typeof params.longitude === "number"
    ) {
      setCameraCenter((prevCenter) => {
        if (
          prevCenter &&
          Math.abs(prevCenter.latitude - params.latitude) <
            HOTSPOT_CENTER_UPDATE_THRESHOLD &&
          Math.abs(prevCenter.longitude - params.longitude) <
            HOTSPOT_CENTER_UPDATE_THRESHOLD
        ) {
          return prevCenter;
        }
        return {
          latitude: params.latitude,
          longitude: params.longitude,
        };
      });
    }

    const nextZoom = params.zoom;
    if (typeof nextZoom === "number") {
      setCameraZoom((prevZoom) =>
        Math.abs(prevZoom - nextZoom) < FACILITY_MARKER_ZOOM_UPDATE_THRESHOLD
          ? prevZoom
          : nextZoom
      );
    }

    if (__DEV__) {
      const prev = lastCameraLogRef.current;
      const dLat = prev ? Math.abs(params.latitude - prev.latitude) : Infinity;
      const dLng = prev ? Math.abs(params.longitude - prev.longitude) : Infinity;
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
  }, []);

  return (
    <View style={[styles.container, style]}>
      {waitingForInitialPosition ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <NaverMapView
          ref={mapRef}
          initialCamera={initialCamera}
          isShowLocationButton={false}
          isShowZoomControls={false}
          locationOverlay={
            followUserLocation
              ? {
                  isVisible:
                    typeof positionLatitude === "number" &&
                    typeof positionLongitude === "number",
                  position:
                    typeof positionLatitude === "number" &&
                    typeof positionLongitude === "number"
                    ? {
                        latitude: positionLatitude,
                        longitude: positionLongitude,
                      }
                    : undefined,
                  anchor: { x: 0.5, y: 0.5 },
                  subAnchor: { x: 0.5, y: 0.5 },
                }
              : undefined
          }
          onCameraChanged={handleCameraChanged}
          onInitialized={handleInitialized}
          style={StyleSheet.absoluteFill}
        >
          {heatmapVisible
            ? hotspots.polygons.map((hotspot) => (
                <NaverMapPolygonOverlay
                  key={hotspot.id}
                  color={getHotspotFillColor(
                    hotspot.trashScore,
                    hotspot.lod,
                    cameraZoom
                  )}
                  coords={
                    hotspot.lod === "res11" ? hotspot.blobCoords : hotspot.coords
                  }
                  outlineColor={getHotspotOutlineColor(hotspot.lod, cameraZoom)}
                  outlineWidth={getHotspotOutlineWidth(hotspot.lod)}
                  zIndex={1}
                />
              ))
            : null}
          {dimmed && routeVisible
            ? DIMMED_MAP_REGIONS.map((coords, index) => (
                <NaverMapPolygonOverlay
                  color={
                    heatmapVisible ? DIMMED_HEATMAP_COLOR : DIMMED_MAP_COLOR
                  }
                  coords={coords}
                  globalZIndex={DIMMED_MAP_GLOBAL_Z_INDEX}
                  key={`map-dim-${index}`}
                  outlineWidth={0}
                />
              ))
            : null}
          {routeVisible ? (
            <NaverMapPolylineOverlay
              color={colors.primary}
              coords={visibleRoutePoints}
              globalZIndex={ROUTE_GLOBAL_Z_INDEX}
              width={6}
            />
          ) : null}
          {trashBins?.map((bin) => (
            <NaverMapMarkerOverlay
              alpha={facilityMarkerAlpha}
              anchor={{ x: 0.5, y: 1 }}
              height={FACILITY_MARKER_HEIGHT}
              isHidden={facilityMarkerAlpha <= 0}
              isHideCollidedMarkers
              key={`trash-${bin.id}`}
              latitude={bin.latitude}
              longitude={bin.longitude}
              minZoom={FACILITY_MARKER_HIDE_ZOOM}
              width={FACILITY_MARKER_SIZE}
              zIndex={6}
            >
              <FacilityMarker
                color={bin.tintColor ?? "#6B7280"}
                iconName="trash-can"
                markerKey={`trash-${bin.id}-${bin.tintColor ?? "fallback"}`}
              />
            </NaverMapMarkerOverlay>
          ))}
          {toilets?.map((toilet) => (
            <NaverMapMarkerOverlay
              alpha={facilityMarkerAlpha}
              anchor={{ x: 0.5, y: 1 }}
              height={FACILITY_MARKER_HEIGHT}
              isHidden={facilityMarkerAlpha <= 0}
              isHideCollidedMarkers
              key={`toilet-${toilet.id}`}
              latitude={toilet.latitude}
              longitude={toilet.longitude}
              minZoom={FACILITY_MARKER_HIDE_ZOOM}
              width={FACILITY_MARKER_SIZE}
              zIndex={6}
            >
              <FacilityMarker
                color={toilet.tintColor ?? "#8B5CF6"}
                iconName="toilet"
                markerKey={`toilet-${toilet.id}-${toilet.tintColor ?? "fallback"}`}
              />
            </NaverMapMarkerOverlay>
          ))}
        </NaverMapView>
      )}
      {dimmed && !routeVisible ? (
        <View style={[styles.dimmed, heatmapVisible ? styles.dimmedHeatmap : null]} />
      ) : null}
      {heatmapLegendVisible ? <HeatmapLegend top={heatmapLegendTop} /> : null}
      {children}
    </View>
  );
}

function FacilityMarker({
  color,
  iconName,
  markerKey,
}: {
  color: string;
  iconName: FacilityIconName;
  markerKey: string;
}) {
  return (
    <View
      key={markerKey}
      collapsable={false}
      style={styles.facilityMarker}
    >
      <View style={[styles.facilityMarkerBubble, { backgroundColor: color }]}>
        {iconName === "trash-can" ? (
          <TrashCanFacilityIcon cutoutColor={color} />
        ) : (
          <MaterialCommunityIcons
            color={colors.surface}
            name={iconName}
            size={FACILITY_MARKER_ICON_SIZE}
          />
        )}
      </View>
      <View style={[styles.facilityMarkerTail, { borderTopColor: color }]} />
    </View>
  );
}

function TrashCanFacilityIcon({ cutoutColor }: { cutoutColor: string }) {
  return (
    <View style={styles.trashCanIcon}>
      <View style={styles.trashCanHandle} />
      <View style={styles.trashCanLid} />
      <View style={styles.trashCanBody}>
        <View style={[styles.trashCanRib, { backgroundColor: cutoutColor }]} />
        <View style={[styles.trashCanRib, { backgroundColor: cutoutColor }]} />
      </View>
    </View>
  );
}

function getFacilityMarkerAlpha(zoomLevel: number): number {
  if (zoomLevel <= FACILITY_MARKER_HIDE_ZOOM) return 0;
  if (zoomLevel >= FACILITY_MARKER_FULL_ZOOM) return 1;

  const progress =
    (zoomLevel - FACILITY_MARKER_HIDE_ZOOM) /
    (FACILITY_MARKER_FULL_ZOOM - FACILITY_MARKER_HIDE_ZOOM);
  return progress * progress * (3 - 2 * progress);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.background,
    justifyContent: "center",
  },
  dimmed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DIMMED_MAP_COLOR,
    pointerEvents: "none",
  },
  dimmedHeatmap: {
    backgroundColor: DIMMED_HEATMAP_COLOR,
  },
  facilityMarker: {
    alignItems: "center",
    height: FACILITY_MARKER_HEIGHT,
    justifyContent: "flex-start",
    width: FACILITY_MARKER_SIZE,
  },
  facilityMarkerBubble: {
    alignItems: "center",
    borderColor: colors.surface,
    borderRadius: FACILITY_MARKER_SIZE / 2,
    borderWidth: 2,
    height: FACILITY_MARKER_SIZE,
    justifyContent: "center",
    width: FACILITY_MARKER_SIZE,
  },
  facilityMarkerTail: {
    borderLeftColor: "transparent",
    borderLeftWidth: 5,
    borderRightColor: "transparent",
    borderRightWidth: 5,
    borderTopWidth: 7,
    height: 0,
    marginTop: -2,
    width: 0,
  },
  trashCanBody: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: "row",
    gap: 2,
    height: 12,
    justifyContent: "center",
    marginTop: 1,
    paddingTop: 2,
    width: 14,
  },
  trashCanHandle: {
    borderColor: colors.surface,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderTopWidth: 2,
    height: 4,
    marginBottom: -1,
    width: 8,
  },
  trashCanIcon: {
    alignItems: "center",
    height: FACILITY_MARKER_ICON_SIZE,
    justifyContent: "flex-start",
    width: FACILITY_MARKER_ICON_SIZE,
  },
  trashCanLid: {
    backgroundColor: colors.surface,
    borderRadius: 2,
    height: 3,
    width: 17,
  },
  trashCanRib: {
    borderRadius: 1,
    height: 7,
    width: 2,
  },
});
