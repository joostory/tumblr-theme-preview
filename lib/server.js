// Tumblr Theme Live Preview Server (Universal Version)
const express = require('express');
const fs = require('fs');
const path = require('path');
const { compile } = require('./parser');
const { getMergedMockData } = require('./mock_data');

// 테마 HTML 문자열에서 텀블러 커스텀 설정 메타 변수를 추출하는 스마트 헬퍼
function extractThemeVariables(themeHTML) {
  const variables = {};
  const metaRegex = /<meta\s+([^>]*)\/?>/gi;
  let match;

  while ((match = metaRegex.exec(themeHTML)) !== null) {
    const attrsStr = match[1];
    
    const nameMatch = attrsStr.match(/name=["']([^"']+)["']/i);
    const contentMatch = attrsStr.match(/content=["']([^"']*)["']/i);
    const titleMatch = attrsStr.match(/title=["']([^"']*)["']/i);

    if (nameMatch) {
      const fullName = nameMatch[1];
      const content = contentMatch ? contentMatch[1] : '';
      const title = titleMatch ? titleMatch[1] : '';

      const parts = fullName.split(':');
      if (parts.length >= 2) {
        const type = parts[0].toLowerCase();
        const varName = parts.slice(1).join(':');

        const validTypes = ['if', 'text', 'color', 'font', 'select', 'image'];
        if (validTypes.includes(type)) {
          const key = fullName;

          if (type === 'select') {
            if (!variables[key]) {
              variables[key] = {
                type: 'select',
                name: varName,
                key: key,
                options: [],
                default: content
              };
            }
            variables[key].options.push({
              value: content,
              title: title || content
            });
          } else {
            variables[key] = {
              type: type,
              name: varName,
              key: key,
              default: content
            };
          }
        }
      }
    }
  }

  return Object.values(variables);
}

