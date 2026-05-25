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
      
      // 날짜/시간 변수 동적 조회
      const dateVars = getPostDateVariables(post);
      if (dateVars[name] !== undefined) {
        return dateVars[name];
      }
      if (name === 'DayOfMOnth') return dateVars.DayOfMonth; // 오타 하위호환성 유지
      
      if (name === 'DayOfMonthSuffix') return post.DayOfMonthSuffix || '';
      
      if (context.currentTagItem && name === 'Tag') return context.currentTagItem.Tag || '';
      if (context.currentTagItem && name === 'TagURL') return context.currentTagItem.TagURL || '';

      if (context.currentLineItem && name === 'Label') return context.currentLineItem.Label || '';
      if (context.currentLineItem && name === 'Line') return context.currentLineItem.Line || '';

      if (name === 'PostNotes' || name === 'PostNotes-Formatted') {
        return context.viewType === 'permalink' ? (post.PostNotes || '') : '';
      }
      if (name === 'NoteCount') {
        return post.NoteCount !== undefined ? String(post.NoteCount) : '2';
      }
      if (name === 'NoteCountWithLabel') {
        const count = post.NoteCount !== undefined ? post.NoteCount : 2;
        return `${count} ${count === 1 ? 'note' : 'notes'}`;
      }

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
      if (name === 'PostNotes') {
        return context.viewType === 'permalink' ? renderChildren(node, context) : '';
      }
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

// 텀블러 날짜/시간 변수들을 동적으로 자동 생성하는 스마트 헬퍼 함수
function getPostDateVariables(post) {
  if (post._dateVariables) return post._dateVariables;

  const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  const year = parseInt(post.Year) || 2026;
  const month = monthMap[post.ShortMonth] !== undefined ? monthMap[post.ShortMonth] : 4;
  const day = parseInt(post.DayOfMonth) || 25;

  // 포스트 ID 해시를 기반으로 가상 시간(시분초)을 안정적으로 부여하여 실감 나는 프리뷰 제공
  const hash = (post.PostId || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hour = 9 + (hash % 12); // 9시 ~ 20시
  const minute = hash % 60;
  const second = (hash * 7) % 60;

  const date = new Date(year, month, day, hour, minute, second);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // 연중 일수 계산
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = String(Math.floor(diff / oneDay));

  // 연중 주수 계산
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  const weekOfYear = String(Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7));

  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const isPm = hours24 >= 12;

  // TimeAgo 계산 (2026년 5월 25일 20:51 기준 가상 경과 시간 반영)
  const now = new Date(2026, 4, 25, 20, 51, 38); // 2026-05-25 20:51:38 고정
  const diffMs = now - date;
  let timeAgo = "Just now";
  if (diffMs > 0) {
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    else if (diffHours > 0) timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    else if (diffMins > 0) timeAgo = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }

  post._dateVariables = {
    DayOfMonth: String(day),
    DayOfMonthWithZero: String(day).padStart(2, '0'),
    DayOfWeek: days[date.getDay()],
    DayOfWeekShort: daysShort[date.getDay()],
    DayOfYear: dayOfYear,
    WeekOfYear: weekOfYear,
    Month: months[date.getMonth()],
    MonthNumber: String(date.getMonth() + 1),
    MonthNumberWithZero: String(date.getMonth() + 1).padStart(2, '0'),
    ShortMonth: monthsShort[date.getMonth()],
    Year: String(year),
    ShortYear: String(year).slice(-2),
    AmPm: isPm ? 'pm' : 'am',
    AmPmUpper: isPm ? 'PM' : 'AM',
    CapitalAmPm: isPm ? 'Pm' : 'Am',
    Hour: String(hours12),
    Hour24: String(hours24),
    Hour24WithZero: String(hours24).padStart(2, '0'),
    HourWithZero: String(hours12).padStart(2, '0'),
    Minutes: String(date.getMinutes()).padStart(2, '0'),
    Seconds: String(date.getSeconds()).padStart(2, '0'),
    Timestamp: String(Math.floor(date.getTime() / 1000)),
    TimeAgo: timeAgo
  };

  return post._dateVariables;
}

module.exports = {
  compile
};
