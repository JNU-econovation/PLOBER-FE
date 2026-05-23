# Flover API 연동 문서

기준 스펙: `http://13.125.28.197:8080/v3/api-docs`

- API 이름: `Flover API`
- API 설명: `Flover 서비스 API 문서`
- API 버전: `v1.0`
- OpenAPI 버전: `3.1.0`
- Base URL: `http://13.125.28.197:8080`
- 프론트 환경변수 예시: `EXPO_PUBLIC_API_BASE_URL=http://13.125.28.197:8080`
- Swagger UI: `http://13.125.28.197:8080/swagger-ui/index.html`

Swagger 기준 총 20개 API operation이 있습니다. Swagger에는 별도 `securitySchemes`가 정의되어 있지 않으므로, 이 문서는 스펙에 노출된 요청/응답 구조만 정리합니다.

## 공통 연동 메모

- 날짜/시간은 `date-time` 또는 `date` 문자열입니다. 예: `2026-05-21T10:30:00Z`, `2026-05-21`.
- 위치 좌표는 위도 `latitude`/`lat`, 경도 `longitude`/`lng`/`lon`처럼 API별 파라미터명이 다릅니다.
- `int64` 응답도 React Native/TypeScript에서는 일반적으로 `number`로 다룹니다.
- `multipart/form-data` 요청은 `FormData`를 사용하고 `Content-Type` 헤더를 직접 지정하지 않는 편이 안전합니다. boundary는 런타임이 자동으로 붙입니다.

## Presigned Upload Flow

프로필 이미지, 플로깅 인증샷, 지도 이미지는 presigned URL 흐름을 사용합니다.

1. 업로드 URL 발급 API를 호출합니다.
   - 프로필 이미지: `GET /api/users/me/profile-image/upload-url`
   - 플로깅 인증샷: `GET /api/plogging-sessions/photo/upload-url`
   - 플로깅 지도 이미지: `GET /api/plogging-sessions/map-image/upload-url`
2. 응답의 `uploadUrl`로 이미지 파일을 업로드합니다.
3. 응답의 `objectUrl`을 저장 API에 전달합니다.
   - 프로필 이미지는 `PUT /api/users/me/profile-image`의 `imageUrl`
   - 플로깅 완료 기록은 `POST /api/plogging-sessions/complete`의 `mapImageUrl`, `photoUrls`

```ts
type PresignedUploadUrlResponse = {
  uploadUrl: string;
  objectUrl: string;
};
```

## Auth

### POST `/api/auth/v2/kakao/login`

카카오 Native SDK에서 발급받은 accessToken으로 로그인합니다. (현행)

- Query/Path parameters: 없음
- Request body: `application/json`

```ts
type KakaoLoginRequest = {
  accessToken: string;
};
```

- Response body: `LoginResponse`
- 에러 응답

| 상황 | HTTP Status | code | 메시지 |
| --- | --- | --- | --- |
| accessToken 만료/위조 | 401 | `KAKAO_TOKEN_INVALID` | 카카오 액세스 토큰이 유효하지 않거나 만료되었습니다. |
| 카카오 사용자 정보 조회 실패 | 401 | `KAKAO_USER_INFO_FAILED` | 카카오 사용자 정보 조회에 실패했습니다. |

- 프론트 연동 메모: 카카오 Native SDK (`@react-native-kakao/user`)의 `login()` 호출로 받은 `accessToken`을 전달합니다. `KAKAO_TOKEN_INVALID` 응답 시 토큰을 재발급하여 재시도하고, `KAKAO_USER_INFO_FAILED`는 네트워크 재시도로 안내합니다.

### POST `/api/auth/kakao/login` (Deprecated)

카카오 OAuth 인가 코드로 로그인합니다. WebView 기반 구버전 클라이언트 호환용으로만 유지되며, 신규 구현은 `/api/auth/v2/kakao/login`을 사용합니다.