function startServer(config) {
  const app = express();
  const PORT = config.port;

  // 1. 동적 로컬 정적 에셋 서빙 매핑
  app.use(express.static(config.staticPath));
  app.use('/css', express.static(path.join(config.staticPath, 'css')));
  app.use('/js', express.static(path.join(config.staticPath, 'js')));

  // 2. 지능형 CDN -> 로컬 에셋 치환 교체기
  function applySmartAssetReplacements(html) {
    // href="..." 또는 src="..." 안의 http/https 원격 스타일시트 및 스크립트 경로 스캔
    const assetRegex = /(href|src)=["'](https?:\/\/[^"']+\.(css|js))["']/g;

    return html.replace(assetRegex, (match, attr, url, ext) => {
      const filename = path.basename(url);
      
      // 로컬 디렉토리 내에 동일한 파일명의 파일이 존재하는지 스마트 체크
      const localSubdir = ext === 'css' ? 'css' : 'js';
      const checkPath1 = path.join(config.staticPath, localSubdir, filename);
      const checkPath2 = path.join(config.staticPath, filename);

      if (fs.existsSync(checkPath1)) {
        console.log(`[tumblr-theme-preview] 웹 에셋 [${filename}] 을 로컬 [./${localSubdir}/${filename}] 로 실시간 우회 서빙합니다.`);
        return `${attr}="/${localSubdir}/${filename}"`;
      } else if (fs.existsSync(checkPath2)) {
        console.log(`[tumblr-theme-preview] 웹 에셋 [${filename}] 을 로컬 [./${filename}] 로 실시간 우회 서빙합니다.`);
        return `${attr}="/${filename}"`;
      }

      // 로컬에 파일이 없으면 기존 원격 CDN 링크를 그대로 유지
      return match;
    });
  }

  // 3. 테마 파일로부터 동적 커스텀 변수 목록 추출 API
  app.get('/api/theme-variables', (req, res) => {
    if (!fs.existsSync(config.themePath)) {
      return res.status(404).json({ error: '테마 파일을 찾을 수 없습니다.' });
    }
    try {
      const themeHTML = fs.readFileSync(config.themePath, 'utf-8');
      const variables = extractThemeVariables(themeHTML);
      res.json({ variables });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. 프리뷰어 제어 대시보드 UI 서빙
  app.get('/', (req, res) => {
    // 패키지 내부에 탑재된 dashboard.html 서빙
    const dashboardPath = path.join(__dirname, '../dashboard.html');
    if (fs.existsSync(dashboardPath)) {
      res.sendFile(dashboardPath);
    } else {
      res.status(404).send('Preview Dashboard UI 파일이 패키지 내에 존재하지 않습니다.');
    }
  });

  // 4. 테마 라이브 컴파일 및 렌더링 엔드포인트
  app.get('/render', (req, res) => {
    if (!fs.existsSync(config.themePath)) {
      return res.status(404).send(`<h3>테마 파일을 읽을 수 없습니다: ${config.themePath}</h3>`);
    }

    try {
      let themeHTML = fs.readFileSync(config.themePath, 'utf-8');

      // 로컬 리소스 지능형 실시간 맵핑 우회 적용
      themeHTML = applySmartAssetReplacements(themeHTML);

      // 사용자 로컬 경로의 Mock Data 병합하여 획득
      const { blogMeta, posts, pages } = getMergedMockData(config.staticPath);

      // 대시보드 쿼리 스트링 매개변수로 테마 설정 오버라이드
      const query = req.query;
      const activeBlogMeta = { ...blogMeta };

      // 쿼리로 넘어오는 설정 변수들을 동적으로 blogMeta에 오버라이드 적용
      Object.keys(query).forEach(key => {
        // 기존 UI 하드코딩 파라미터와의 하위 호환성 유지
        if (key === 'layoutWidth') activeBlogMeta['select:Layout Width'] = query.layoutWidth;
        else if (key === 'syntaxTheme') activeBlogMeta['select:Syntax Highlight theme'] = query.syntaxTheme;
        else if (key === 'endlessScroll') activeBlogMeta['if:Endless Scroll'] = query.endlessScroll;
        else if (key === 'disqusShortname') activeBlogMeta['text:Disqus Shortname'] = query.disqusShortname;
        else if (key === 'themeVersion') activeBlogMeta['text:Theme Version'] = query.themeVersion;
        else if (key === 'gaId') activeBlogMeta['text:Google Analytics ID'] = query.gaId;
        else {
          // 동적 변수 반영 (예: 'if:Show Header', 'color:Accent Color' 등)
          activeBlogMeta[key] = query[key];
        }
      });

      // 렌더링 뷰 및 목 데이터 분기 처리
      const viewType = query.viewType || 'index';
      let activePosts = [...posts];
      let activeTag = '';
      let activeSearchQuery = '';

      if (viewType === 'tag') {
        activeTag = query.tag || 'css';
        activePosts = posts.filter(p => p.Tags && p.Tags.some(t => t.Tag.toLowerCase() === activeTag.toLowerCase()));
      } else if (viewType === 'search') {
        activeSearchQuery = query.q || '개발';
        activePosts = posts.filter(p => {
          const titleMatch = p.Title && p.Title.toLowerCase().includes(activeSearchQuery.toLowerCase());
          const bodyMatch = p.Body && p.Body.toLowerCase().includes(activeSearchQuery.toLowerCase());
          return titleMatch || bodyMatch;
        });
      } else if (viewType === 'no-search') {
        activeSearchQuery = '존재하지않는검색어';
        activePosts = [];
      } else if (viewType === 'permalink') {
        const postId = query.postId || posts[0]?.PostId || 'post-1';
        activePosts = posts.filter(p => p.PostId === postId);
      }

      // AST 컴파일러 가동
      const context = {
        viewType: viewType === 'no-search' ? 'search' : viewType,
        blog: activeBlogMeta,
        posts: activePosts,
        pages: pages,
        currentSearchQuery: activeSearchQuery,
        currentTag: activeTag
      };

      const renderedHTML = compile(themeHTML, context);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(renderedHTML);
    } catch (error) {
      console.error('Rendering error:', error);
      res.status(500).send(`<h1>테마 렌더링 중 오류 발생</h1><pre>${error.stack}</pre>`);
    }
  });

  // 5. 가상 Endless Scroll API 서빙 (테마 동작 통합 지원)
  app.get('/page/:num', (req, res) => {
    const pageNum = parseInt(req.params.num) || 1;
    const { posts: allPosts } = getMergedMockData(config.staticPath);
    
    // 추가 페이지 요청 시, 다음 번 데이터 가상으로 리턴
    const mockEndlessPosts = [
      {
        PostId: `post-endless-${pageNum}-1`,
        Type: "text",
        Permalink: `/post/endless-${pageNum}-1`,
        DayOfMonth: "10",
        DayOfMonthSuffix: "th",
        ShortMonth: "May",
        Year: "2026",
        PostAuthorName: "Joo",
        Title: `Endless Scroll로 로드된 가상 데이터 (페이지: ${pageNum})`,
        Body: `<p>이 포스트는 텀블러 무한 스크롤 라이브러리 연동 검증을 위해 <code>tumblr-theme-preview</code> 패키지 엔진이 동적으로 반환한 추가 목 데이터입니다. 페이지가 끊김 없이 하단에 잘 로드되는지 확인해 보세요.</p>`,
        Tags: [{ Tag: "scroll", TagURL: "/tagged/scroll" }, { Tag: "preview", TagURL: "/tagged/preview" }]
      }
    ];

    res.json({
      posts: mockEndlessPosts
    });
  });

  app.listen(PORT, () => {
    console.log(`\n\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[1m ✦ tumblr-theme-preview Live Premium Suite ✦ \x1b[0m`);
    console.log(`\x1b[36m - 테마 파일: ${config.themePath}\x1b[0m`);
    console.log(`\x1b[36m - 리소스 폴더: ${config.staticPath}\x1b[0m`);
    console.log(`\x1b[33m - 접속 대시보드: http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[32m==================================================\x1b[0m\n`);
  });
}

module.exports = {
  startServer
};
