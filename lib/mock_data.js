// Tumblr theme live preview mock data engine
const fs = require('fs');
const path = require('path');

const defaultBlogMeta = {
  Title: "Tumblr Theme DevSuite",
  MetaDescription: "최신 웹 표준 기술로 빌드된 고품질 텀블러 테마 실시간 프리뷰어 화면입니다.",
  Favicon: "https://secure.assets.tumblr.com/images/default_avatar/cube_open_128.png",
  "PortraitURL-128": "https://secure.assets.tumblr.com/images/default_avatar/cube_open_128.png",
  "PortraitURL-64": "https://secure.assets.tumblr.com/images/default_avatar/cube_open_64.png",
  RSS: "/rss",
  "text:Theme Version": "v1.0.0",
  "text:Disqus Shortname": "joostory-local",
  "text:Google Analytics ID": "UA-XXXXX-Y",
  "text:Google Adsense Publisher ID": "pub-123456789",
  "text:Google Adsense Slot ID": "987654321",
  "text:Google Adsense Page Level ID": "ca-pub-123456789",
  "text:Facebook URL": "https://facebook.com",
  "if:Endless Scroll": "1",
  "select:Layout Width": "780px",
  "select:Syntax Highlight theme": "vs2015",
  "CustomCSS": ""
};

const defaultPosts = [
  {
    PostId: "post-1",
    Type: "text",
    Permalink: "/post/1",
    DayOfMonth: "25",
    DayOfMonthSuffix: "th",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    Title: "Modern CSS와 HTML로 구현하는 프리미엄 테마 프리뷰어 개발기",
    Body: `
      <p>텀블러 테마를 로컬에서 아주 쉽고 쾌적하게 테스트할 수 있는 <b>tumblr-theme-preview</b> 패키지가 완성되었습니다!</p>
      <p>기존에는 테마의 변경 사항을 확인하기 위해 실서비스에 적용하거나 브라우저 확장 프로그램(Resource Override)을 사용해야 하는 번거로움이 있었습니다.</p>
      <h3>주요 특징</h3>
      <ul>
        <li>Node.js CLI 기반 무설정 프리뷰 서버 가동</li>
        <li>지능형 CDN 에셋 대체 맵핑 엔진 탑재</li>
        <li>아름다운 Glassmorphism 프리뷰 대시보드 조작 패널</li>
      </ul>
      <p>아래와 같이 코드 하이라이트 기능도 매끄럽게 지원합니다.</p>
      <pre><code class="javascript">const { compile } = require('./parser');
const rendered = compile(themeTemplate, mockContext);
console.log('Tumblr Live Preview Ready!');</code></pre>
    `,
    NPF: JSON.stringify({
      content: [
        { type: "text", text: "텀블러 테마를 로컬에서 아주 쉽고 쾌적하게 테스트할 수 있는 tumblr-theme-preview 패키지가 완성되었습니다!" }
      ]
    }),
    Tags: [
      { Tag: "css", TagURL: "/tagged/css" },
      { Tag: "javascript", TagURL: "/tagged/javascript" },
      { Tag: "tumblr", TagURL: "/tagged/tumblr" }
    ]
  },
  {
    PostId: "post-2",
    Type: "photo",
    Permalink: "/post/2",
    DayOfMonth: "24",
    DayOfMonthSuffix: "th",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    LinkOpenTag: '<a href="https://unsplash.com" target="_blank">',
    LinkCloseTag: '</a>',
    "PhotoURL-500": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    PhotoAlt: "아름다운 해변과 모래사장",
    Caption: "<p>Unsplash 고화질 비주얼 해변 풍경 사진입니다. 테마 레이아웃이 이미지와 얼마나 어울리는지 확인하세요.</p>",
    Tags: [
      { Tag: "photo", TagURL: "/tagged/photo" },
      { Tag: "travel", TagURL: "/tagged/travel" }
    ]
  },
  {
    PostId: "post-3",
    Type: "link",
    Permalink: "/post/3",
    DayOfMonth: "23",
    DayOfMonthSuffix: "rd",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    URL: "https://developer.mozilla.org/en-US/docs/Web/CSS",
    Target: 'target="_blank"',
    Name: "MDN Web Docs - CSS: Cascading Style Sheets",
    Excerpt: "Cascading Style Sheets (CSS) is a stylesheet language used to describe the presentation of a document written in HTML.",
    Host: "developer.mozilla.org",
    Description: "<p>최신 CSS 속성을 공부하고 테마에 반영할 수 있는 최고의 문서 사이트입니다.</p>",
    Tags: [
      { Tag: "css", TagURL: "/tagged/css" },
      { Tag: "reference", TagURL: "/tagged/reference" }
    ]
  },
  {
    PostId: "post-4",
    Type: "quote",
    Permalink: "/post/4",
    DayOfMonth: "22",
    DayOfMonthSuffix: "nd",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    Quote: "Simplicity is the ultimate sophistication.",
    Source: "Leonardo da Vinci",
    Tags: [
      { Tag: "quote", TagURL: "/tagged/quote" }
    ]
  },
  {
    PostId: "post-5",
    Type: "chat",
    Permalink: "/post/5",
    DayOfMonth: "20",
    DayOfMonthSuffix: "th",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    Title: "새로운 테마 개발에 관한 대화",
    Lines: [
      { Label: "디자이너:", Line: "새 테마의 전체적인 룩앤필은 다크 모드를 지원하는 글래스모피즘(Glassmorphism) 스타일로 가죠!" },
      { Label: "개발자:", Line: "정말 멋지겠네요. Vanilla CSS 변수와 백드롭 필터를 활용하면 브라우저 부하 없이 미려하게 표현할 수 있습니다." }
    ],
    Tags: [
      { Tag: "chat", TagURL: "/tagged/chat" }
    ]
  },
  {
    PostId: "post-6",
    Type: "video",
    Permalink: "/post/6",
    DayOfMonth: "18",
    DayOfMonthSuffix: "th",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    "Video-500": `
      <div style="position:relative;padding-top:56.25%;">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen 
                style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;">
        </iframe>
      </div>
    `,
    Caption: "<p>반응형 화면에서 비디오가 16:9 비율을 유지하며 수려하게 채워지는지 확인합니다.</p>",
    Tags: [
      { Tag: "video", TagURL: "/tagged/video" }
    ]
  },
  {
    PostId: "post-7",
    Type: "answer",
    Permalink: "/post/7",
    DayOfMonth: "15",
    DayOfMonthSuffix: "th",
    ShortMonth: "May",
    Year: "2026",
    PostAuthorName: "Joo",
    Asker: "비공개 디자이너",
    Question: "로컬 렌더러는 텀블러 API 연동 없이도 무조건 빠르게 뜨나요?",
    Answer: "<p>네! 완전히 오프라인 상태에서도 동작하는 독립적인 Node.js Express 및 Mock Data 시스템이기 때문에 로딩 속도가 극도로 빠릅니다.</p>",
    Tags: [
      { Tag: "qna", TagURL: "/tagged/qna" }
    ]
  }
];