- Query/Path parameters: 없음
- Request body: `application/json`

```ts
type CallbackRequest = {
  code: string;
};
```

- Response body: `LoginResponse`
- 프론트 연동 메모: 모든 클라이언트가 Native SDK 기반 `/api/auth/v2/kakao/login`으로 전환되면 백엔드에서 제거 예정입니다. 신규 코드에서는 사용하지 마세요.

### POST `/api/auth/apple/login`

Apple identity token으로 로그인합니다.

- Query/Path parameters: 없음
- Request body: `application/json`

```ts
type LoginRequest = {
  identityToken: string;
};
```

- Response body: `LoginResponse`
- 프론트 연동 메모: Apple 로그인 성공 후 받은 `identityToken`을 전달하고, 응답 토큰을 세션 저장소에 저장합니다.

### POST `/api/auth/logout`

로그아웃을 처리합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: 없음
- Response body: 없음. Swagger responses에는 `200 OK`로 정의되어 있습니다.
- 프론트 연동 메모: Swagger 설명상 서버 처리는 없고 클라이언트가 토큰을 삭제해야 합니다.

## User

### GET `/api/users/me`

내 정보를 조회합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: 없음
- Response body: `UserInfoResponse`
- 프론트 연동 메모: 프로필 화면의 기본 사용자 정보로 사용할 수 있습니다.

### DELETE `/api/users/me`

회원 탈퇴를 처리합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: 없음
- Response body: 없음. `200 OK`면 요청 성공입니다.
- 프론트 연동 메모: 계정 및 연관 데이터 삭제 API입니다. 성공 후 로컬 세션/캐시를 정리하고 로그인 화면으로 이동합니다.

### GET `/api/users/me/plogging-stats`

내 플로깅 누적 통계를 조회합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: 없음
- Response body

```ts
type PloggingStatsResponse = {
  totalPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
};
```

- 프론트 연동 메모: 프로필/마이페이지 누적 통계 카드에 사용합니다.

### GET `/api/users/me/profile-image/upload-url`

프로필 이미지 업로드용 presigned URL을 발급합니다.

- Query parameters

| 이름          | 타입     | 필수 | 설명                                        |
| ------------- | -------- | ---- | ------------------------------------------- |
| `userId`      | `number` | Yes  | 사용자 ID                                   |
| `contentType` | `string` | Yes  | 업로드할 이미지 MIME 타입. 예: `image/jpeg` |

- Request body: 없음
- Response body: `PresignedUploadUrlResponse`
- 프론트 연동 메모: `uploadUrl`에 파일을 업로드한 뒤 `objectUrl`을 프로필 이미지 저장 API에 전달합니다.

### PUT `/api/users/me/profile-image`

프로필 이미지 URL을 저장하거나 수정합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: `application/json`

```ts
type ProfileImageUrlRequest = {
  imageUrl: string;
};
```

- Response body

```ts
type ProfileImageResponse = {
  userId: number;
  profileImageUrl: string;
};
```

- 프론트 연동 메모: presigned 업로드 후 받은 `objectUrl`을 `imageUrl`로 전달합니다.

### PUT `/api/users/me/nickname`

닉네임을 수정합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: `application/json`

```ts
type NicknameRequest = {
  nickname: string;
};
```

- Response body

```ts
type NicknameResponse = {
  userId: number;
  nickname: string;
};
```

- 프론트 연동 메모: 수정 성공 후 로컬 프로필 상태나 프로필 조회 캐시를 갱신합니다.

## Facility

### GET `/api/facilities/trash-bins`

현재 위치 주변 쓰레기통 목록을 조회합니다.

- Query parameters

| 이름  | 타입     | 필수 | 설명           |
| ----- | -------- | ---- | -------------- |
| `lat` | `number` | Yes  | 현재 위치 위도 |
| `lng` | `number` | Yes  | 현재 위치 경도 |

