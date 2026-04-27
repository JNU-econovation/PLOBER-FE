# PloggingFE 클린코드 리팩토링 결과보고서

## 1. 개요

이번 리팩토링은 Expo Router 기반 플로깅 앱의 화면 동작을 유지하면서, `src/features/plogging` 내부 코드를 책임별로 재구성하는 데 집중했다. 주요 목표는 큰 공통 파일을 분리하고, 화면 파일의 읽기 흐름을 단순화하며, 지도와 데이터 계층의 중복을 줄이는 것이었다.

## 2. 리팩토링 전 주요 문제

- `components/plogging-ui.tsx`에 레이아웃, 버튼, 탭바, 장식 요소, 통계 표시 컴포넌트가 함께 있어 변경 영향 범위를 파악하기 어려웠다.
- `plogging-map.tsx`와 `plogging-map.web.tsx`가 동일한 mock 지도 구현을 중복으로 가지고 있었다.
- `plogging-data.ts`에 지도 좌표, 경로 선택지, 히스토리, 리포트, 진행 중 통계가 함께 있어 데이터의 목적이 섞여 있었다.
- 일부 화면은 긴 JSX 블록이 한 함수에 몰려 있어 섹션 단위 구조를 빠르게 읽기 어려웠다.
- 몇몇 버튼에는 `hitSlop`, press feedback, 접근성 상태가 일관되게 적용되지 않았다.

## 3. 주요 변경 내용

- 공통 UI를 `components/ui` 하위로 분리했다.
  - `layout.tsx`: `ScreenRoot`, `TopInset`
  - `controls.tsx`: 원형 버튼, 지도 컨트롤, 하단 CTA, 모드 스위치
  - `display.tsx`: 통계 숫자, 배지, 카메라/핀/장식 glyph
  - `navigation.tsx`: `PloggingTabBar`
- 지도 코드를 `components/map` 하위로 정리했다.
  - 공통 props 타입을 `map/types.ts`로 분리했다.
  - web/default mock 지도는 `mock-plogging-map.tsx` 하나를 재사용한다.
  - native 지도는 Naver map 구현을 유지하고, `zoom` prop이 native에서 쓰이는 구조를 명확히 했다.
- 데이터 파일을 목적별로 분리했다.
  - `map-data.ts`, `route-options.ts`, `activity-data.ts`, `history-data.ts`, `report-data.ts`
  - 기존 경로 호환을 위해 `plogging-data.ts`는 재-export 파일로 유지했다.
- 화면 파일을 섹션 컴포넌트 중심으로 정리했다.
  - 히스토리: 월간 요약, 차트, 기록 행 분리
  - AI 경로: 헤더와 경로 카드 분리
  - 진행 화면: 타이머 카드와 액션 dock 분리
  - 리포트: 헤더, 제목, 거리 카드, 지표 카드, 레벨 카드, 메모 카드 분리
- 작은 UX 개선을 반영했다.
  - 주요 버튼에 `hitSlop`을 추가했다.
  - 모드 선택과 탭에 선택 상태 접근성 정보를 정리했다.
  - 기존 화면과 라우팅 동작은 유지했다.

## 4. 검증 결과

- `npm run lint`: 통과
- `npx tsc --noEmit`: 통과
- `npx expo export --platform web`: 통과
  - 정적 라우트로 `/`, `/history`, `/profile`, `/ai-route`, `/plogging`, `/report`, `/Map`이 생성됨을 확인했다.
  - 기존 `app.json`이 삭제된 `assets/images/favicon.png`를 참조한다는 경고가 남아 있다.

## 5. 남은 개선 과제

- `app.json`의 icon, splash, favicon 경로가 현재 삭제된 이미지 파일을 참조하고 있으므로 앱 자산 정책을 정해야 한다.
- 실제 데이터 연동 시 현재 mock 데이터 파일들을 API 응답 모델 또는 repository 계층으로 자연스럽게 대체할 수 있다.
- UI 컴포넌트가 더 늘어나면 `components/ui` 안에서도 button, feedback, metric처럼 한 단계 더 세분화할 수 있다.

## 6. 추가 구조 개편

- `src/features/plogging`에 모여 있던 화면을 기능 경계별로 재배치했다.
- 현재 기능은 `plogging-home`, `route-recommendation`, `plogging-session`, `plogging-history`, `plogging-report`, `profile`로 분리했다.
- 여러 기능에서 공유하는 UI, 지도, 테마는 `src/shared`로 이동했다.
- 추후 확장을 위해 `trash-reporting`, `auth`, `onboarding`, `statistics`, `badges`, `challenges`, `leaderboard`, `community`, `notifications`, `settings` 기능 폴더를 준비했다.
- 전체 구조 설명은 `docs/folder-structure.md`에 정리했다.
