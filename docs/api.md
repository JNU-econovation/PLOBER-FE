# Plover API 연동 문서

기준 스펙: `https://moong.co.kr/v3/api-docs` (2026-07-22 확인)

- API 이름: `Plover API`
- API 설명: `Plover 서비스 API 문서`
- API 버전: `v1.0`
- OpenAPI 버전: `3.1.0`
- Production Base URL: `https://moong.co.kr`
- Local Base URL: `http://localhost:8080`
- 프론트 환경변수 예시: `EXPO_PUBLIC_API_BASE_URL=https://moong.co.kr`
- Swagger UI: `https://moong.co.kr/swagger-ui/index.html`

운영 Swagger 기준 35개 path, 총 39개 API operation이 있습니다. `bearerAuth`는 JWT Bearer 인증입니다.

## 공통 연동 메모

- 날짜/시간은 `date-time` 또는 `date` 문자열입니다. 예: `2026-05-21T10:30:00Z`, `2026-05-21`.
- 위치 좌표는 위도 `latitude`/`lat`, 경도 `longitude`/`lng`/`lon`처럼 API별 파라미터명이 다릅니다.
- `int64` 응답도 React Native/TypeScript에서는 일반적으로 `number`로 다룹니다.
- `multipart/form-data` 요청은 `FormData`를 사용하고 `Content-Type` 헤더를 직접 지정하지 않는 편이 안전합니다. boundary는 런타임이 자동으로 붙입니다.
- 로그인 사용자 ID는 JWT에서 추출합니다. `/me`, 개인 플로깅, 크루 API에 `userId` query/body를 추가하지 않습니다.
- 인증 API를 제외한 사용자·개인 플로깅·크루 API는 `Authorization: Bearer {accessToken}`을 사용합니다. 시설·추천 경로는 인증 없이 조회할 수 있습니다.
- 크루 API의 시간은 offset 없는 ISO-8601 `LocalDateTime` 문자열로 반환될 수 있습니다. 예: `2026-07-22T10:30:00`.
- 공통 오류 body는 `{ status: number; message: string }`이며 별도 `code`는 보장되지 않습니다.

```http
Authorization: Bearer {accessToken}
```

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

- Query/Path parameters: 없음
- Request body: 없음
- Response body: 없음. Swagger responses에는 `200 OK`로 정의되어 있습니다.
- 프론트 연동 메모: Swagger 설명상 서버 처리는 없고 클라이언트가 토큰을 삭제해야 합니다.

## User

### GET `/api/users/me`

내 정보를 조회합니다.

- Query/Path parameters: 없음
- Request body: 없음
- Response body: `UserInfoResponse`
- 프론트 연동 메모: 프로필 화면의 기본 사용자 정보로 사용할 수 있습니다.

### DELETE `/api/users/me`

회원 탈퇴를 처리합니다.

- Query/Path parameters: 없음
- Request body: 없음
- Response body: 없음. `200 OK`면 요청 성공입니다.
- 프론트 연동 메모: 계정 및 연관 데이터 삭제 API입니다. 성공 후 로컬 세션/캐시를 정리하고 로그인 화면으로 이동합니다.

### GET `/api/users/me/plogging-stats`

내 플로깅 누적 통계를 조회합니다.

- Query/Path parameters: 없음
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
| `contentType` | `string` | Yes  | 업로드할 이미지 MIME 타입. 예: `image/jpeg` |

- Request body: 없음
- Response body: `PresignedUploadUrlResponse`
- 프론트 연동 메모: `uploadUrl`에 파일을 업로드한 뒤 `objectUrl`을 프로필 이미지 저장 API에 전달합니다.

### PUT `/api/users/me/profile-image`

프로필 이미지 URL을 저장하거나 수정합니다.

- Query/Path parameters: 없음
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

- Query/Path parameters: 없음
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

- Query/Path parameters: 없음
- Request body: `application/json`, `CompleteRequest`
- Response body

```ts
type CompleteResponse = {
  ploggingSessionId: number;
  previousExperience: number;
  currentExperience: number;
  previousLevel: number;
  currentLevel: number;
};
```

- 프론트 연동 메모: 기록 저장 전에 인증샷과 지도 이미지를 업로드하고, 받은 `objectUrl`을 `photoUrls`, `mapImageUrl`에 넣어 전송합니다.
- `crewPloggingSessionId`가 없거나 `null`이면 개인 플로깅, 값이 있으면 같이 플로깅 개인 완료입니다.
- 같이 플로깅은 `mode: "FREE"`, `IN_PROGRESS` 또는 `COMPLETING`, 로그인 사용자의 `PARTICIPATING` 상태가 필요합니다. 중복 제출과 마감 이후 제출은 `409`입니다.