- Request body: 없음
- Response body: `TrashBinResponse[]`
- 프론트 연동 메모: 지도 마커나 주변 시설 목록에 사용합니다.

### GET `/api/facilities/toilets`

현재 위치 주변 화장실 목록을 조회합니다.

- Query parameters

| 이름  | 타입     | 필수 | 설명           |
| ----- | -------- | ---- | -------------- |
| `lat` | `number` | Yes  | 현재 위치 위도 |
| `lng` | `number` | Yes  | 현재 위치 경도 |

- Request body: 없음
- Response body: `ToiletResponse[]`
- 프론트 연동 메모: 지도 마커나 주변 시설 목록에 사용합니다.

## Plogging

### POST `/api/plogging/analyze`

플로깅 중 촬영한 이미지를 AI 분석 서버로 전달합니다.

- Query parameters

| 이름        | 타입     | 필수 | 설명                |
| ----------- | -------- | ---- | ------------------- |
| `latitude`  | `number` | Yes  | 사진 촬영 위치 위도 |
| `longitude` | `number` | Yes  | 사진 촬영 위치 경도 |

- Request body: `multipart/form-data`

| 필드    | 타입   | 필수 | 설명               |
| ------- | ------ | ---- | ------------------ |
| `image` | `File` | Yes  | 분석할 이미지 파일 |

- Response body: 없음. `200 OK`면 요청 성공입니다.
- 프론트 연동 메모: `FormData`에 `image` 필드로 파일을 추가하고, 좌표는 query string으로 전달합니다.

### POST `/api/plogging-sessions/complete`

플로깅 완료 기록을 저장합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: `application/json`, `CompleteRequest`
- Response body

```ts
type CompleteResponse = {
  ploggingSessionId: number;
};
```

- 프론트 연동 메모: 기록 저장 전에 인증샷과 지도 이미지를 업로드하고, 받은 `objectUrl`을 `photoUrls`, `mapImageUrl`에 넣어 전송합니다.

### GET `/api/plogging-sessions`

플로깅 기록 전체 목록을 조회합니다.

- Query parameters

| 이름     | 타입       | 필수 | 설명                                   |
| -------- | ---------- | ---- | -------------------------------------- |
| `userId` | `number`   | Yes  | 사용자 ID                              |
| `page`   | `number`   | Yes  | 페이지 번호. Swagger의 `Pageable.page` |
| `size`   | `number`   | Yes  | 페이지 크기. Swagger의 `Pageable.size` |
| `sort`   | `string[]` | No   | 정렬 조건. Swagger의 `Pageable.sort`   |

- Request body: 없음
- Response body: `SessionListResponse`
- 프론트 연동 메모: 무한 스크롤이나 페이지네이션 목록에서 `hasNext`로 다음 페이지 여부를 판단합니다.

### GET `/api/plogging-sessions/{ploggingSessionId}`

플로깅 기록 단건을 조회합니다.

- Path parameters

| 이름                | 타입     | 필수 | 설명           |
| ------------------- | -------- | ---- | -------------- |
| `ploggingSessionId` | `number` | Yes  | 플로깅 기록 ID |

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |

- Request body: 없음
- Response body: `SessionDetailResponse`
- 프론트 연동 메모: 히스토리 상세 화면에서 사용합니다.

### GET `/api/plogging-sessions/weekly`

주간 플로깅 통계를 조회합니다.

- Query parameters

| 이름        | 타입     | 필수 | 설명                    |
| ----------- | -------- | ---- | ----------------------- |
| `userId`    | `number` | Yes  | 사용자 ID               |
| `startDate` | `string` | Yes  | 주 시작일. 형식: `date` |

- Request body: 없음
- Response body: `WeeklyStatsResponse`
- 프론트 연동 메모: `startDate`는 `YYYY-MM-DD` 형식으로 전달합니다.

### GET `/api/plogging-sessions/monthly`

월간 플로깅 통계를 조회합니다.

