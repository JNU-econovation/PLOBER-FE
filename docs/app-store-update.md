# 플로버 iOS 1.0.1 업데이트 배포·심사 가이드

- 기준일: 2026-07-23
- 앱 버전: `1.0.1`
- 현재 빌드 번호: `18` — App Store Connect에서 이미 사용했다면 더 큰 번호 사용
- 앱 Bundle ID: `com.econovation.plover`
- Live Activity Extension: `com.econovation.plover.PloverLiveActivityExtension`
- App Store Connect App ID: `6771245057`

이 문서는 **이미 App Store에 등록·배포된 플로버의 새 버전 업데이트 제출**을 기준으로 JavaScript 업데이트, 로컬 IPA 생성, TestFlight 확인, App Store 업데이트 심사를 한 흐름으로 정리한다. 새 App 레코드나 새 Bundle ID를 만들지 않는다. App Store Connect에 붙여넣을 문구는 [app-store-submission-copy.md](./app-store-submission-copy.md), 현재 QA 판정은 [release-qa-report.md](./release-qa-report.md)에 있다.

## 현재 제출 판정

자동 검사와 여러 앱 안정성 수정은 완료했지만, 아래 항목을 실제 운영 환경에서 끝내기 전에는 App Review에 제출하지 않는다.

1. 현재 앱의 1차 텍스트 검사·신고 메일·기기 내 차단에 더해 서버에서 강제되는 UGC 금칙어·부적절 이미지 필터, 계정 단위 신고·차단과 운영자 처리 창구
2. HTTP hotspot 타일의 HTTPS 전환과 `NSAllowsArbitraryLoads` 제거
3. 심사용 Kakao 계정 2개와 두 대의 실제 iPhone을 이용한 전체 같이줍기 QA
4. 최종 Release UI로 촬영한 6.9인치 RGB·무알파 스크린샷
5. 회원 탈퇴 API의 실제 삭제·비식별·보관 범위와 Kakao/Apple 연결 해제 동작 확인

AI 쓰레기 사진 분석 전 동의, Privacy Manifest, EAS Update 설정과 프런트엔드 QA 보완은 완료했다. 완료 사항과 남은 항목을 섞어서 심사 노트에 쓰면 안 된다.

## 1. 배포 전 값 확인

| 항목 | 값 또는 확인 방법 |
| --- | --- |
| Version | `app.config.js`의 `1.0.1` |
| Build | `app.config.js`의 `ios.buildNumber`; 현재 `18` |
| Runtime | tracked native iOS용 명시적 `runtimeVersion`; 현재 `1.0.1` |
| EAS Update URL | `https://u.expo.dev/2f86cd67-1abb-4c64-a62b-5df3a9535df7` |
| Production API | EAS `production` 환경의 실제 값 확인; 비밀값은 저장소에 기록하지 않음 |
| App Store 출시 방식 | 이번 업데이트는 `Manually release this version` 권장 |

App Store Connect에서 이미 `1.0.1`이 출시·심사 중이거나 Build 18이 사용된 경우, 그 값을 다시 업로드할 수 없다. App Store Connect의 실제 상태를 기준으로 다음 미사용 Version/Build를 정한다.

## 2. 최종 자동 QA

저장소 루트에서 실행한다.

```bash
npm ci
npm run qa
npx expo install --check
npx expo export --platform ios
git diff --check
```

`npm run qa`는 lint, TypeScript, Expo Doctor를 차례로 실행한다. 이어서 다음을 확인한다.

```bash
plutil -lint ios/NaverMapPloggingApp/Info.plist
plutil -lint ios/NaverMapPloggingApp/PrivacyInfo.xcprivacy
plutil -lint ios/NaverMapPloggingApp/Supporting/Expo.plist
```

네이티브 Live Activity Extension이 있으므로 `ios` 폴더를 지우거나 배포 직전에 `expo prebuild --clean`을 실행하지 않는다. 새 클론에서도 `ios/PloverLiveActivityExtension`과 로컬 Expo Module이 포함됐는지 확인한다.

## 3. EAS Update 사용법

### 현재 채널

| 채널 | 용도 | 명령 |
| --- | --- | --- |
| `preview` | 개발자 1차 확인 | `npm run update:preview -- --message "..."` |
| `staging` | 제출 후보와 동일한 최종 점검 | `npm run update:staging -- --message "..."` |
| `production` | App Store 사용자 배포 | `npm run update:production -- --message "..."` |

세 npm 스크립트는 모두 `--platform ios`로 고정되어 있다. Android에는 이 명령으로 업데이트가 배포되지 않는다. EAS 환경은 현재 모두 `production` 변수를 사용하므로, 실제 비밀값은 EAS Dashboard에서 관리하고 `.env`나 문서에 넣지 않는다.