### GET `/api/plogging-sessions`

플로깅 기록 전체 목록을 조회합니다.

- Query parameters

| 이름   | 타입       | 필수 | 설명                                  |
| ------ | ---------- | ---- | ------------------------------------- |
| `page` | `number`   | No   | 0부터 시작. 기본값 `0`                |
| `size` | `number`   | No   | 최소 `1`. 기본값 `20`                 |
| `sort` | `string[]` | No   | `property,(asc|desc)` 형식, 복수 가능 |

- Request body: 없음
- Response body: `SessionListResponse`
- 프론트 연동 메모: 무한 스크롤이나 페이지네이션 목록에서 `hasNext`로 다음 페이지 여부를 판단합니다.

### GET `/api/plogging-sessions/{ploggingSessionId}`

플로깅 기록 단건을 조회합니다.

- Path parameters

| 이름                | 타입     | 필수 | 설명           |
| ------------------- | -------- | ---- | -------------- |
| `ploggingSessionId` | `number` | Yes  | 플로깅 기록 ID |

- Request body: 없음
- Response body: `SessionDetailResponse`
- 프론트 연동 메모: 히스토리 상세 화면에서 사용합니다.

### GET `/api/plogging-sessions/weekly`

주간 플로깅 통계를 조회합니다.

- Query parameters

| 이름        | 타입     | 필수 | 설명                    |
| ----------- | -------- | ---- | ----------------------- |
| `startDate` | `string` | Yes  | 주 시작일. 형식: `date` |

- Request body: 없음
- Response body: `WeeklyStatsResponse`
- 프론트 연동 메모: `startDate`는 `YYYY-MM-DD` 형식으로 전달합니다.

### GET `/api/plogging-sessions/monthly`

월간 플로깅 통계를 조회합니다.

- Query parameters

| 이름    | 타입     | 필수 | 설명       |
| ------- | -------- | ---- | ---------- |
| `year`  | `number` | Yes  | 1 이상의 연도 |
| `month` | `number` | Yes  | 1~12       |

- Request body: 없음
- Response body: `MonthlyStatsResponse`
- 프론트 연동 메모: 월별 리포트와 히스토리 요약에 사용합니다.

### GET `/api/plogging-sessions/photo/upload-url`

플로깅 인증샷 업로드용 presigned URL을 발급합니다.

- Query parameters

| 이름          | 타입     | 필수 | 설명                                        |
| ------------- | -------- | ---- | ------------------------------------------- |
| `contentType` | `string` | Yes  | 업로드할 이미지 MIME 타입. 예: `image/jpeg` |

- Request body: 없음
- Response body: `PresignedUploadUrlResponse`
- 프론트 연동 메모: `objectUrl`을 플로깅 완료 API의 `photoUrls` 배열에 넣습니다.

### GET `/api/plogging-sessions/map-image/upload-url`

플로깅 지도 이미지 업로드용 presigned URL을 발급합니다.

- Query parameters

| 이름          | 타입     | 필수 | 설명                                       |
| ------------- | -------- | ---- | ------------------------------------------ |
| `contentType` | `string` | Yes  | 업로드할 이미지 MIME 타입. 예: `image/png` |

- Request body: 없음
- Response body: `PresignedUploadUrlResponse`
- 프론트 연동 메모: `objectUrl`을 플로깅 완료 API의 `mapImageUrl`에 넣습니다.

## Crew

모든 크루 API는 Bearer JWT가 필요합니다. 현재 로그인 사용자는 토큰에서 식별하며 `userId`를 보내지 않습니다.

### 크루 관리 API

