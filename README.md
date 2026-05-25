# tumblr-theme-preview ✦

> Zero-config local live preview & debugging suite for Tumblr custom themes.
> 텀블러 커스텀 테마 개발자를 위한 무설정 로컬 라이브 프리뷰 및 디버깅 툴킷.

이제 복잡한 브라우저 확장 프로그램(Resource Override 등) 설정이나 Content Security Policy(CSP) 경고와 씨름할 필요가 없습니다. `tumblr-theme-preview`를 사용하면 로컬의 테마 HTML 파일과 작업 중인 CSS, JS 파일을 자동으로 조합해 웹 브라우저 상에 완벽한 프리뷰 환경을 즉시 구축해 줍니다.

---

## ✨ Features (주요 기능)

- ⚡ **무설정 자동 탐색 (Zero-Config)**: 현재 작업 폴더 내의 `.html` 테마 파일과 `css/`, `js/` 리소스를 자동으로 찾아 즉시 개발 서버를 구동합니다.
- 🔄 **지능형 리소스 우회 매핑 (Smart Asset Replacer)**: 테마 파일 안에 기입된 원격 CDN 리소스(예: GitHub, jsDelivr 등)의 파일명이 로컬 폴더에 존재하는 실제 파일명과 매칭될 경우, 자동으로 로컬의 최신 작업본 에셋으로 우회 서빙해 줍니다.
- 🎨 **프리미엄 튜닝 대시보드 (Premium Dashboard)**: Glassmorphism 디자인으로 구축된 세련된 대시보드를 통해 뷰포트 크기(모바일/태블릿/데스크톱) 변경 및 텀블러 테마 변수 조정을 실시간으로 조작해 볼 수 있습니다.
- 📁 **다양한 목 데이터 시나리오 (Rich Mock Post Types)**: 텍스트, 이미지, 비디오, 질문 답변 등 7가지 이상의 다채로운 텀블러 포스트 형식으로 테마의 반응형 스타일과 레이아웃 완성도를 정교하게 확인합니다.
- 📝 **목 데이터 자유 커스텀 (Flexible Mock Override)**: 작업 디렉토리에 `tumblr-mock.json` 이나 `tumblr-mock.js`를 배치하면 프리뷰 데이터가 본인의 고유 포스트 및 블로그 정보로 즉각 오버라이드됩니다.

---

## 🚀 Quick Start (빠른 시작)

### 1. 전역 설치 (Global Install)
터미널을 열고 전역(또는 `npx` 연동)으로 간단하게 설치합니다.
```bash
npm install -g tumblr-theme-preview
```

### 2. 테마 프로젝트 폴더에서 실행
본인의 텀블러 테마 프로젝트 폴더로 이동한 뒤, 아래 한 줄의 명령만 입력하면 즉시 프리뷰 서버가 켜집니다!
```bash
tumblr-theme-preview
```
또는 설치 없이 `npx` 명령으로 즉각 실행할 수도 있습니다.
```bash
npx tumblr-theme-preview
```

### 3. 브라우저로 대시보드 접속
서버 구동 로그에 출력되는 주소로 접속합니다.
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ CLI Options (명령어 옵션)

명령 뒤에 다양한 인자를 전달해 포트나 에셋 경로를 수동 지정할 수 있습니다.
```bash
tumblr-theme-preview [옵션]

옵션 목록:
  -p, --port <number>     프리뷰 서버가 실행될 포트 번호 (기본값: 3000)
  -t, --theme <path>      테스트할 텀블러 테마 HTML 파일 경로 (기본값: 현재 폴더 자동 감색)
  -s, --static <path>     로컬 CSS, JS 정적 리소스 서빙 기본 디렉토리 (기본값: 현재 작업 폴더)
  -h, --help              도움말 출력
```

---

## 📝 Customizing Mock Data (목 데이터 커스터마이징)

본인의 실제 텀블러 게시글이나 개인 프로필 정보로 디자인을 미리보고 싶다면, 프로젝트 루트 경로에 `tumblr-mock.json` 파일을 아래 형식처럼 만들어 두세요. 툴이 자동으로 읽어서 기본 Mock 데이터를 교체 적용해 줍니다.

### `tumblr-mock.json` 작성 예시:
```json
{
  "blogMeta": {
    "Title": "나만의 커스텀 기술 블로그",
    "MetaDescription": "안녕하세요, 프론트엔드 개발자입니다.",
    "select:Layout Width": "960px",
    "text:Theme Version": "v1.2.0"
  },
  "posts": [
    {
      "PostId": "my-post-1",
      "Type": "text",
      "Permalink": "/post/my-post-1",
      "DayOfMonth": "25",
      "DayOfMonthSuffix": "th",
      "ShortMonth": "May",
      "Year": "2026",
      "PostAuthorName": "Developer",
      "Title": "로컬 목 데이터 연동 성공!",
      "Body": "<p>이 글은 <code>tumblr-mock.json</code>을 통해서 주입된 포스트입니다.</p>"
    }
  ]
}
```

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE details.
