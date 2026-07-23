import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "@/src/shared/theme";

export type PersonalReportPosterData = {
  caloriesLabel: string;
  dateValue: Date | number | string | null;
  distanceKm: string;
  modeLabel: string;
  photoUris: readonly string[];
  placeName: string;
  ploggingTimeLabel: string;
  routeImageUri: string | null;
  stepCountLabel: string;
};

export const PersonalReportPoster = forwardRef<
  View,
  { data: PersonalReportPosterData }
>(function PersonalReportPoster({ data }, ref) {
  const subtitle = [data.modeLabel, data.placeName].filter(Boolean).join(" · ");

  return (
    <View collapsable={false} ref={ref} style={styles.poster}>
      <LinearGradient
        colors={["#777A80", "#F7F7F7", "#E4E4E4", "#55585E"]}
        locations={[0, 0.28, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Text style={styles.brand}>PLOVER</Text>
        <Text style={styles.date}>{formatPosterDate(data.dateValue)}</Text>
      </View>

      {data.routeImageUri ? (
        <Image
          accessibilityLabel="플로깅 경로"
          contentFit="contain"
          source={{ uri: data.routeImageUri }}
          style={styles.routeImage}
        />
      ) : null}

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>PLOGGING</Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
        <View style={styles.metricGrid}>
          <PosterMetric
            label="플로깅 시간"
            unit="H:M"
            value={data.ploggingTimeLabel}
          />
          <PosterMetric label="거리" unit="km" value={data.distanceKm} />
          <PosterMetric
            label="걸음 수"
            unit="steps"
            value={data.stepCountLabel}
          />
          <PosterMetric
            label="칼로리"
            unit="kcal"
            value={data.caloriesLabel}
          />
        </View>
      </View>

      <View style={styles.photos}>
        {Array.from({ length: 4 }, (_, index) => {
          const uri = data.photoUris[index];
          return uri ? (
            <Image
              contentFit="cover"
              key={`${uri}-${index}`}
              source={{ uri }}
              style={styles.photo}
            />
          ) : (
            <View key={`empty-${index}`} style={styles.photoPlaceholder} />
          );
        })}
      </View>
    </View>
  );
});

function PosterMetric({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
        {value} <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function formatPosterDate(value: PersonalReportPosterData["dateValue"]): string {
  if (value === null) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()} · ${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )} · ${String(date.getDate()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  brand: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    fontSize: 5,
    letterSpacing: 0.3,
  },
  copy: {
    bottom: 31,
    left: 8,
    position: "absolute",
    right: 8,
  },
  date: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 4.5,
    letterSpacing: 0.1,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: fontFamilies.bold,
    fontSize: 4,
    letterSpacing: 0.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 8,
    position: "absolute",
    right: 8,
    top: 8,
  },
  metric: {
    width: 58,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 7,
  },
  metricLabel: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: fontFamilies.regular,
    fontSize: 4,
  },
  metricUnit: {
    fontSize: 4.5,
  },
  metricValue: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 11,
    letterSpacing: -0.35,
    marginTop: 1,
  },
  photo: {
    height: 29,
    width: 35,
  },
  photoPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.2)",
    height: 29,
    width: 35,
  },
  photos: {
    bottom: 0,
    flexDirection: "row",
    height: 29,
    left: 0,
    position: "absolute",
    right: 0,
  },
  poster: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    boxShadow: "0 8px 17px rgba(0,0,0,0.22)",
    height: 249,
    overflow: "hidden",
    width: 140,
  },
  routeImage: {
    height: 58,
    left: "50%",
    marginLeft: -31,
    position: "absolute",
    top: 30,
    width: 62,
  },
  subtitle: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 5,
    marginTop: 2,
  },
});