| Method | Path | 요청 | 성공 응답 | 핵심 규칙 |
| --- | --- | --- | --- | --- |
| `POST` | `/api/crews` | JSON `CreateCrewRequest` | `200 CrewResponse` | 생성자가 `LEADER`; 숫자 6자리 영구 참여 코드 발급; 코드 저장 충돌은 `409` 후 재시도 |
| `POST` | `/api/crews/join` | JSON `JoinCrewRequest` | `200 CrewResponse` | 코드를 trim한 뒤 가입; 이미 ACTIVE이면 `409`; WITHDRAWN이면 최초 `joinedAt`을 유지해 복구 |
| `GET` | `/api/crews` | 없음 | `200 CrewListResponse` | 내 ACTIVE 멤버십만 `joinedAt DESC` |
| `GET` | `/api/crews/{crewId}` | path `crewId` | `200 CrewDetailResponse` | 현재 ACTIVE 크루원만 조회 |
| `GET` | `/api/crews/{crewId}/members` | path `crewId` | `200 CrewMemberListResponse` | ACTIVE 크루원만 `joinedAt ASC`; WITHDRAWN 제외 |
| `GET` | `/api/crews/{crewId}/members/{targetUserId}` | path `crewId`, `targetUserId` | `200 CrewMemberProfileResponse` | 요청자와 대상 모두 같은 크루의 ACTIVE 회원이어야 함 |
| `DELETE` | `/api/crews/{crewId}/members/me` | path `crewId` | `204`, body 없음 | 일반 크루원 자발적 탈퇴; 크루장은 불가 |
| `DELETE` | `/api/crews/{crewId}/members/{targetUserId}` | path `crewId`, `targetUserId` | `204`, body 없음 | 크루장만 일반 크루원 강퇴; 멱등 아님 |

```ts
type CreateCrewRequest = { name: string }; // Swagger maxLength: 100
type JoinCrewRequest = { joinCode: string }; // ^[0-9]{6}$, 앞자리 0 보존
```

자발적 탈퇴와 강퇴는 멤버십을 삭제하지 않고 `WITHDRAWN`으로 바꿉니다. 과거 기록과 공유 사진은 유지하며 같은 코드로 재가입할 수 있습니다.

활성 세션 중 탈퇴·강퇴 규칙:

| 세션 | 참가 상태 | 결과 |
| --- | --- | --- |
| 없음 | 무관 | 허용 |
| `RECRUITING` | `JOINED` | 허용, 참가자를 `CANCELED`로 변경 |
| `IN_PROGRESS`, `COMPLETING` | `PARTICIPATING` 또는 비정상 `JOINED` | `409`, 상태 유지 |
| `IN_PROGRESS`, `COMPLETING` | `SUBMITTED`, `CANCELED`, `NOT_SUBMITTED`, 미참가 | 허용 |

### 같이 플로깅 세션 API

아래 API는 request body가 없으며 `SessionResponse`를 반환합니다.

| Method | Path | 권한 및 동작 |
| --- | --- | --- |
| `POST` | `/api/crews/{crewId}/plogging-sessions` | 크루장. 새 `RECRUITING` 생성; 활성 세션이 있으면 기존 세션 반환 |
| `GET` | `/api/crews/{crewId}/plogging-sessions/active` | ACTIVE 크루원. `RECRUITING/IN_PROGRESS/COMPLETING`만 반환; 없으면 `200` 빈 body/null 가능 |
| `GET` | `/api/crew-plogging-sessions/{sessionId}` | ACTIVE 크루원의 참가 후 상태 폴링; `CANCELED`도 조회됨 |
| `POST` | `/api/crew-plogging-sessions/{sessionId}/participants/me` | `RECRUITING` 참가; 기존 JOINED는 멱등, CANCELED는 JOINED로 복구 |
| `DELETE` | `/api/crew-plogging-sessions/{sessionId}/participants/me` | 모집 중 일반 참가자 취소; 크루장 불가; CANCELED 재호출은 현재 상태 반환 |
| `POST` | `/api/crew-plogging-sessions/{sessionId}/cancel` | 크루장. `RECRUITING → CANCELED`; JOINED도 CANCELED; 재호출 멱등 |
| `POST` | `/api/crew-plogging-sessions/{sessionId}/start` | 크루장. `RECRUITING → IN_PROGRESS`; JOINED를 PARTICIPATING으로 변경; IN_PROGRESS 재호출 멱등 |
| `POST` | `/api/crew-plogging-sessions/{sessionId}/end` | 크루장. 공통 종료 시각 저장; 미제출자가 있으면 COMPLETING, 전원 SUBMITTED면 COMPLETED |

세션 상태:

- `RECRUITING`: 참가 모집 중인 활성 세션
- `IN_PROGRESS`: 측정 중인 활성 세션
- `COMPLETING`: 전체 종료 후 개인 기록 제출을 기다리는 활성 세션
- `COMPLETED`: 대표 크루 기록이 최종화된 비활성 세션
- `CANCELED`: 시작 전 전체 취소된 비활성 세션

참가 상태:

- `JOINED`: 시작 대기
- `PARTICIPATING`: 측정 중이며 개인 기록 미제출
- `SUBMITTED`: 개인 기록 제출 완료
- `NOT_SUBMITTED`: 제출 기한 만료
- `CANCELED`: 개인 또는 전체 모집 취소