### 안전한 배포 순서

1. JS/TS와 이미지·폰트처럼 OTA가 허용되는 변경만 포함됐는지 확인한다.
2. `npm run qa`와 `npx expo export --platform ios`를 통과한다.
3. Preview에 올린다.

   ```bash
   npm run update:preview -- --message "fix: [변경 요약]"
   ```

4. Preview 채널 빌드를 완전히 종료한 뒤 첫 번째 cold launch로 업데이트를 확인·다운로드한다. 앱을 다시 완전히 종료하고 두 번째 cold launch에서 새 버전이 적용됐는지 확인한다.
5. 로그인, 자유 플로깅, 기록 저장, 크루 핵심 경로를 점검한 뒤 같은 커밋을 Staging에 올린다.

   ```bash
   npm run update:staging -- --message "release: 1.0.1 candidate [커밋]"
   ```

6. Staging에서도 cold launch를 두 번 하고 오프라인 재실행까지 확인한다.
7. 승인된 같은 커밋만 Production에 올린다.

   ```bash
   npm run update:production -- --message "release: [사용자에게 보이는 변경 요약]"
   ```

8. Production 기기에서도 cold launch 두 번, 앱 버전, 로그인과 핵심 기능을 확인한다.

업데이트 메시지에는 비밀번호, 토큰, 사용자 개인정보를 적지 않는다. Production 채널에는 개발 중인 브랜치나 Preview에서 검증하지 않은 커밋을 직접 배포하지 않는다.

### 명시적 runtime 운영 규칙

현재 runtime은 앱 Version과 같은 문자열 `1.0.1`로 명시되어 있다. tracked native iOS 프로젝트는 자동 `appVersion` 정책을 빌드에 사용할 수 없으므로, **Version을 바꿀 때 `runtimeVersion`과 네이티브 `Expo.plist`도 같은 값으로 직접 변경해야 한다.** Version과 runtime이 같은 모든 빌드는 같은 native runtime으로 간주된다. 다음 변경은 EAS Update로 배포하지 않는다.

- Expo/RN 또는 네이티브 라이브러리 추가·업데이트
- `Info.plist`, entitlement, capability, 권한 문구 변경
- Live Activity Extension 또는 네이티브 모듈 변경
- 앱 아이콘, 스플래시, Bundle ID, signing 변경
- Expo config plugin 결과나 네이티브 API 사용 방식 변경

네이티브 변경이 있으면 다음 미사용 앱 Version(예: `1.0.2`)으로 올리고 새 IPA를 심사받는다. Build 번호만 `18`에서 `19`로 올리는 것으로는 runtime이 분리되지 않는다. App Store에 배포된 `1.0.1`과 네이티브 구성이 다른 `1.0.1` 빌드를 만들지 않는 것을 운영 규칙으로 삼는다.

문제가 생긴 Production 업데이트는 EAS Dashboard에서 해당 채널의 직전 정상 업데이트로 되돌린 뒤 동일하게 cold launch 두 번으로 검증한다. 네이티브 문제는 OTA 롤백으로 해결할 수 없으므로 새 Version/Build 심사가 필요하다.

