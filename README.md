# PloggingFE

플로깅 활동을 시작하고, 경로 추천을 받고, 진행 기록과 리포트를 확인하는 Expo Router 기반 React Native 앱입니다.

## 시작하기

```bash
npm install
npx expo start --dev-client
```

## 폴더 구조

```txt
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    history.tsx
    profile.tsx
  ai-route.tsx
  plogging.tsx
  report.tsx
  Map.tsx

src/
  features/
    plogging-home/
      screens/
      components/
      data/
      hooks/
      services/
      index.ts
    route-recommendation/
      screens/
      components/
      data/
      hooks/
      services/
      index.ts
    plogging-session/
      screens/
      components/
      data/
      hooks/
      services/
      index.ts
    plogging-history/
      screens/
      components/
      data/
      hooks/
      services/
      index.ts
    plogging-report/
      screens/
      components/
      data/
      hooks/
      services/
      index.ts
    profile/
      screens/
      components/
      data/
      hooks/
      services/
      index.ts
    trash-reporting/
    auth/
    notifications/
    settings/

  shared/
    ui/
    map/
    hooks/
    utils/
    types/
    constants/

docs/
  folder-structure.md
  refactor-report.md
```

## 구조 원칙

- `app`: Expo Router 라우트 엔트리만 둡니다. 화면 구현은 `src/features`에 둡니다.
- `src/features`: 사용자 기능 단위로 나눕니다.
- `src/shared`: 여러 기능에서 함께 쓰는 UI, 지도, 타입, 유틸리티, 상수를 둡니다.
- feature 내부는 기본적으로 `screens`, `components`, `data`, `services`, `hooks`를 사용합니다.
- 라우트 파일은 feature의 `index.ts`에서 화면을 가져옵니다.

## 기능별 책임

- `plogging-home`: 플로깅 시작 전 진입 화면입니다. 자유모드, AI 경로 추천, 시작 액션 같은 시작 설정 흐름을 담당합니다.
- `route-recommendation`: AI 경로 추천, 추천 옵션, 경로 선택 흐름을 담당합니다.
- `plogging-session`: 플로깅 진행 중 화면, 타이머, 현재 통계, 일시정지/종료 흐름을 담당합니다.
- `plogging-history`: 과거 플로깅 기록 목록과 누적 차트를 담당합니다.
- `plogging-report`: 플로깅 완료 후 결과 리포트, 공유, 회고 기록을 담당합니다.
- `profile`: 사용자 프로필, 레벨, 누적 활동 요약을 담당합니다.
- `trash-reporting`: 쓰레기 제보, 사진 촬영, 위치/카테고리 입력을 담당할 예정입니다.
- `auth`: 로그인, 회원가입, 세션 관리를 담당할 예정입니다.
- `notifications`: 알림 목록과 푸시 알림 설정을 담당할 예정입니다.
- `settings`: 앱 설정, 지도/권한/약관/문의 흐름을 담당할 예정입니다.

## Import 규칙

```ts
import { HomeScreen } from "@/src/features/plogging-home";
import { ProfileScreen } from "@/src/features/profile";
import { PloggingMap } from "@/src/shared/map";
import { ScreenRoot } from "@/src/shared/ui";
```

- feature 간 직접 import는 피합니다.
- 두 개 이상의 feature에서 쓰기 시작한 컴포넌트는 `src/shared`로 이동합니다.
- 특정 기능에서만 쓰는 데이터와 컴포넌트는 해당 feature 내부에 둡니다.

## 검증 명령어

```bash
npm run lint
npx tsc --noEmit
npx expo export --platform web
```
