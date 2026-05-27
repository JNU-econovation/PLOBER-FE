// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "플로버",
  slug: "NaverMapPloggingApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icons/appIcon-native.png",
  scheme: "navermapploggingapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.econovation.plover",
    usesAppleSignIn: true,
    // iOS 위치 권한 메시지 추가
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      CFBundleDisplayName: "플로버",
      ITSAppUsesNonExemptEncryption: false,
      NSLocationAlwaysAndWhenInUseUsageDescription: "화면을 끄거나 다른 앱을 사용해도 플로깅 경로를 기록하기 위해 위치 권한이 필요합니다.",
      NSLocationAlwaysUsageDescription: "화면을 끄거나 다른 앱을 사용해도 플로깅 경로를 기록하기 위해 위치 권한이 필요합니다.",
      NSLocationWhenInUseUsageDescription: "플로깅 경로 기록 및 현재 위치 표시를 위해 위치 권한이 필요합니다.",
      NSMotionUsageDescription: "플로깅 중 걸음 수를 측정하기 위해 동작 인식 권한이 필요합니다.",
      NSPhotoLibraryUsageDescription: "프로필 이미지 선택 및 플로깅 리포트 이미지 저장을 위해 사진 접근 권한이 필요합니다.",
      NSPhotoLibraryAddUsageDescription: "플로깅 리포트 이미지를 사진 앱에 저장하기 위해 권한이 필요합니다.",
      NSCameraUsageDescription: "플로깅 인증샷 촬영을 위해 카메라 접근 권한이 필요합니다.",
      NSSupportsLiveActivities: true,
      UIBackgroundModes: ["location"],
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
      foregroundImage: "./assets/icons/appIcon-native.png",
    },
    edgeToEdgeEnabled: true,
    usesCleartextTraffic: true,
    predictiveBackGestureEnabled: false,
    package: "com.econovation.plover",
    // Android 권한: 위치/만보기 + 카메라/사진 선택
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "POST_NOTIFICATIONS",
      "ACTIVITY_RECOGNITION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
    ],
  },
  
  web: {
    output: "static",
    favicon: "./assets/icons/appIcon-native.png",
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
        locationAlwaysAndWhenInUsePermission: "화면을 끄거나 다른 앱을 사용해도 플로깅 경로를 기록하기 위해 위치 권한이 필요합니다.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        androidForegroundServiceIcon: "./assets/images/android-icon-monochrome.png",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "프로필 이미지 선택 및 플로깅 리포트 이미지 저장을 위해 사진 접근 권한이 필요합니다.",
        cameraPermission: "플로깅 인증샷 촬영을 위해 카메라 접근 권한이 필요합니다.",
        microphonePermission: false,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "프로필 이미지 선택 및 플로깅 리포트 이미지 저장을 위해 사진 접근 권한이 필요합니다.",
        savePhotosPermission: "플로깅 리포트 이미지를 사진 앱에 저장하기 위해 권한이 필요합니다.",
        isAccessMediaLocationEnabled: false,
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
          extraMavenRepos: [
            "https://repository.map.naver.com/archive/maven",
            "https://devrepo.kakao.com/nexus/content/groups/public/"
          ]
        }
      }
    ],
    [
      "@mj-studio/react-native-naver-map",
      {
        client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID,
      },
    ],
    [
      "@react-native-kakao/core",
      {
        nativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
        android: {
          authCodeHandlerActivity: true,
        },
        ios: {
          handleKakaoOpenUrl: true,
        },
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
