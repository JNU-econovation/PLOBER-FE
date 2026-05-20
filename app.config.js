// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "NaverMapPloggingApp",
  slug: "NaverMapPloggingApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icons/appIcon.png",
  scheme: "navermapploggingapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.lewis.myproject",
    usesAppleSignIn: true,
    // iOS 위치 권한 메시지 추가
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: "플로깅 경로 기록 및 현재 위치 표시를 위해 위치 권한이 필요합니다.",
      NSMotionUsageDescription: "플로깅 중 걸음 수를 측정하기 위해 동작 인식 권한이 필요합니다.",
      NSPhotoLibraryUsageDescription: "프로필 이미지 선택을 위해 사진 접근 권한이 필요합니다.",
      NSCameraUsageDescription: "플로깅 인증샷 촬영을 위해 카메라 접근 권한이 필요합니다.",
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSExceptionDomains: {
          "13.125.28.197": {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
          },
          "54.180.111.192": {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
          },
          "ec2-13-125-28-197.ap-northeast-2.compute.amazonaws.com": {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
          },
        },
      },
    },
  },
  
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/icons/appIcon.png",
    },
    edgeToEdgeEnabled: true,
    usesCleartextTraffic: true,
    predictiveBackGestureEnabled: false,
    package: "com.lewis.myproject",
    // Android 권한: 포그라운드 위치 + 만보기
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACTIVITY_RECOGNITION",
    ],
  },
  
  web: {
    output: "static",
    favicon: "./assets/icons/appIcon.png",
  },
  
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    "expo-web-browser",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "플로깅 경로 기록 및 현재 위치 표시를 위해 위치 권한이 필요합니다.",
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "프로필 이미지 선택을 위해 사진 접근 권한이 필요합니다.",
        cameraPermission: "플로깅 인증샷 촬영을 위해 카메라 접근 권한이 필요합니다.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 190,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#ffffff",
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
  extra: {
    ...config.extra,
    eas: {
      projectId: "2f86cd67-1abb-4c64-a62b-5df3a9535df7",
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
