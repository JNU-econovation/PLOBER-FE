# 플로버 1.0.1 App Store 업데이트 제출 문구

이미 배포 중인 `플로버` App 레코드에 새 버전을 추가할 때 App Store Connect에 붙여넣을 업데이트 제출 초안이다. 신규 앱 등록용 문서가 아니다. 제출 순서는 [app-store-update.md](./app-store-update.md), QA 상태는 [release-qa-report.md](./release-qa-report.md)를 따른다.

현재 앱에는 1차 텍스트 검사, 신고 메일, 기기 내 차단·공유 사진 숨김이 구현되어 있다. 그러나 서버측 텍스트·이미지 필터와 계정 단위 신고·차단 반영이 확인되지 않았으므로 이 문서는 **그대로 제출 가능한 상태가 아니다**. 서버 기능을 운영 환경에서 구현·검증한 뒤 남은 UGC placeholder를 교체한다.

## 제출 전에 교체할 값

| Placeholder | 실제 값 | 주의 |
| --- | --- | --- |
| `[RIGHTS_HOLDER]` | 앱 권리를 보유한 사람 또는 법인명 | Copyright에 입력 |
| `[REVIEW_ACCOUNT_USERNAME]` | 심사용 Kakao 계정 A | App Store Connect Sign-In Information에만 입력 |
| `[REVIEW_ACCOUNT_PASSWORD]` | 계정 A 비밀번호 | 저장소·문서·메신저에 기록하지 않음 |
| `[SECOND_ACCOUNT_USERNAME]` | 심사용 Kakao 계정 B | Review Notes에만 입력 |
| `[SECOND_ACCOUNT_PASSWORD]` | 계정 B 비밀번호 | Review Notes에만 입력 |
| `[UGC_FILTERING_DESCRIPTION]` | 서버에서 강제되는 텍스트·이미지 필터 방식 | 실제 구현만 기재 |
| `[ACCOUNT_DELETION_SERVER_BEHAVIOR]` | 삭제·비식별·법정 보관·소셜 연결 해제의 실제 동작 | 백엔드·정책 확인 후 기재 |
| `[DEMO_VIDEO_URL]` | 선택: 야외·두 기기 흐름 비공개 영상 | 없으면 Review Notes의 해당 문장 삭제 |

실제 계정 비밀번호, Apple 키, 토큰은 Git에 저장하지 않는다.

## 기본 정보

| 필드 | 입력값 |
| --- | --- |
| App Name | `플로버` |
| Subtitle | `함께 걷고 줍는 플로깅 기록 앱` |
| Version | `1.0.1` 또는 App Store Connect의 다음 미사용 버전 |
| Build | App Store Connect의 다음 미사용 번호; 현재 후보 `18` |
| Primary Category | `Health & Fitness` |
| Secondary Category | 비움 |
| Price | 무료, 기존 설정 유지 |
| Copyright | `2026 [RIGHTS_HOLDER]` |
| Support URL | `https://separate-jacket-0a0.notion.site/36ddf9b47f808025b92bee9aa5b4e226?pvs=73` 후보 |
| Privacy Policy URL | `https://separate-jacket-0a0.notion.site/36ddf9b47f80807aa8b2ce118dc0b911?source=copy_link` 후보 |
| Marketing URL | 비움 |
| Release Option | `Manually release this version` |

두 URL은 최종 운영 내용을 반영하고 로그인 없이 열리는지 다시 확인한다.

## Promotional Text

```text
혼자서도, 크루와 함께도 플로깅을 즐겨보세요. 자유 플로깅과 AI 추천 경로, 이동·걸음 기록, 주변 시설, 인증 사진과 같이줍기 기록까지 플로버에서 한 번에 관리할 수 있어요.
```

## Keywords

쉼표 뒤 공백 없이 입력한다.

```text
플로깅,같이줍깅,쓰레기줍기,걷기운동,산책길,크루활동,만보기,경로추천
```

## Description