크루장의 개인 완료와 `/end`는 별개입니다. 개인 완료는 `POST /api/plogging-sessions/complete`에 `crewPloggingSessionId`를 넣어 호출합니다. 마지막 참가자가 제출하거나 제출 마감 스케줄러가 미제출자를 `NOT_SUBMITTED`로 바꾸면 `COMPLETED`가 됩니다. 기본 유예 시간에 의존하지 말고 `submissionDeadlineAt`을 표시합니다.

### 크루 기록 API

| Method | Path | 파라미터 | 성공 응답 |
| --- | --- | --- | --- |
| `GET` | `/api/crews/{crewId}/plogging-records` | path `crewId`; query `page?=0`, `size?=20`, `sort?: string[]` | `200 RecordListResponse` |
| `GET` | `/api/crews/{crewId}/plogging-records/{sessionId}` | path `crewId`, `sessionId` | `200 RecordDetailResponse` |

두 API 모두 현재 ACTIVE 크루원만 호출할 수 있습니다. 목록은 완료 시각 최신순이며 외부 `sort` 값은 무시될 수 있습니다. 상세에는 개인 이동 경로·경험치·개인 상세 기록을 포함하지 않습니다.

대표 기록은 크루장이 제출했으면 크루장 기록, 아니면 가장 먼저 제출한 기록을 사용합니다. 정상 제출 기록이 없으면 대표 수치가 `null`일 수 있습니다.

### 크루 오류 처리

| HTTP | 대표 상황 |
| --- | --- |
| `400` | 참여 코드 형식 오류, FREE가 아닌 같이 플로깅 완료, 이미지 검증 실패 |
| `401` | JWT 없음·만료·유효하지 않음 |
| `403` | ACTIVE 크루원이 아님, 크루장 전용 동작, 세션 참가자가 아님 |
| `404` | 크루·세션·대상 크루원이 없음 |
| `409` | 이미 가입, 현재 상태에서 불가능한 세션 동작, 중복 제출, 제출 마감 만료, 탈퇴·강퇴 충돌 |

오류 메시지 문자열로 분기하지 말고 HTTP status와 재조회한 현재 상태를 사용합니다. Swagger의 크루원 목록·프로필 `403` response schema는 성공 DTO를 잘못 가리키므로 성공 DTO로 파싱하지 않습니다.

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
- Response body: `RoutesResponse`
- 프론트 연동 메모: 응답의 `routes` 배열에는 방향이 다각화된 왕복 추천 경로들이 들어옵니다. 각 항목의 `encodedPath`는 지도 경로 표시를 위해 polyline 디코딩이 필요하고, `ploggingScore`는 추천 카드의 점수 표시에 사용합니다.
- URL 예시

```text
https://moong.co.kr/api/v1/routes?lat=35.175911&lon=126.912254&time=30&mode=PLOGGING
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
  crewPloggingSessionId?: number | null;
};

type CompleteResponse = {
  ploggingSessionId: number;
  previousExperience: number;
  currentExperience: number;
  previousLevel: number;
  currentLevel: number;
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

### Crew

Swagger의 response schema에는 `required`/nullable 정보가 충분하지 않으므로 아래 타입은 운영 handoff의 실제 null 계약을 반영합니다.

```ts
type CrewRole = "LEADER" | "MEMBER";

type CrewPloggingStatus =
  | "RECRUITING"
  | "IN_PROGRESS"
  | "COMPLETING"
  | "COMPLETED"
  | "CANCELED";

type ActiveCrewPloggingStatus = Extract<
  CrewPloggingStatus,
  "RECRUITING" | "IN_PROGRESS" | "COMPLETING"
>;

type CrewPloggingParticipantStatus =
  | "JOINED"
  | "PARTICIPATING"
  | "SUBMITTED"
  | "NOT_SUBMITTED"
  | "CANCELED";

type CrewResponse = {
  crewId: number;
  name: string;
  joinCode: string;
  role: CrewRole;
};

type CrewListItemResponse = {
  crewId: number;
  name: string;
  leaderNickname: string;
  memberCount: number;
  memberProfileImageUrls: string[];
  myRole: CrewRole;
  completedPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
  totalPloggingSeconds: number;
  hasActiveSession: boolean;
  activeSessionStatus: ActiveCrewPloggingStatus | null;
};

type CrewListResponse = {
  crews: CrewListItemResponse[];
};

type CrewMemberResponse = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  role: CrewRole;
};

type SessionResponse = {
  crewPloggingSessionId: number;
  status: CrewPloggingStatus;
  startedAt: string | null;
  endedAt: string | null;
  submissionDeadlineAt: string | null;
  joinedByMe: boolean;
  participantStatus: CrewPloggingParticipantStatus | null;
  recordSubmittedByMe: boolean;
  participantCount: number;
  crewRecordCompleted: boolean;
};

