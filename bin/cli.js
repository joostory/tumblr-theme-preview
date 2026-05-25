#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { startServer } = require('../lib/server');

// 도움말 출력 함수
function printHelp() {
  console.log(`
사용법: npx tumblr-theme-preview [옵션]

옵션 목록:
  -p, --port <number>     프리뷰 서버가 실행될 포트 번호 (기본값: 3000)
  -t, --theme <path>      테스트할 텀블러 테마 HTML 파일 경로 (기본값: 현재 폴더 자동 감색)
  -s, --static <path>     로컬 CSS, JS 정적 리소스 서빙 기본 디렉토리 (기본값: 현재 작업 폴더)
  -h, --help              도움말 출력
  `);
  process.exit(0);
}

// 텀블러 테마 파일 자동 스캔 함수
function autoScanThemeFile(cwd) {
  const files = fs.readdirSync(cwd);
  const htmlFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.theme'));

  for (const file of htmlFiles) {
    const filePath = path.join(cwd, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // 텀블러 고유 마크업 {block:Posts} 등이 들어있는지 스캔
      if (content.includes('{block:Posts}') || content.includes('{block:IndexPage}')) {
        return filePath;
      }
    } catch (e) {
      // 읽기 실패 시 무시하고 다음 파일 탐색
    }
  }
  return null;
}

// 아규먼트 단순 파싱
const args = process.argv.slice(2);
let port = 3000;
let themePath = null;
let staticPath = process.cwd();

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-h' || arg === '--help') {
    printHelp();
  } else if (arg === '-p' || arg === '--port') {
    const val = parseInt(args[++i]);
    if (!isNaN(val)) port = val;
  } else if (arg === '-t' || arg === '--theme') {
    themePath = args[++i];
  } else if (arg === '-s' || arg === '--static') {
    staticPath = args[++i];
  }
}

// 절대 경로 처리
if (themePath) {
  themePath = path.isAbsolute(themePath) ? themePath : path.resolve(process.cwd(), themePath);
  
  // 만약 지정된 테마 경로가 디렉토리라면, 그 안에서 테마 HTML 파일을 자동으로 탐색합니다.
  if (fs.existsSync(themePath) && fs.statSync(themePath).isDirectory()) {
    const scanned = autoScanThemeFile(themePath);
    if (scanned) {
      console.log(`[tumblr-theme-preview] 지정된 디렉토리(${path.basename(themePath)}) 내에서 테마 파일을 자동 탐색했습니다: ${path.basename(scanned)}`);
      themePath = scanned;
    } else {
      console.error(`\x1b[31m[에러] 지정된 디렉토리(${themePath}) 내에 유효한 텀블러 테마 HTML 파일(.html 또는 .theme)을 찾을 수 없습니다.\x1b[0m`);
      themePath = null;
    }
  }
} else {
  // 테마 경로 지정이 없으면 자동 스캔 작동
  const scanned = autoScanThemeFile(process.cwd());
  if (scanned) {
    themePath = scanned;
    console.log(`[tumblr-theme-preview] 텀블러 테마 파일을 자동 탐색했습니다: ${path.basename(scanned)}`);
  }
}

if (!themePath || !fs.existsSync(themePath)) {
  console.error(`\x1b[31m[에러] 테스트할 텀블러 테마 HTML 파일을 찾을 수 없습니다.\x1b[0m`);
  console.error(`현재 작업 폴더: ${process.cwd()}`);
  console.error(`\x1b[33m해결책: 폴더 내에 텀블러 테마 .html 파일을 두거나, -t [경로] 옵션을 통해 명시적으로 지정해 주세요.\x1b[0m`);
  printHelp();
  process.exit(1);
}

// staticPath 절대 경로 처리
staticPath = path.isAbsolute(staticPath) ? staticPath : path.resolve(process.cwd(), staticPath);

// 라이브 서버 기동
startServer({
  port,
  themePath,
  staticPath,
  cwd: process.cwd()
});
