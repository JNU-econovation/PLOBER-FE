# 플로버 iOS 1.0.1 업데이트 제출 최종 QA 보고서

- 기준일: 2026-07-23
- 대상: `1.0.1 (18)`
- 제출 유형: 기존 App Store 앱의 버전 업데이트
- Bundle ID: `com.econovation.plover`
- 판정: **조건부 보류 — 자동 검사와 앱 보완은 완료했으나 외부·수동 차단사항이 남음**

## 결론

EAS Update, App Store용 로컬 빌드 프로필, Privacy Manifest와 주요 프런트엔드 안정성 보완을 적용하고 서명된 IPA를 생성·검증했다. 현재 저장소는 해당 IPA를 TestFlight에 올려 실기기 QA를 진행할 수 있는 상태다. 단, 아래 “외부·수동 차단사항”을 완료하기 전에는 App Review에 제출하지 않는다.

## 완료된 보완

### 배포 기반

- `expo-updates` 설치 및 EAS project update URL 설정
- tracked native iOS 빌드에 맞춰 명시적 `runtimeVersion = 1.0.1` 적용
- iOS 전용 Preview, Staging, Production 업데이트 스크립트 추가
- `local-production` 로컬 App Store 빌드 프로필 추가
- EAS 빌드 아카이브에 iOS 네이티브 프로젝트와 Live Activity Extension이 포함되도록 ignore 규칙 정리
- 네이티브 `Expo.plist`에 Production channel, update URL과 runtime `1.0.1` 반영
- CocoaPods 재설치와 `expo-updates` 네이티브 의존성 반영

### 개인정보·심사 대응

- 앱과 네이티브 Privacy Manifest의 수집 데이터 선언 정렬
- Face ID를 사용하지 않는 현재 동작에 맞춰 불필요한 Face ID 권한 설명 제거
- 홈의 쓰레기 제보에서 카메라 실행 전에 사진과 현재 정밀 위치 전송 목적을 고지하고 명시적 동의 요청
- 동의 거부 시 사진·위치를 전송하지 않고 다른 기능을 계속 사용 가능
- 일반 개인·크루 인증 사진의 자동 쓰레기 분석 호출 제거
- 회원 탈퇴 확인창에 삭제 요청 범위, 복구 불가, 법정 보관·공동 크루 기록의 분리 보관 또는 비식별 가능성 표시
- 크루원 프로필에 신고 메일과 기기 내 사용자 차단/해제 경로를 추가하고, 차단 사용자의 공유 사진·닉네임·프로필을 기록 화면에서 숨김
- 크루명·닉네임 입력에 명백한 욕설·성적 표현의 1차 클라이언트 검사를 추가

### 앱 안정성

- 기록·주간·월간 통계와 프로필 화면을 다시 열 때 서버 값 새로고침
- 개인 세션과 다른 크루 세션의 상태가 섞이지 않도록 session key 분리
- 경로가 비어 있는 크루 기록에 `0,0` 좌표를 보내지 않고 유효한 시작·종료 또는 현재 위치 사용
- 같이줍기 대기·오류 패널이 하단 탭바에 가려지지 않도록 보완
- 8,000개를 넘는 백그라운드 경로 포인트의 적용 커서를 안정적인 key/time 기준으로 변경
- 로그인 전에 위치 권한을 요청하지 않고 인증 후 위치 provider를 시작하도록 변경
- Production dependency audit에서 critical/high 취약점을 제거하고, Expo SDK 54 전환 도구 체인의 moderate 항목은 강제 major upgrade 없이 기록

## 자동·구성 검증 기록