```text
걷는 시간이 깨끗한 동네를 만드는 시간이 되도록.
플로버는 혼자 또는 크루와 함께 플로깅하고, 이동 경로와 활동을 기록하는 앱입니다.

혼자 플로깅하기
• 자유 모드로 원하는 길을 걸으며 플로깅할 수 있습니다.
• 원하는 활동 시간에 맞는 AI 추천 경로를 선택할 수 있습니다.
• 지도에서 현재 위치와 이동 경로를 확인할 수 있습니다.
• 플로깅 시간, 거리, 걸음 수와 칼로리를 기록합니다.
• 주변 쓰레기통과 화장실을 지도에서 확인할 수 있습니다.
• 선택한 인증 사진을 활동 기록에 남길 수 있습니다.
• 홈의 쓰레기 제보에서 사진과 현재 정밀 위치 전송에 동의한 경우에만 쓰레기 사진 분석을 요청합니다.

크루와 같이줍기
• 새로운 크루를 만들거나 6자리 초대번호로 가입할 수 있습니다.
• 크루원 프로필과 크루의 누적 플로깅 통계를 확인할 수 있습니다.
• 크루장이 참여자를 모집하고 같이줍기를 시작할 수 있습니다.
• 크루장이 전체 종료를 선택하면 참여 중인 모든 크루원의 활동이 함께 종료됩니다.
• 각 참여자가 자신의 경로, 활동 기록과 선택한 사진을 제출하면 함께한 기록에서 결과를 확인할 수 있습니다.
• 같이줍기 기록과 인증 사진을 사진 앱에 저장하거나 공유할 수 있습니다.

기록 돌아보기
• 완료한 플로깅의 경로, 시간, 거리, 걸음 수와 인증 사진을 확인할 수 있습니다.
• 주간·월간 활동과 누적 통계로 플로깅 기록을 돌아볼 수 있습니다.
• 완성된 리포트 이미지를 사진 앱에 저장하거나 공유할 수 있습니다.

플로버는 현재 위치 표시와 플로깅 경로 기록을 위해 위치 권한을, 걸음 수 측정을 위해 동작 및 피트니스 권한을 사용할 수 있습니다. 플로깅 중 백그라운드 위치를 허용하면 화면이 꺼져 있거나 다른 앱을 사용하는 동안에도 이동 경로를 계속 기록합니다. 카메라는 선택한 인증 사진과 쓰레기 제보 촬영에, 사진 접근은 프로필 이미지 선택과 리포트 저장에 사용합니다.

플로버와 함께 일상 속 걸음을 더 깨끗한 동네를 만드는 활동으로 이어가 보세요.
```

## What’s New in This Version

```text
크루와 함께하는 같이줍기 기능이 새로 추가되었습니다.

• 크루 생성 및 6자리 초대번호 가입
• 모집부터 함께 시작·종료, 개인 기록 제출까지 연결
• 크루별 누적 통계와 함께한 기록 확인
• 같이줍기 결과와 인증 사진 저장 및 공유
• 개인 플로깅 기록과 리포트 화면 개선
```

## App Review Information

### Sign-In Information

App Store Connect의 전용 필드에만 입력한다.

```text
Username: [REVIEW_ACCOUNT_USERNAME]
Password: [REVIEW_ACCOUNT_PASSWORD]
```

계정은 심사 기간 내내 유효해야 하며 OTP, CAPTCHA, 전화 인증 없이 새 iPhone에서 로그인되어야 한다.

### Review Notes

아래 영문은 실제 앱 동작에 맞춘 초안이다. UGC와 삭제 처리 placeholder를 운영 환경에서 확인하기 전에는 제출하지 않는다. `[DEMO_VIDEO_URL]`이 없으면 마지막 영상 문장을 삭제한다.

```text
Version 1.0.1 adds Crew and Group Plogging features.

SIGN-IN
The app requires sign-in. Tap the yellow "카카오로 로그인" (Sign in with Kakao) button and use the credentials in Sign-In Information. The account remains active throughout review and does not require OTP, CAPTCHA, or phone verification.

SECOND REVIEW ACCOUNT
Testing a two-person group session requires a second iPhone and account.
Username: [SECOND_ACCOUNT_USERNAME]
Password: [SECOND_ACCOUNT_PASSWORD]

INDIVIDUAL PLOGGING
1. On Home, select "자유모드" (Free Mode) or "AI 경로추천" (AI Recommended Route).
2. In AI mode, select a duration and a returned route.
3. Start plogging. The activity screen records route, elapsed time, distance, steps, and optional authentication photos.
4. End the activity, review the report, and save it to History.

CREW AND GROUP PLOGGING
1. Open the Crew tab.
2. Open the preconfigured review crew, or tap "크루 추가하기" (Add Crew). A six-digit invitation number is displayed.
3. The leader opens recruitment and the second account joins from the same crew.
4. The leader starts and later ends the group activity for everyone.
5. Each participant submits their own route, metrics, and optional authentication photos.
6. Open the crew's group records to view, save, or share the result.

USER-GENERATED CONTENT SAFETY
Crew names, nicknames, profile images, and optional activity photos are visible to members of the same crew. The app has no public feed, comments, likes, direct messaging, advertising, in-app purchases, or paid content.
Client filtering rejects a baseline list of clearly abusive expressions when creating a crew or changing a nickname. Server-side text and image enforcement: [UGC_FILTERING_DESCRIPTION]
Report path: Crew tab → open a crew → open Members and select a member (or tap a participant/photo in a group record) → "신고하기" (Report). The app opens a prefilled report email where the reviewer can add the reason and screen/time.
Block-user path: On the same member profile, tap "차단하기" (Block). The app masks that user's name/profile and hides their shared photos on this device. Tap "차단 해제" (Unblock) to reverse it. Server/account-wide enforcement must be verified before submission.
Moderation/support contact: lewis177777@gmail.com

TRASH-PHOTO ANALYSIS AND PERMISSIONS
Trash reporting is optional. From Home, tap "쓰레기 제보" (Report Trash). Before the camera opens, the app explains that the captured photo and the user's current precise location will be sent to the Plover server to analyze whether the photo contains trash. Transfer occurs only after the user taps "동의하고 촬영" (Agree and Take Photo). The user can tap "동의하지 않음" (Do Not Agree) and continue using all other features. Ordinary authentication photos taken during individual or crew activities are not automatically sent for trash analysis.
- Location shows the current position and records the route. Background location is used only during an active plogging session after permission is granted.
- Motion & Fitness measures steps during plogging.
- Camera captures optional authentication photos and trash reports.
- Photos selects a profile image and saves report images.

ACCOUNT DELETION
Path: Home → upper-right "마이페이지" (My Page) icon → upper-right account-menu icon → "회원탈퇴" (Delete Account).
Before confirmation, the app states that deletion requests removal of the account, profile, and linked individual plogging records and that the action cannot be undone. It also states that information required by law or needed to preserve shared crew records may be separately retained or de-identified.
Verified server, storage, and social-login behavior: [ACCOUNT_DELETION_SERVER_BEHAVIOR]

Outdoor movement and two-device behavior are demonstrated here for review convenience: [DEMO_VIDEO_URL]

All backend APIs, image storage, route recommendation, and trash-analysis services remain available throughout review.
```

