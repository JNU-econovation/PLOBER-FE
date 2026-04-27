# PloggingFE 폴더 구조 설계

## 설계 기준

- `app`: Expo Router 라우트 엔트리만 둔다. 화면 구현, 데이터, 컴포넌트는 두지 않는다.
- `src/features`: 사용자가 인식하는 기능 단위로 나눈다.
- `src/shared`: 여러 기능에서 함께 쓰는 UI, 지도, 타입, 유틸리티를 둔다.
- feature 내부는 기본적으로 `screens`, `components`, `data`, `services`, `hooks`를 사용한다.

## 현재 적용 구조

```txt
app/
  (tabs)/
  ai-route.tsx
  plogging.tsx
  report.tsx
  Map.tsx

src/
  features/
    plogging-home/
    route-recommendation/
    plogging-session/
    plogging-history/
    plogging-report/
    profile/
    trash-reporting/
    auth/
    onboarding/
    statistics/
    badges/
    challenges/
    leaderboard/
    community/
    notifications/
    settings/
  shared/
    ui/
    map/
    hooks/
    utils/
    types/
    constants/
```

## 기능별 책임

- `plogging-home`: 플로깅 시작 전 홈 화면과 앱의 첫 진입 흐름.
- `route-recommendation`: AI 경로 추천, 추천 옵션, 추천 경로 선택 흐름.
- `plogging-session`: 플로깅 진행 중 화면, 타이머, 현재 통계, 일시정지/종료 흐름.
- `plogging-history`: 과거 플로깅 기록 목록, 월간/주간 누적 차트.
- `plogging-report`: 플로깅 완료 후 결과 리포트, 공유, 회고 기록.
- `profile`: 사용자 프로필, 레벨, 누적 활동 요약.
- `trash-reporting`: 쓰레기 제보, 사진 촬영, 위치/카테고리 입력.
- `auth`: 로그인, 회원가입, 세션 관리.
- `onboarding`: 첫 실행 안내, 권한 안내, 초기 환경 설정.
- `statistics`: 장기 통계, 기간별 비교, 개인 분석.
- `badges`: 레벨, 칭호, 배지, 업적.
- `challenges`: 주간/지역 챌린지, 참여 상태, 보상.
- `leaderboard`: 랭킹, 친구/지역 순위.
- `community`: 피드, 인증글, 댓글, 좋아요.
- `notifications`: 알림 목록, 푸시 알림 설정.
- `settings`: 앱 설정, 지도/권한/약관/문의.

## Import 원칙

- 라우트 파일은 feature index에서 가져온다.
  - 예: `@/src/features/plogging-report`
- feature가 공통 UI나 지도를 쓸 때는 `shared` alias를 사용한다.
  - 예: `@/src/shared/ui`, `@/src/shared/map`
- feature 간 직접 import는 피한다. 공유가 필요하면 `shared`로 올리거나 서비스/API 계층을 둔다.
- feature 내부 데이터는 해당 feature의 `data`에 둔다.

## 확장 시 규칙

- 새 화면이 라우트로 노출되면 `app`에 얇은 엔트리를 만들고 구현은 해당 feature `screens`에 둔다.
- API 연동이 생기면 feature의 `services`에 요청 함수를 두고, 공통 fetch/client는 `shared`로 둔다.
- 재사용 컴포넌트라도 한 기능에서만 쓰이면 해당 feature `components`에 둔다.
- 두 개 이상의 feature에서 쓰기 시작하면 `shared/ui` 또는 적절한 shared 모듈로 이동한다.
