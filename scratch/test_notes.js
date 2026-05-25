const { compile } = require('../lib/parser');
const { getMergedMockData } = require('../lib/mock_data');
const fs = require('fs');
const path = require('path');

// sample-theme.html 템플릿 읽기
const themeHTML = fs.readFileSync(path.join(__dirname, '../sample-theme.html'), 'utf-8');

// 목 데이터 획득
const { blogMeta, posts, pages } = getMergedMockData(path.join(__dirname, '..'));

// 1. 상세 페이지(permalink)용 컨텍스트
const permalinkContext = {
  viewType: 'permalink',
  blog: { ...blogMeta },
  posts: [posts[0]], // 첫 번째 포스트만 (25일 포스트)
  pages: pages,
  currentSearchQuery: '',
  currentTag: ''
};

// 렌더링 실행
const permalinkResult = compile(themeHTML, permalinkContext);

console.log("=== PERMALINK PAGE RENDER TEST ===");
if (permalinkResult.includes('class="notes"') && permalinkResult.includes('dbwhddn78') && permalinkResult.includes('joostory')) {
  console.log("✅ Success: PostNotes rendered in Permalink page!");
} else {
  console.error("❌ Failure: PostNotes missing or malformed in Permalink page!");
}

if (permalinkResult.includes('노츠 (2 notes)')) {
  console.log("✅ Success: NoteCountWithLabel rendered correctly!");
} else {
  console.error("❌ Failure: NoteCountWithLabel is missing or incorrect!");
}

// 2. 날짜/시간 변수 정밀 검증 (한 자리 수 일/월이 0으로 패딩되는지 테스트)
const singleDigitPost = {
  PostId: "post-test-date",
  Type: "text",
  Year: "2026",
  ShortMonth: "May", // 5월
  DayOfMonth: "9",   // 9일 (한 자리 수)
  PostAuthorName: "Tester",
  Title: "Date Test Post",
  Body: "<p>Testing date formatting.</p>",
  Tags: []
};

const dateTestContext = {
  viewType: 'permalink',
  blog: { ...blogMeta },
  posts: [singleDigitPost],
  pages: pages,
  currentSearchQuery: '',
  currentTag: ''
};

const dateTestResult = compile(themeHTML, dateTestContext);

console.log("\n=== CUSTOM DATE VARIABLES RENDER TEST ===");
// DayOfMonthWithZero: '09'이어야 함
if (dateTestResult.includes('DayOfMonthWithZero: <strong style="color: #c084fc;">09</strong>')) {
  console.log("✅ Success: DayOfMonthWithZero zero-padded correctly ('09')!");
} else {
  console.error("❌ Failure: DayOfMonthWithZero failed zero-padding!");
  const match = dateTestResult.match(/DayOfMonthWithZero: <strong[^>]*>([^<]*)<\/strong>/);
  console.log("Found DayOfMonthWithZero value:", match ? match[1] : "Not found");
}

// MonthNumberWithZero: '05'이어야 함
if (dateTestResult.includes('MonthNumberWithZero: <strong style="color: #c084fc;">05</strong>')) {
  console.log("✅ Success: MonthNumberWithZero zero-padded correctly ('05')!");
} else {
  console.error("❌ Failure: MonthNumberWithZero failed zero-padding!");
  const match = dateTestResult.match(/MonthNumberWithZero: <strong[^>]*>([^<]*)<\/strong>/);
  console.log("Found MonthNumberWithZero value:", match ? match[1] : "Not found");
}

// 요일 검증: 2026년 5월 9일은 토요일(Saturday, Sat)
if (dateTestResult.includes('DayOfWeek: <strong style="color: #c084fc;">Saturday</strong>') && 
    dateTestResult.includes('DayOfWeekShort: <strong style="color: #c084fc;">Sat</strong>')) {
  console.log("✅ Success: DayOfWeek & DayOfWeekShort calculated correctly ('Saturday', 'Sat')!");
} else {
  console.error("❌ Failure: DayOfWeek calculations failed!");
}

// 3. 인덱스 페이지(index)용 컨텍스트
const indexContext = {
  viewType: 'index',
  blog: { ...blogMeta },
  posts: posts,
  pages: pages,
  currentSearchQuery: '',
  currentTag: ''
};

// 렌더링 실행
const indexResult = compile(themeHTML, indexContext);

console.log("\n=== INDEX PAGE RENDER TEST ===");
if (!indexResult.includes('class="notes"') && !indexResult.includes('dbwhddn78')) {
  console.log("✅ Success: PostNotes correctly hidden in Index page!");
} else {
  console.error("❌ Failure: PostNotes should NOT render in Index page, but found!");
}
