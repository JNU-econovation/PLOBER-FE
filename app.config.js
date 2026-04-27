// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "NaverMapPloggingApp",
  slug: "NaverMapPloggingApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "navermapploggingapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.lewis.myproject",
    // iOS 위치 권한 메시지 추가
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "플로깅 경로 기록 및 현재 위치 표시를 위해 위치 권한이 필요합니다.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "백그라운드에서도 플로깅 경로를 기록하기 위해 위치 권한이 필요합니다."
    },
  },
  
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.lewis.myproject",
    // Android 위치 권한 추가
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION" // 백그라운드 추적이 필요하다면 추가
    ],
  },
  
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          extraMavenRepos: ["https://repository.map.naver.com/archive/maven"]
        }
      }
    ],
    [
      "@mj-studio/react-native-naver-map",
      {
        client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});