공식 참고: [EAS Update 배포](https://docs.expo.dev/eas-update/deployment/), [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)

## 4. 로컬 IPA 만들기

### 사전 준비

- Xcode와 CocoaPods 설치
- 유효한 Apple Developer Program
- EAS 로그인 계정이 프로젝트 `@younghyunchoi/NaverMapPloggingApp`에 접근 가능
- EAS `production` 환경 변수 준비
- 앱과 Extension의 Version/Build 일치
- 출력 경로 `builds/` 준비

### 빌드 명령

```bash
mkdir -p builds
npm run build:ios:local -- --output ./builds/plover-ios-appstore-1.0.1-build18.ipa
```

이 명령은 `local-production` 프로필을 사용한다. App Store용 distribution, `production` 채널·환경을 사용하지만 `autoIncrement`는 꺼져 있으므로 빌드 전에 미사용 Build 번호를 직접 확정해야 한다. 로컬 빌드는 EAS Cloud Build를 소비하지 않으며, 성공해도 App Store Connect에 자동 업로드되지 않는다.

### Extension provisioning 최초 설정

메인 앱의 배포 인증서가 준비되어 있어도 Live Activity Extension은 별도의 App Store provisioning profile이 필요하다. 첫 로컬 빌드에서 EAS가 `com.econovation.plover.PloverLiveActivityExtension` 자격 증명 생성을 묻는다면 다음 순서로 진행한다.

1. 실제 Apple Developer Team을 선택한다.
2. 기존 Apple Distribution 인증서를 재사용하거나 조직 정책에 맞게 새 인증서를 생성한다.
3. 메인 앱과 Extension 각각에 App Store provisioning profile을 생성·선택한다.
4. Apple 로그인 또는 2FA가 뜨면 계정 소유자가 직접 완료한다.
5. capability와 entitlement 경고가 나오면 임의로 제거하지 말고 Developer Portal의 App ID 설정과 비교한다.

자격 증명만 먼저 점검하려면 다음을 사용한다.

```bash
npx eas-cli@latest credentials --platform ios
```

IPA를 열어 `Payload/*.app/PlugIns/PloverLiveActivityExtension.appex`가 포함됐는지 확인한다. 빌드 실패 시 `.ipa`가 생성됐다고 간주하지 말고 마지막 `Build completed`와 출력 파일의 존재를 모두 확인한다.

공식 참고: [로컬 EAS Build](https://docs.expo.dev/build-reference/local-builds/)

## 5. IPA 업로드와 TestFlight

먼저 Transporter로 IPA를 끌어다 놓거나 다음 명령으로 업로드한다.

```bash
npx eas-cli@latest submit \
  --platform ios \
  --profile production \
  --path ./builds/plover-ios-appstore-1.0.1-build18.ipa
```

업로드 전 App Store Connect에서 같은 Build 번호가 사용되지 않았는지 확인한다. 비밀번호나 App Store Connect API Key는 저장소에 추가하지 않는다.

App Store Connect → 플로버 → TestFlight에서 다음 순서로 진행한다.

1. 빌드가 `Processing`을 끝낼 때까지 기다린다.
2. `Missing Compliance`가 보이면 실제 암호화 사용에 맞게 응답한다. 현재 설정은 `ITSAppUsesNonExemptEncryption = NO`다.
3. Internal Testing 그룹에 빌드를 추가한다.
4. 두 대의 실제 iPhone에 TestFlight 빌드를 새로 설치한다.
5. 심사용 Kakao 계정 A/B로 로그인한다.
6. [release-qa-report.md](./release-qa-report.md)의 실기기 매트릭스를 전부 통과한다.
7. 발견한 바이너리 문제는 Build 번호를 올려 새 IPA를 만든다. JS/asset만의 안전한 수정은 Preview/Staging 검증 후 EAS Update로 배포할 수 있다.

## 6. 기존 App Store 앱에 업데이트 버전 작성

1. App Store Connect → Apps → 기존 `플로버` App 레코드를 연다. 새 앱을 생성하지 않는다.
2. 현재 배포 버전과 심사 중인 버전을 확인한다.
3. iOS App 옆 `+` → New Version에 현재 배포 버전보다 높은 `1.0.1` 또는 다음 미사용 Version을 입력한다.
4. 기존 Bundle ID `com.econovation.plover`와 App Store Connect App ID `6771245057`을 그대로 사용한다.
5. [app-store-submission-copy.md](./app-store-submission-copy.md)의 설명, 키워드와 필수 `What’s New in This Version`을 붙여넣는다.
6. 기존 스크린샷이 최종 UI와 정확히 일치하면 유지할 수 있지만, 이번 크루 기능을 반영하지 않거나 오래된 UI라면 새 6.9인치 스크린샷으로 교체한다.
7. TestFlight를 통과한 새 Build를 선택한다. 이미 업로드된 Build 번호는 재사용할 수 없다.
8. App Review 연락처와 Sign-In Information에 심사용 계정 A를 입력한다.
9. Review Notes에는 두 번째 계정과 이번 업데이트의 정확한 테스트 경로를 넣는다. 실제 비밀번호는 App Store Connect에만 입력한다.
10. 이번 업데이트로 수집·처리 방식이 달라졌으므로 App Privacy 답변을 재검토한다. Age Rating, Content Rights, Export Compliance, DSA trader와 한국 배포 정보도 현재 운영 기준으로 확인한다.
11. 출시 방식은 이번 업데이트에서 `Manually release this version`을 권장한다.
12. Save 후 모든 경고가 사라졌는지 확인한다.

### 스크린샷

- iPhone 6.9인치 세로형 허용 크기 예: `1260×2736`, `1290×2796`, `1320×2868`
- PNG 또는 JPEG, RGB, 알파 채널·투명도 없음
- 최종 Release UI와 현실적인 활동 수치 사용
- 실제 이름, 위치, 초대번호 대신 심사용 가상 데이터 사용

확인 명령:

```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha path/to/screenshot.png
```

권장 화면은 크루 상세, AI 추천 경로, 같이줍기 모집, 6자리 가입, 같이줍기 진행·종료, 공동 기록, 개인 리포트다. [Apple 스크린샷 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)

### App Privacy 초안

백엔드·스토리지·AI 처리자와 SDK까지 확인한 뒤 Publish한다.

| 데이터 | 목적 | 사용자와 연결 | 추적 |
| --- | --- | --- | --- |
| Email Address | App Functionality | Yes | No |
| User ID | App Functionality | Yes | No |
| Precise Location | App Functionality, Product Personalization | Yes | No |
| Fitness | App Functionality | Yes | No |
| Photos or Videos | App Functionality | Yes | No |
| Other User Content | App Functionality | Yes | No |
| Other Data Types | Kakao SDK 실제 동작 확인 | 실제 동작 확인 | No |

UGC가 있으므로 Age Rating의 User-Generated Content는 `Yes`다. 채팅, 광고, 인앱결제는 현재 기능 기준 `No`지만 App Store Connect의 최신 질문과 최종 바이너리를 다시 비교한다.

## 7. App Review 제출

제출 직전 확인한다.

- UGC 필터·신고·차단이 서버와 앱에서 실제 동작함
- 지원 연락처와 신고 처리 정책이 공개되어 있음
- HTTP hotspot 요청이 HTTPS로 바뀌고 전역 ATS 허용이 제거됨
- 두 계정·두 실제 기기에서 같이줍기 시작·전체 종료·각자 제출이 통과함
- 쓰레기 제보에서 사진과 현재 정밀 위치 전송 동의가 카메라보다 먼저 표시됨
- 일반 플로깅 인증 사진은 쓰레기 분석으로 자동 전송되지 않음
- 홈 → 우측 상단 마이페이지 → 우측 상단 계정 메뉴 → 회원탈퇴 경로가 동작함
- 계정 삭제의 서버·소셜 연결·스토리지 범위가 개인정보 처리방침과 일치함
- Review Notes의 모든 `[PLACEHOLDER]`가 실제 값으로 교체됨

실제 버튼 순서는 다음과 같다.

1. 버전 화면에서 `Add for Review`
2. 제출 목록에서 Version과 Build 재확인
3. `Submit for Review`
4. 상태가 `Waiting for Review`인지 확인

`Add for Review`만 누르면 제출이 완료되지 않는다. [Apple 심사 제출 절차](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)

승인 후 `Pending Developer Release` 상태에서 서버와 로그인 상태를 확인하고 `Release This Version`을 누른다. 이번 업데이트는 수동 출시 후 문제 여부를 확인하거나, 운영 계획에 따라 App Store의 단계적 출시를 선택한다.

## 8. 거절·긴급 수정 대응

- 메타데이터만 거절: 설명·스크린샷·심사 정보를 수정하고 같은 Build를 재제출할 수 있다.
- 바이너리 거절: Build 번호를 올려 새 IPA를 업로드하고 Version 화면에서 Build를 교체한다.
- JS/asset 결함: 심사 가이드와 EAS Update 허용 범위 안에서 Preview → Staging → Production 순으로 수정한다.
- 네이티브 결함: 앱 Version을 올려 새 바이너리 심사를 진행한다.
- 로그인 실패: 심사용 계정 잠금, OTP/CAPTCHA, 서버 상태를 확인하고 Sign-In Information을 갱신한다.

Apple 답변에는 새 Build, 정확한 재현 단계와 기대 결과만 짧고 검증 가능하게 적는다.

## 9. 제출 직전 체크리스트

### 자동·빌드

- [ ] `npm ci`, `npm run qa`, `expo install --check`, iOS export 통과
- [ ] 앱과 Extension의 Version/Build 일치
- [ ] 로컬 IPA 생성 및 Extension 포함 확인
- [ ] TestFlight에서 동일 Build 설치
- [ ] Preview/Staging/Production 채널이 의도한 runtime에 연결됨

### 앱·운영

- [ ] 서버측 UGC 필터·신고·차단·운영 연락처 완료
- [ ] HTTPS/ATS 보완 완료
- [ ] 두 계정·두 실기기 전체 QA 완료
- [ ] 계정 삭제 범위와 소셜 연결 해제 확인
- [ ] 개인정보 처리방침·지원 URL이 로그인 없이 열리고 실제 동작과 일치

### 스토어

- [ ] 다음 미사용 Version/Build 선택
- [ ] 6.9인치 RGB·무알파 스크린샷 교체
- [ ] 저작권 권리자, 심사 연락처, 심사용 계정 입력
- [ ] App Privacy와 Age Rating Publish
- [ ] Review Notes placeholder 모두 교체
- [ ] `Add for Review` 후 `Submit for Review`까지 실행

개인정보, UGC, 계정 삭제, 심사 접근성 항목 중 하나라도 확인되지 않았다면 제출을 미룬다.