- Query parameters

| 이름     | 타입     | 필수 | 설명      |
| -------- | -------- | ---- | --------- |
| `userId` | `number` | Yes  | 사용자 ID |
| `year`   | `number` | Yes  | 연도      |
| `month`  | `number` | Yes  | 월        |

- Request body: 없음
- Response body: `MonthlyStatsResponse`
- 프론트 연동 메모: 월별 리포트와 히스토리 요약에 사용합니다.

### GET `/api/plogging-sessions/photo/upload-url`

플로깅 인증샷 업로드용 presigned URL을 발급합니다.

- Query parameters

| 이름          | 타입     | 필수 | 설명                                        |
| ------------- | -------- | ---- | ------------------------------------------- |
| `userId`      | `number` | Yes  | 사용자 ID                                   |
| `contentType` | `string` | Yes  | 업로드할 이미지 MIME 타입. 예: `image/jpeg` |

- Request body: 없음
- Response body: `PresignedUploadUrlResponse`
- 프론트 연동 메모: `objectUrl`을 플로깅 완료 API의 `photoUrls` 배열에 넣습니다.

### GET `/api/plogging-sessions/map-image/upload-url`

플로깅 지도 이미지 업로드용 presigned URL을 발급합니다.

- Query parameters

| 이름          | 타입     | 필수 | 설명                                       |
| ------------- | -------- | ---- | ------------------------------------------ |
| `userId`      | `number` | Yes  | 사용자 ID                                  |
| `contentType` | `string` | Yes  | 업로드할 이미지 MIME 타입. 예: `image/png` |

- Request body: 없음
- Response body: `PresignedUploadUrlResponse`
- 프론트 연동 메모: `objectUrl`을 플로깅 완료 API의 `mapImageUrl`에 넣습니다.

## Route

### GET `/api/v1/routes`

플로깅 추천 경로를 조회합니다.

- Query parameters

| 이름   | 타입     | 필수 | 설명                                             |
| ------ | -------- | ---- | ------------------------------------------------ |
| `lat`  | `number` | Yes  | 현재 위치 위도                                   |
| `lon`  | `number` | Yes  | 현재 위치 경도                                   |
| `time` | `number` | Yes  | 플로깅 목표 시간. 단위는 백엔드 정책을 따릅니다. |
| `mode` | `string` | No   | 경로 모드. 예: `PLOGGING`                        |

- Request body: 없음
- Response body: `RouteResponse`
- 프론트 연동 메모: 응답의 `encodedPath`는 지도 경로 표시를 위해 polyline 디코딩이 필요합니다.
- URL 예시

```text
http://13.125.28.197:8080/api/v1/routes?lat=35.175911&lon=126.912254&time=30&mode=PLOGGING
```

## TypeScript Schema Reference

### 공통 Enum

```ts
type PloggingMode = "FREE" | "RECOMMENDED";

type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
```

### Auth

```ts
type LoginResponse = {
  accessToken: string;
  tokenType: string;
  userId: number;
  nickname: string;
  email: string;
};
```

### User

```ts
type UserInfoResponse = {
  nickname: string;
  level: number;
  title: string;
  profileImageUrl: string;
  experience: number;
};

type PloggingStatsResponse = {
  totalPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
};

type ProfileImageResponse = {
  userId: number;
  profileImageUrl: string;
};

type NicknameResponse = {
  userId: number;
  nickname: string;
};
```

### Facility

```ts
type TrashBinResponse = {
  id: number;
  name: string;
  roadAddress: string;
  latitude: number;
  longitude: number;
  trashType: string;
  distanceMeters: number;
};

type ToiletResponse = {
  id: number;
  name: string;
  roadAddress: string;
  latitude: number;
  longitude: number;
  toiletType: string;
  openTimeType: string;
  distanceMeters: number;
};
```

### Plogging

