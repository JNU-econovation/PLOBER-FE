import { StyleSheet, View } from "react-native";
import {
  NaverMapPolylineOverlay,
  NaverMapView,
} from "@mj-studio/react-native-naver-map";

import { CAMPUS_CAMERA, ROUTE_COORDS } from "../data/map-data";
import type { PloggingMapProps } from "./types";

export function PloggingMap({
  children,
  routeVisible = false,
  dimmed = false,
  style,
  zoom,
}: PloggingMapProps) {
  return (
    <View style={[styles.container, style]}>
      <NaverMapView
        initialCamera={{ ...CAMPUS_CAMERA, zoom: zoom ?? CAMPUS_CAMERA.zoom }}
        isShowLocationButton={false}
        isShowZoomControls={false}
        style={StyleSheet.absoluteFill}
      >
        {routeVisible ? (
          <NaverMapPolylineOverlay
            color="#40A461"
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
