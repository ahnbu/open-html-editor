# 오픈디터 (Openditor, Open HTML Editor)

> AI가 만든 슬라이드와 문서를 파워포인트처럼 바로 고치는 에디터.

AI는 슬라이드, 보고서, 랜딩 페이지 HTML을 몇 초 만에 만들어 냅니다. 하지만 오타 하나를 고치거나, 이미지를 바꾸거나, 어색한 여백을 손질하려 할 때마다 복잡한 코드를 뒤지거나 프롬프트를 처음부터 다시 써야 하는 번거로움이 있었습니다.

**오픈디터**는 이 문제를 해결합니다. AI가 만든 HTML 파일을 브라우저로 끌어다 놓기만 하면 화면을 직접 보며 글자, 이미지, 배치를 직관적으로 수정할 수 있습니다. 설치도, 회원가입도, 서버 업로드도 없습니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/ahnbu/open-html-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/ahnbu/open-html-editor/actions)
[![Deploy: Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-orange)](https://easy-html-editor.pages.dev/)
[![Dependencies: Zero](https://img.shields.io/badge/Dependencies-Zero-success.svg)]()
[![Offline: 100%](https://img.shields.io/badge/Offline-100%25-brightgreen.svg)]()

---

### [웹에서 바로 사용하기: easy-html-editor.pages.dev](https://easy-html-editor.pages.dev/)

![Openditor 시연](docs/demo.ko.gif)

---

## 서버 업로드 없이, 인터넷 없이도 100% 로컬 동작

- **무설치·무가입:** 사이트 주소를 열고 HTML 파일(또는 이미지가 포함된 폴더)을 끌어다 놓으면 약 0.16초 만에 바로 편집 화면이 뜹니다.
- **내 브라우저 안에서만 동작:** 편집기 자체는 외부로 어떤 네트워크 요청도 보내지 않습니다. 모든 파싱과 편집, 저장이 내 컴퓨터 브라우저 메모리 안에서만 처리됩니다.
- **인터넷 없이도 실행:** 서비스 워커로 캐싱되어 인터넷 연결이 끊겨도 다시 열립니다. 배포본 단일 파일(`public/index.html`, 약 370KB)을 내려받아 더블클릭해 오프라인으로 사용할 수도 있습니다.
- **원본 파일 보호:** 처음 저장 시 `원본이름_수정.html`로 새로 내려받아 기존 원본을 덮어쓰지 않습니다. 「다른 이름으로 저장」 후에는 해당 파일에 바로 덮어씁니다.

---

## 무엇을 하나요? / 무엇을 안 하나요?

| 오픈디터가 하는 것 | 의도적으로 하지 않는 것 |
|---|---|
| **AI가 만든 HTML 시각적 직접 수정:** 글자 더블클릭 수정, 글자색·크기·굵게·정렬, 글상자 추가, 개체 복제·삭제·이동·크기 조절·순서·6방향 맞춤, 이미지 변경·추가, 표 행·열 편집, 찾아 바꾸기, 실행 취소/다시 실행. | **HTML 신규 생성:** 생성 툴이 아닌 '시각적 편집·수정 툴'에만 집중합니다. |
| **슬라이드와 문서 자동 인식:** 가로 16:9 슬라이드 덱, 세로 A4 문서, 이력서, 연속 스크롤 구역을 수동 버튼 없이 자동으로 감지하여 최적의 모드로 엽니다. | **PPTX 변환 및 내보내기:** AI 산출물은 HTML이 표준입니다. 변환 과정 없이 빠르고 가볍게 HTML을 유지합니다. |
| **발표 모드 지원:** 슬라이드 모아보기, 슬라이드 복제·삭제·순서 변경, 전체화면 발표 보기(외부 모니터 감지), 발표자 창(발표자 노트·타이머·다음 슬라이드 미리보기). | **복잡한 MCP 서버 설정:** 번거로운 MCP 구성 대신 가장 가벼운 원클릭 클립보드 복사 방식을 제공합니다. |
| **코멘트 핀 및 AI 프롬프트 복사:** 고칠 자리에 코멘트 핀을 달아 저장 파일 끝에 안전하게 보존합니다. 「AI용 복사」를 누르면 덱 전체와 코멘트, 지시문이 복사되어 클로드·챗GPT에 바로 붙여넣을 수 있습니다 (200KB 초과 파일은 코멘트만 복사). | **로그인·서버 저장·분석 스크립트:** 계정, 유료 구독, 사용자 추적 스크립트, 데이터베이스가 전혀 없습니다. |
| **한국어·영어 UI:** 브라우저 기본 언어 자동 인식 및 상단 버튼을 통한 즉시 전환 지원. | **무거운 프레임워크 의존:** 의존성 없는 순수 바닐라 JS 단일 파일로 빌드됩니다. |

---

## 복잡한 수정은 AI에게 넘기기 (선택 설치 스킬)

오타나 간단한 배치는 직접 화면에서 고치고, 대대적인 내용 개편은 사용 중인 AI 에이전트에게 맡길 수 있습니다.

### 1. 기본 제공: 원클릭 AI 복사
도구 모음의 **AI용 복사**를 누르면 전체 HTML 문서와 코멘트 목록이 정돈된 프롬프트로 복사됩니다. 클로드나 챗GPT 대화창에 그대로 붙여넣으세요.

### 2. 선택 설치: 로컬 AI 스킬 (`skills/open-html-editor/`)
클로드 코드(Claude Code)나 코덱스 등을 사용하신다면 보조 스킬을 설치할 수 있습니다. *"방금 저장한 파일 코멘트 반영해 줘"*라고 말하면, 대화 중인 AI가 저장된 HTML 속 코멘트를 읽고, 자동으로 `_편집백업/`에 사본을 남긴 뒤 파일을 직접 수정해 줍니다. 별도 서버나 MCP가 필요 없습니다.

**설치 경로 (3가지 중 택 1):**
- **npx skills 명령어:**
  ```bash
  npx skills add ahnbu/open-html-editor
  ```
- **클로드 코드 플러그인:**
  ```bash
  /plugin marketplace add ahnbu/open-html-editor
  /plugin install open-html-editor@open-html-editor
  ```
- **채팅창에 프롬프트 붙여넣기:**
  > "https://github.com/ahnbu/open-html-editor/tree/main/skills/open-html-editor 를 읽고 이 스킬을 설치해 줘"

---

## 보안 및 개인정보 (한계 포함)

오픈디터는 보안 경계를 사실 그대로 투명하게 밝힙니다:

1. **편집기 자체의 무통신:** 에디터 코드는 외부로 단 1건의 네트워크 요청도 보내지 않습니다 (자동 보안 시험 통과).
2. **iframe 격리:** 편집 대상 문서는 강력한 Content Security Policy(CSP)가 적용된 iframe 안에서 열려, 문서 내부 스크립트의 `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, 폼 전송을 차단합니다.
3. **알려진 한계:** AI가 만든 HTML은 CDN 이미지나 웹폰트, 외부 라이브러리를 많이 사용하므로 이미지/폰트/스타일 로드는 허용되어 있습니다. 따라서 문서 내부 코드가 이미지 URL 파라미터 등을 통해 데이터를 전송하려는 시도는 차단되지 않습니다 (브라우저로 직접 HTML을 열 때와 동일 수준).
4. **안전 수칙:** **출처가 불분명하거나 보안이 극도로 중요한 문서를 다룰 때는 인터넷 연결을 끊고 오프라인 상태에서 편집기를 사용하세요.**

---

## 기여하기

버그 제보, 다양한 AI 산출물 렌더링 호환성 개선(문제가 발생하는 샘플 HTML 첨부 환영), 다국어 번역, 접근성 개선 기여를 환영합니다.

빌드 방법, 자동 시험 실행법, 아키텍처 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고해 주세요.

---

## 라이선스

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용할 수 있습니다.

첫 화면 움직임에 쓴 [GSAP](https://gsap.com) 3.15.1(`src/landing/vendor/gsap.min.js`)은 MIT가 아니라 GreenSock의 [Standard "No Charge" License](https://gsap.com/standard-license)를 따릅니다.
