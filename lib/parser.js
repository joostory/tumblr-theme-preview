// Tumblr template parser and AST renderer (Universal Version)

const langPack = {
  "Search results for SearchQuery": "검색 결과: {SearchQuery}",
  "SearchResultCount results for SearchQuery": "{SearchResultCount}개의 결과가 검색되었습니다.",
  "No results found": "검색 결과가 없습니다.",
  "Archive": "아카이브",
  "Previous page": "이전 페이지",
  "Next page": "다음 페이지",
  "Previous post": "이전 포스트",
  "Next post": "다음 포스트",
  "Loading": "불러오는 중..."
};

// 텀블러 마크업 토크나이저
function tokenize(template) {
  const tokens = [];
  let lastIndex = 0;
  let match;
  
  // {block:Name}, {/block:Name}, {Variable} 등 텀블러 예약어 토큰 추출 정규식
  const regex = /\{(\/?block:[A-Za-z0-9_:\-]+|(?:text|select|color|font|image|if|lang):[A-Za-z0-9_:\- ]+|[A-Za-z0-9_:\-]+)\}/g;
  
  while ((match = regex.exec(template)) !== null) {
    const textBefore = template.substring(lastIndex, match.index);
    if (textBefore) {
      tokens.push({ type: 'text', content: textBefore });
    }
    
    const tokenVal = match[1];
    if (tokenVal.startsWith('block:')) {
      tokens.push({ type: 'block_start', name: tokenVal.substring(6) });
    } else if (tokenVal.startsWith('/block:')) {
      tokens.push({ type: 'block_end', name: tokenVal.substring(7) });
    } else {
      tokens.push({ type: 'variable', name: tokenVal });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  const textAfter = template.substring(lastIndex);
  if (textAfter) {
    tokens.push({ type: 'text', content: textAfter });
  }
  
  return tokens;
}

// 토큰 스트림으로 중첩이 가능한 AST 트리 구축
function buildAST(tokens) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  
  for (const token of tokens) {
    const currentParent = stack[stack.length - 1];
    
    if (token.type === 'text') {
      currentParent.children.push({ type: 'text', content: token.content });
    } else if (token.type === 'variable') {
      currentParent.children.push({ type: 'variable', name: token.name });
    } else if (token.type === 'block_start') {
      const newBlock = { type: 'block', name: token.name, children: [] };
      currentParent.children.push(newBlock);
      stack.push(newBlock);
    } else if (token.type === 'block_end') {
      if (stack.length > 1 && stack[stack.length - 1].name === token.name) {
        stack.pop();
      } else {
        console.warn(`[Parser Warning] Block mismatch: closing ${token.name} but expected ${stack[stack.length - 1].name}`);
      }
    }
  }
  
  return root;
}

// AST와 Mock Data 컨텍스트를 활용해 HTML 렌더링
function evaluateAST(node, context) {
  if (node.type === 'root') {
    return node.children.map(child => evaluateAST(child, context)).join('');
  }
  
  if (node.type === 'text') {
    return node.content;
  }
  
  if (node.type === 'variable') {
    const name = node.name;
    
    // 1. Theme Text / Select / Color / Font / Image / If 변수
    if (name.startsWith('text:') || name.startsWith('select:') || name.startsWith('color:') || name.startsWith('font:') || name.startsWith('image:') || name.startsWith('if:')) {
      const varKey = name;
      return context.blog[varKey] !== undefined ? context.blog[varKey] : '';
    }
    
    // 2. 언어 변수 처리
    if (name.startsWith('lang:')) {
      const langKey = name.substring(5);
      let term = langPack[langKey] || langKey;
      if (term.includes('{SearchQuery}')) {
        term = term.replace('{SearchQuery}', context.currentSearchQuery || '');
      }
      if (term.includes('{SearchResultCount}')) {
        term = term.replace('{SearchResultCount}', String(context.posts.length));
      }
      return term;
    }
    
    // 3. 포스트 내부 변수 처리
    if (context.currentPost) {
      const post = context.currentPost;
      
      if (name === 'DayOfMOnth' || name === 'DayOfMonth') return post.DayOfMonth || '';
      if (name === 'DayOfMonthSuffix') return post.DayOfMonthSuffix || '';
      if (name === 'ShortMonth') return post.ShortMonth || '';
      if (name === 'Year') return post.Year || '';
      
      if (context.currentTagItem && name === 'Tag') return context.currentTagItem.Tag || '';
      if (context.currentTagItem && name === 'TagURL') return context.currentTagItem.TagURL || '';

      if (context.currentLineItem && name === 'Label') return context.currentLineItem.Label || '';
      if (context.currentLineItem && name === 'Line') return context.currentLineItem.Line || '';

      if (post[name] !== undefined) {
        return post[name];
      }
    }

    // 4. 페이지 루프 내 변수 처리
    if (context.currentPageItem) {
      if (name === 'Label') return context.currentPageItem.Label || '';
      if (name === 'URL') return context.currentPageItem.URL || '';
    }
    
    // 5. 글로벌 블로그 변수 치환
    if (name === 'SearchQuery') return context.currentSearchQuery || '';
    if (name === 'Tag') return context.currentTag || '';
    if (name === 'CurrentPage') return '1';
    
    if (context.blog[name] !== undefined) {
      return context.blog[name];
    }
    
    return '';
  }
  
  if (node.type === 'block') {
    const name = node.name;
    const blog = context.blog;
    
    // --- 조건형 블록 ---
    
    if (name === 'IndexPage') {
      return context.viewType === 'index' ? renderChildren(node, context) : '';
    }
    if (name === 'PermalinkPage') {
      return context.viewType === 'permalink' ? renderChildren(node, context) : '';
    }
    if (name === 'TagPage') {
      return context.viewType === 'tag' ? renderChildren(node, context) : '';
    }
    if (name === 'SearchPage') {
      return context.viewType === 'search' ? renderChildren(node, context) : '';
    }
    if (name === 'NoSearchResults') {
      return (context.viewType === 'search' && context.posts.length === 0) ? renderChildren(node, context) : '';
    }
    
    if (name.startsWith('If') || name.startsWith('IfNot')) {
      const isNot = name.startsWith('IfNot');
      const varName = name.substring(isNot ? 5 : 2);
      const textVal = getBlogValue(blog, 'text:', varName);
      const ifVal = getBlogValue(blog, 'if:', varName);
      const hasValue = textVal || ifVal === '1' || ifVal === true || ifVal === 'true';
      const show = isNot ? !hasValue : hasValue;
      return show ? renderChildren(node, context) : '';
    }
    
    if (context.currentPost) {
      const post = context.currentPost;
      
      const postTypes = ['Text', 'Photo', 'Photoset', 'Quote', 'Link', 'Chat', 'Audio', 'Video', 'Answer'];
      if (postTypes.includes(name)) {
        return post.Type.toLowerCase() === name.toLowerCase() ? renderChildren(node, context) : '';
      }
      
      if (name === 'Date') return renderChildren(node, context);
      if (name === 'HasTags') return (post.Tags && post.Tags.length > 0) ? renderChildren(node, context) : '';
      if (name === 'IfDisqusShortname') return blog['text:Disqus Shortname'] ? renderChildren(node, context) : '';
    }
    
    if (name === 'HasPages') {
      return (context.pages && context.pages.length > 0) ? renderChildren(node, context) : '';
    }
    if (name === 'Pagination') {
      const isEndless = blog['if:Endless Scroll'] === '1' || blog['if:Endless Scroll'] === true;
      return (context.viewType === 'index' && !isEndless) ? renderChildren(node, context) : '';
    }
    if (name === 'PermalinkPagination') {
      return context.viewType === 'permalink' ? renderChildren(node, context) : '';
    }
    
    if (name === 'Hidden') {
      return ''; 
    }
    
    // --- 반복형 블록 (루프) ---
    
    if (name === 'Posts') {
      return context.posts.map(post => {
        const nextContext = { ...context, currentPost: post };
        return renderChildren(node, nextContext);
      }).join('');
    }
    
    if (name === 'Pages') {
      return context.pages.map(page => {
        const nextContext = { ...context, currentPageItem: page };
        return renderChildren(node, nextContext);
      }).join('');
    }
    
    if (name === 'Tags' && context.currentPost) {
      return (context.currentPost.Tags || []).map(tag => {
        const nextContext = { ...context, currentTagItem: tag };
        return renderChildren(node, nextContext);
      }).join('');
    }
    
    if (name === 'Lines' && context.currentPost) {
      return (context.currentPost.Lines || []).map(line => {
        const nextContext = { ...context, currentLineItem: line };
        return renderChildren(node, nextContext);
      }).join('');
    }
    
    return renderChildren(node, context);
  }
  
  return '';
}

function renderChildren(node, context) {
  return node.children.map(child => evaluateAST(child, context)).join('');
}

// 템플릿 컴파일 메인 진입 함수
function compile(template, context) {
  const tokens = tokenize(template);
  const ast = buildAST(tokens);
  return evaluateAST(ast, context);
}

// 공백 및 대소문자 차이를 극복하는 유연한 blogMeta 조회 헬퍼 함수
function getBlogValue(blog, prefix, varName) {
  const targetKey = (prefix + varName).toLowerCase().replace(/\s+/g, '');
  
  for (const rawKey of Object.keys(blog)) {
    const cleanKey = rawKey.toLowerCase().replace(/\s+/g, '');
    if (cleanKey === targetKey) {
      return blog[rawKey];
    }
  }
  return undefined;
}

module.exports = {
  compile
};