| 검사 | 결과 | 비고 |
| --- | --- | --- |
| `npm run lint` | 통과 | 기준 시점 검사 |
| `npx tsc --noEmit` | 통과 | 기준 시점 검사 |
| `npx expo-doctor` | 17/17 통과 | 네이티브 config-sync 검사는 의도적으로 비활성화 |
| `npx expo export --platform ios` | 통과 | iOS production bundle 생성 |
| `pod install` | 통과 | `EXUpdates 29.0.19` 포함 |
| `eas build:inspect --stage archive` | 통과 | Extension, Privacy manifest, Expo plist 포함 확인 |
| 로컬 EAS App Store 빌드 | 통과 | 메인 앱과 Live Activity Extension 서명 성공 |
| IPA 내부 서명·프로비저닝 | 통과 | 두 타깃 `get-task-allow=false`, production channel/runtime 확인 |
| `npm audit --omit=dev` | critical/high 0 | moderate 18은 Expo SDK 54 전환 도구 체인 |

### EAS Update 검증 기록

| 항목 | 값 |
| --- | --- |
| 생성 채널 | `preview`, `staging`, `production` |
| 검증 발행 채널 | `preview` — Production에는 발행하지 않음 |
| Runtime / Platform | `1.0.1` / `ios` |
| Update group ID | `45b6162a-508e-4fec-a15a-3f13c2d4d672` |
| 메시지 | `QA: iOS 1.0.1 EAS Update pipeline verification` |

Preview 업데이트는 현재 커밋되지 않은 작업 트리에서 발행됐다. Production 발행 전에는 변경을 검토·커밋하고 동일 커밋을 Preview와 Staging에서 다시 검증한다.

최종 IPA를 만들기 직전에는 마지막 코드 수정 이후 상태로 아래 명령을 다시 실행하고 모두 통과한 결과만 제출한다.

```bash
npm ci
npm run qa
npx expo install --check
npx expo export --platform ios
git diff --check
```

## 외부·수동 차단사항

| 우선순위 | 차단사항 | 완료 조건 |
| --- | --- | --- |
| P0 | UGC 서버측 안전장치 | 현재 앱의 1차 텍스트 검사·신고 메일·기기 내 차단에 더해, 크루명·닉네임·이미지 필터를 서버에서 강제하고 신고와 차단이 계정/운영 서버에 반영되며 처리 연락처·SLA가 공개됨 |
| P0 | HTTPS와 ATS | `http://54.180.111.192:3000` hotspot 타일을 HTTPS로 제공하고 `NSAllowsArbitraryLoads` 및 불필요한 HTTP 예외 제거 |
| P0 | 계정 삭제 실제 범위 | 백엔드 계정·프로필·개인 기록·S3 데이터의 삭제/비식별, 공동 크루 기록 보존, Kakao/Apple 연결 해제를 실제 계정으로 검증하고 정책·Review Notes와 일치 |
| P0 | 심사용 계정 | OTP·CAPTCHA·전화 인증 없이 로그인되는 Kakao 계정 A/B를 만들고 심사 기간 유지 |
| P0 | 두 기기 QA | 실제 iPhone 2대에서 크루장·크루원 전체 같이줍기와 백그라운드·강제 종료 복구 통과 |
| P0 | 새 스크린샷 | 최종 Release UI로 6.9인치 RGB·무알파 이미지 1~10장 제작, 현실적인 수치와 가상 사용자 데이터 사용 |
| P1 | 운영 문서 | Support URL의 실제 연락처, 개인정보 처리방침의 AI 처리자·보관·삭제·UGC 운영 내용을 확정하고 로그인 없이 접근 확인 |
| P1 | App Store 설문 | App Privacy, Age Rating, Content Rights, DSA trader, 규제 의료기기와 수출 규정 답변을 운영 책임자가 확인 후 Publish |