type RecordSummaryResponse = {
  crewPloggingSessionId: number;
  ploggingDate: string;
  representativeNickname: string | null;
  stepCount: number | null;
  distanceMeters: number | null;
  ploggingSeconds: number | null;
  participantCount: number;
  sharedPhotoCount: number;
  representativePhotoUrl: string | null;
};

type CrewDetailResponse = {
  crewId: number;
  name: string;
  joinCode: string;
  memberCount: number;
  members: CrewMemberResponse[];
  myRole: CrewRole;
  leader: boolean;
  completedPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
  totalPloggingSeconds: number;
  activeSession: SessionResponse | null;
  completedRecords: RecordSummaryResponse[];
};

type CrewMemberListItemResponse = CrewMemberResponse & {
  joinedAt: string;
};

type CrewMemberListResponse = {
  members: CrewMemberListItemResponse[];
};

type CrewMemberProfileResponse = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  level: number;
  experience: number;
  ploggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
};

type RecordListResponse = {
  content: RecordSummaryResponse[];
  hasNext: boolean;
};

type ParticipantResponse = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
};

type PhotoResponse = {
  photoId: number;
  objectUrl: string;
  uploaderUserId: number;
  uploaderNickname: string;
  uploaderProfileImageUrl: string | null;
  registeredAt: string;
};

type RecordDetailResponse = {
  crewPloggingSessionId: number;
  mode: "FREE";
  startedAt: string;
  endedAt: string;
  placeName: string | null;
  representativeUserId: number | null;
  representativeNickname: string | null;
  stepCount: number | null;
  distanceMeters: number | null;
  caloriesBurned: number | null;
  ploggingSeconds: number | null;
  mapImageUrl: string | null;
  participantCount: number;
  participants: ParticipantResponse[];
  photos: PhotoResponse[];
};
```

`leaderNickname`은 non-null입니다. `memberProfileImageUrls`는 ACTIVE 크루원의 유효한 URL만 가입순으로 담고 이미지가 없으면 `[]`입니다. 배열 길이를 인원 수로 사용하지 말고 `memberCount`를 사용합니다.

크루 기록 상세의 `placeName`, `caloriesBurned`, `mapImageUrl`이 `null`이면 해당 UI를 숨기거나 “측정 정보 없음”으로 처리합니다. 특히 칼로리 `null`을 `0 kcal`로 바꾸지 않습니다.

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
  encodedPath: string;
  ploggingScore: number;
  timeMillis: number;
};

type RoutesResponse = {
  routes: RouteResponse[];
};
```

## Appendix: Hotspot Vector Tile Server

이 내용은 Swagger에 포함되지 않은 외부 연동 메모입니다. 쓰레기 발생률 히트맵을 표시할 때 사용합니다.

- 타일 URL: `http://54.180.111.192:3000/hotspots/{z}/{x}/{y}`
- 지원 줌 레벨: `8.0`-`18.0`
- source layer ID:
  - `hotspots_res7`: Coarse Hexagon. Zoom `12.0`에서 opacity `0.45`, `12.8`에서 `0.0`
  - `hotspots_res9`: Fine Hexagon. Zoom `12.0`에서 `0.0`, `12.8`-`16.5`에서 `0.60`, `17.2`에서 `0.0`
  - `hotspots_res11`: Ultra-Fine H3. Zoom `16.5`에서 `0.0`, `17.2` 이후 `0.55`, 테두리 opacity/width `0`
- 형식: MVT vector tile
- CORS: 전체 허용
- 주요 속성: `h3_cell`, `trash_score_avg` (`0.0`-`1.0`), `trash_score_max`, `cell_count`
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
        tileUrlTemplates={[`${TILE_SERVER_URL}/hotspots/{z}/{x}/{y}`]}
      >
        <MapLibreGL.FillLayer
          id="hotspots-res9-fill"
          sourceLayerID="hotspots_res9"
          style={{
            fillColor: [
              "interpolate",
              ["linear"],
              ["get", "trash_score_avg"],
              0.0,
              "#33ccff",
              0.5,
              "#ff9900",
              1.0,
              "#ff3366",
            ],
            fillOpacity: [
              "interpolate",
              ["linear"],
              ["zoom"],
              12.0,
              0.0,
              12.8,
              0.6,
              16.5,
              0.6,
              17.2,
              0.0,
            ],
          }}
        />
      </MapLibreGL.VectorSource>
    </MapLibreGL.MapView>
  );
}
```