```ts
type RoutePointRequest = {
  latitude: number;
  longitude: number;
};

type CompleteRequest = {
  mode: PloggingMode;
  startedAt: string;
  finishedAt: string;
  distanceMeters?: number;
  stepCount?: number;
  caloriesBurned?: number;
  ploggingSeconds?: number;
  restSeconds?: number;
  placeName?: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  routePoints: RoutePointRequest[];
  mapImageUrl?: string;
  photoUrls: string[];
};

type SessionSummaryResponse = {
  ploggingSessionId: number;
  mode: PloggingMode;
  placeName: string;
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
};

type SessionListResponse = {
  content: SessionSummaryResponse[];
  hasNext: boolean;
};

type SessionDetailResponse = {
  ploggingSessionId: number;
  mode: PloggingMode;
  startedAt: string;
  finishedAt: string;
  placeName: string;
  distanceMeters: number;
  stepCount: number;
  caloriesBurned: number;
  ploggingSeconds: number;
  restSeconds: number;
  mapImageUrl: string;
  photoUrls: string[];
};

type DailyStatsResponse = {
  date: string;
  dayOfWeek: DayOfWeek;
  stepCount: number;
  distanceMeters: number;
  caloriesBurned: number;
  ploggingCount: number;
  ploggingSeconds: number;
};

type WeeklyStatsResponse = {
  startDate: string;
  endDate: string;
  dailyStats: DailyStatsResponse[];
};

type MonthlyStatsResponse = {
  year: number;
  month: number;
  totalStepCount: number;
  totalDistanceMeters: number;
  totalCaloriesBurned: number;
  totalPloggingCount: number;
  totalPloggingSeconds: number;
};
```

### Route

```ts
type RouteRequest = {
  lat: number;
  lon: number;
  time: number;
  mode?: string;
};

type RouteResponse = {
  distanceMeter: number;
  timeMillis: number;
  encodedPath: string;
};
```

## Appendix: Hotspot Vector Tile Server

이 내용은 Swagger에 포함되지 않은 외부 연동 메모입니다. 쓰레기 발생률 히트맵을 표시할 때 사용합니다.

- 타일 URL: `http://54.180.111.192:3000/predicted_hotspots/{z}/{x}/{y}`
- source layer ID: `predicted_hotspots`
- 형식: MVT vector tile
- CORS: 전체 허용
- 주요 속성: `trash_score` (`0.0`-`1.0`), `nightlife_count_30m`, `cafe_count_30m`
- React Native 권장 라이브러리: `@maplibre/maplibre-react-native`

```bash
npm install @maplibre/maplibre-react-native
```

```tsx
import MapLibreGL from "@maplibre/maplibre-react-native";

const TILE_SERVER_URL = "http://54.180.111.192:3000";

export function HotspotMap() {
  return (
    <MapLibreGL.MapView style={{ flex: 1 }}>
      <MapLibreGL.Camera
        defaultSettings={{
          centerCoordinate: [126.9, 35.16],
          zoomLevel: 14,
        }}
      />

      <MapLibreGL.VectorSource
        id="hotspots"
        tileUrlTemplates={[`${TILE_SERVER_URL}/predicted_hotspots/{z}/{x}/{y}`]}
      >
        <MapLibreGL.FillLayer
          id="hotspot-fill"
          sourceLayerID="predicted_hotspots"
          style={{
            fillColor: [
              "interpolate",
              ["linear"],
              ["get", "trash_score"],
              0.0,
              "rgba(34, 197, 94, 0.05)",
              0.3,
              "rgba(234, 179, 8, 0.3)",
              0.6,
              "rgba(249, 115, 22, 0.5)",
              0.8,
              "rgba(239, 68, 68, 0.7)",
              1.0,
              "rgba(185, 28, 28, 0.9)",
            ],
            fillOpacity: 0.7,
          }}
        />
      </MapLibreGL.VectorSource>
    </MapLibreGL.MapView>
  );
}
```