Apple의 UGC 요구사항은 필터링, 신고, 악성 사용자 차단과 연락 가능한 운영자 정보를 포함한다. 클라이언트 화면만 추가하고 서버에서 우회 가능한 상태는 완료로 판정하지 않는다. [App Review Guidelines 1.2](https://developer.apple.com/app-store/review/guidelines/)

## 실기기 QA 매트릭스

### 계정·권한

- [ ] Kakao 계정 A/B 로그인, 로그아웃, 재로그인
- [ ] Apple 로그인 재검증
- [ ] 로그인 화면에서는 위치 권한 팝업이 나타나지 않음
- [ ] 위치 `앱 사용 중`·`항상`, 동작·피트니스, 카메라, 사진 권한 허용·거부
- [ ] 쓰레기 제보 동의 거부 시 카메라와 네트워크 전송이 시작되지 않음
- [ ] 동의 시 사진과 현재 정밀 위치만 쓰레기 분석 API로 전송됨

### 개인 플로깅

- [ ] 자유·AI 추천 모드 시작, 일시정지, 재개, 종료, 저장
- [ ] 화면 꺼짐·백그라운드·네트워크 단절 후 경로/시간/걸음 복구
- [ ] 앱 강제 종료 후 세션 복구
- [ ] 인증 사진이 기록에는 저장되지만 쓰레기 분석으로 자동 전송되지 않음
- [ ] 저장 직후 기록·주간·월간 통계와 프로필 경험치 갱신
- [ ] 리포트 저장과 공유

### 크루·같이줍기

- [ ] 계정 A로 크루 생성, 계정 B로 6자리 초대번호 가입
- [ ] 크루장 모집 → 크루원 참여 → 크루장 시작
- [ ] 두 기기의 이동 경로·시간·걸음·사진이 각자 유지
- [ ] 크루장 전체 종료가 두 기기에 반영
- [ ] 각자 기록 제출 후 공동 기록·통계·사진 표시
- [ ] 이전 개인/다른 크루 세션 상태가 새 세션과 섞이지 않음
- [ ] 경로 없음/권한 거부 상황에서 `0,0`이 서버로 전송되지 않음
- [ ] 탭바가 대기·오류·제출 버튼을 가리지 않음

### 심사·운영

- [ ] UGC 금칙어·이미지 필터 우회 시도 차단
- [ ] 콘텐츠 신고 접수와 운영자 처리 확인
- [ ] 사용자 차단 후 해당 사용자의 콘텐츠·상호작용 제한 확인
- [ ] 홈 → 우측 상단 마이페이지 → 우측 상단 계정 메뉴 → 회원탈퇴 접근
- [ ] 탈퇴 후 서버·스토리지·소셜 로그인 상태가 정책과 일치
- [ ] Support/Privacy URL이 로그인 없이 열림
- [ ] Release 앱에 개발 API, localhost, QA 메뉴와 가짜 데이터가 없음

## IPA·TestFlight 기록란

로컬 빌드가 끝난 뒤 실제 값으로 갱신한다. 비밀번호나 인증서 개인키는 적지 않는다.

| 항목 | 값 |
| --- | --- |
| IPA | `/Users/lewis/PloggingFE/builds/plover-ios-appstore-1.0.1-build18.ipa` |
| SHA-256 | `2aeb1895805492054c5824189797bdcd8fddf2f806ad72d9d0653e3d761468b8` |
| Version / Build | `1.0.1 (18)` |
| Extension 포함 | `YES — 1.0.1 (18), App Store profile` |
| TestFlight 처리 상태 | `NOT UPLOADED` |
| 두 기기 QA 일시 | `[YYYY-MM-DD HH:mm KST]` |
| QA 담당자 | `[NAME]` |

## 사용자에게 알릴 업데이트 요약

```text
크루와 함께하는 같이줍기 기능이 새로 추가되었습니다.

• 크루 생성 및 6자리 초대번호 가입
• 모집부터 함께 시작·종료, 개인 기록 제출까지 연결
• 크루별 누적 통계와 함께한 기록 확인
• 같이줍기 결과와 인증 사진 저장 및 공유
• 개인 플로깅 기록과 리포트 화면 개선
```

## 출시 결정

- 위 P0 차단사항이 하나라도 열려 있으면: `HOLD`
- P0 완료, 동일 IPA로 TestFlight 두 기기 QA 통과, 스토어 placeholder 교체 완료: `GO`
- 출시 후 심각한 JS/asset 문제: Preview → Staging → Production EAS Update
- 네이티브·권한·Extension 문제: 새 앱 Version과 IPA로 App Review 재제출