const defaultPages = [
  { Label: "소개 (About)", URL: "/post/1" },
  { Label: "포트폴리오", URL: "/tagged/travel" }
];

// 로컬 경로 내 사용자 정의 mock data 병합 반환 함수
function getMergedMockData(staticPath) {
  let blogMeta = { ...defaultBlogMeta };
  let posts = [...defaultPosts];
  let pages = [...defaultPages];

  const jsonMockPath = path.join(staticPath, 'tumblr-mock.json');
  const jsMockPath = path.join(staticPath, 'tumblr-mock.js');

  let userMock = null;

  try {
    if (fs.existsSync(jsMockPath)) {
      // 로컬 js mock 파일이 존재하는 경우 동적 require
      delete require.cache[require.resolve(jsMockPath)]; // 캐시 방지
      userMock = require(jsMockPath);
      console.log(`[tumblr-theme-preview] 로컬 자바스크립트 목 데이터(tumblr-mock.js)를 동적 적용합니다.`);
    } else if (fs.existsSync(jsonMockPath)) {
      // 로컬 json mock 파일이 존재하는 경우 읽기
      const raw = fs.readFileSync(jsonMockPath, 'utf-8');
      userMock = JSON.parse(raw);
      console.log(`[tumblr-theme-preview] 로컬 JSON 목 데이터(tumblr-mock.json)를 동적 적용합니다.`);
    }
  } catch (err) {
    console.error(`\x1b[31m[경고] 사용자 정의 목 데이터 로딩 실패. 기본값을 사용합니다. 에러: ${err.message}\x1b[0m`);
  }

  if (userMock) {
    if (userMock.blogMeta) {
      blogMeta = { ...blogMeta, ...userMock.blogMeta };
    }
    if (userMock.posts && Array.isArray(userMock.posts)) {
      posts = userMock.posts;
    }
    if (userMock.pages && Array.isArray(userMock.pages)) {
      pages = userMock.pages;
    }
  }

  return {
    blogMeta,
    posts,
    pages
  };
}

module.exports = {
  getMergedMockData
};
