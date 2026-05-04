# Project: Smart Plogging (Name TBD)

## 🌿 Project Overview

쓰레기 위치 데이터와 AI를 결합하여 효율적인 플로깅(Plogging) 경로를 추천하는 크로스 플랫폼 모바일 앱입니다. 사용자의 가용 시간에 맞춘 최적의 환경 정화 경로를 제공하는 것을 목표로 합니다.

## 🛠 Tech Stack

- Framework: Flutter (Dart)
- Map SDK: Naver Map SDK (Proposed)
- Backend: Python (FastAPI/Django) - RAG & Path Optimization logic
- Design: Clean & Minimal UI (Main color: #449DDD)

## 🗺 Core Features (UI Based)

1. AI 경로 추천 모드
    - 사용자가 설정한 시간(예: 22분)에 맞춰 쓰레기 밀집 지역을 포함한 왕복 경로 생성.
    - 시간 우선 / 큰길 우선 등 다중 경로 옵션 제공.

2. 자유 모드
    - 히트맵(Heatmap)을 통해 쓰레기 발생률이 높은 지역 시각화.
    - 경로 제한 없이 사용자가 자유롭게 플로깅 수행.

3. 쓰레기 제보
    - 카메라 기능을 활용한 실시간 쓰레기 위치 데이터 수집 및 업데이트.

## 📁 Key Directories & Architecture

- lib/screens/: 지도 화면(AI 추천, 자유 모드), 마이페이지, 통계 화면
- lib/widgets/: 커스텀 버튼, 하단 내비게이션 바, 경로 정보 카드
- lib/services/: 지도 API 연동, 위치 권한 관리, 서버 통신

## 📜 Development Rules

- Naming: 클래스명은 PascalCase, 변수 및 함수명은 camelCase 사용.
- UI: 메인 컬러 `#449DDD`를 엄격히 준수. (배경, 포인트, 주요 버튼 등 베이스 톤)
- State Management: Provider 또는 Riverpod 사용 (논의 필요).
- Communication: 모든 API 요청은 services/ 폴더 내에서 관리.
- Git: 커밋 메시지는 한글 사용 권장 (예: [Feat] AI 경로 추천 카드 UI 구현).

## 🔁 Code Change Workflow

코드 수정 요청을 받으면 아래 순서를 반드시 따른다:

1. **이슈 내용 제안**: 작업 시작 전, GitHub Issue에 등록할 제목/본문(배경, 작업 항목, 완료 기준)을 한글로 먼저 제시한다.
2. **브랜치 전략 안내**: 어떤 브랜치(`feat/...`, `fix/...`, `refactor/...` 등)에서, 어떤 베이스 브랜치(`main`)로부터 작업해야 하는지 안내한다. 브랜치는 사용자가 직접 생성/체크아웃한다.
3. **개발 수행 대기 → 실행**: 사용자가 브랜치 변경을 마쳤다고 알리면, 그 뒤에 실제 코드 수정을 진행한다.
4. **커밋 메시지 + PR 본문 작성**: 작업이 끝나면 Conventional Commits 형식의 커밋 메시지(한글 설명)와 PR 본문(요약 / 변경 사항 / 테스트 방법)을 함께 제시한다.

🚀 Recent Focus

- Naver Map SDK 초기 설정 및 현재 위치 마커 표시.
- 하단 모달 시트(AI 추천 경로 선택창) UI 고도화.