## TestFlight – What to Test

```text
플로버 1.0.1의 크루·같이줍기 기능과 개인 플로깅 안정성을 확인해주세요.

1. Kakao/Apple 로그인, 로그아웃과 재로그인
2. 자유·AI 추천 플로깅 시작, 일시정지, 재개, 종료, 저장
3. 백그라운드·화면 꺼짐·강제 종료 후 기록 복구
4. 카메라·사진·위치·동작 권한 허용 및 거부 처리
5. 쓰레기 제보 동의 거부 시 전송되지 않고 다른 기능을 계속 사용할 수 있는지
6. 크루 생성, 6자리 가입, 모집, 크루장 시작
7. 크루장이 전체 종료했을 때 모든 참여자의 종료 처리
8. 참여자별 기록·사진 제출과 크루 기록 조회
9. 리포트 저장·공유와 기록·통계 갱신
10. UGC 필터·신고·차단, 지원 문의와 회원 탈퇴

오류가 발생하면 기기 모델, iOS 버전, 계정 역할, 재현 순서와 화면 녹화를 함께 보내주세요.
```

## External TestFlight를 사용할 때

### Beta App Description

```text
플로버는 혼자 또는 크루와 함께 플로깅하고 이동 경로, 시간, 거리, 걸음 수와 사진을 기록하는 앱입니다. 이번 베타에서는 크루 생성·가입과 같이줍기 전체 흐름을 중점적으로 확인합니다.
```

### Feedback Email

```text
lewis177777@gmail.com
```

정식 Review Notes와 같은 로그인·재현 순서를 사용하되 실제 비밀번호는 TestFlight의 Beta App Review Information에만 넣는다.

## Privacy Label 입력 초안

백엔드, 객체 저장소, AI 처리자, 서버 로그와 모든 SDK의 실제 수집·보관·목적을 확인한 뒤 Publish한다.

| 데이터 유형 | 목적 | 연결 | 추적 |
| --- | --- | --- | --- |
| Email Address | App Functionality | Yes | No |
| User ID | App Functionality | Yes | No |
| Precise Location | App Functionality, Product Personalization | Yes | No |
| Fitness | App Functionality | Yes | No |
| Photos or Videos | App Functionality | Yes | No |
| Other User Content | App Functionality | Yes | No |
| Other Data Types | Kakao SDK 실제 동작 확인 | 실제 동작 확인 | No |

## Age Rating 초안

```text
Health or Wellness Topics: Yes
User-Generated Content: Yes
Messaging and Chat: No
Social Media Capabilities: No
Advertising: No
Medical or Treatment Information: None
Unrestricted Web Access: No
Made for Kids: No
```

App Store Connect에 표시되는 최신 질문과 최종 기능을 기준으로 확정한다.

## Export Compliance 초안

현재 바이너리가 운영체제 HTTPS/TLS만 사용하고 자체 또는 비면제 암호화를 구현하지 않는다는 전제다.

```text
ITSAppUsesNonExemptEncryption: NO
Non-exempt or proprietary encryption: No
```

자체 암호화나 새 보안 SDK를 추가했다면 다시 판정한다.
