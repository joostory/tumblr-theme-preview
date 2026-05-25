const fs = require('fs');
const path = require('path');
const { getMergedMockData } = require('../lib/mock_data');

// parser.js 소스코드를 그대로 가져와 디버그용으로 내부 단계들을 추출하여 실행합니다.
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

function tokenize(template) {
  const tokens = [];
  let lastIndex = 0;
  let match;
  
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

function evaluateAST(node, context) {
  if (node.type === 'root') {
    return node.children.map(child => evaluateAST(child, context)).join('');
  }
  
  if (node.type === 'text') {
    return node.content;
  }
  
  if (node.type === 'variable') {
    const name = node.name;
    
    if (name.startsWith('text:') || name.startsWith('select:') || name.startsWith('color:') || name.startsWith('font:') || name.startsWith('image:') || name.startsWith('if:')) {
      const varKey = name;
      return context.blog[varKey] !== undefined ? context.blog[varKey] : '';
    }
    
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
    
    if (context.currentPost) {
      const post = context.currentPost;
      if (name === 'DayOfMonth' || name === 'DayOfMOnth') return post.DayOfMonth || '';
      if (name === 'DayOfMonthSuffix') return post.DayOfMonthSuffix || '';
      if (name === 'ShortMonth') return post.ShortMonth || '';
      if (name === 'Year') return post.Year || '';
      
      if (post[name] !== undefined) {
        return post[name];
      }
    }
    
    if (name === 'Title') return context.blog.Title || '';
    if (name === 'MetaDescription') return context.blog.MetaDescription || '';
    
    return '';
  }
  
  if (node.type === 'block') {
    const name = node.name;
    const blog = context.blog;
    
    // 이 부분이 핵심적인 If/IfNot 디버그 영역입니다!
    if (name.startsWith('If') || name.startsWith('IfNot')) {
      const isNot = name.startsWith('IfNot');
      const varName = name.substring(isNot ? 5 : 2);
      
      const textVal = getBlogValue(blog, 'text:', varName);
      const ifVal = getBlogValue(blog, 'if:', varName);
      
      const hasValue = textVal || ifVal === '1' || ifVal === true || ifVal === 'true';
      
      console.log(`[Debug Block] Evaluated block: ${name}, varName: ${varName}, textVal: ${textVal}, ifVal: ${ifVal}, hasValue: ${hasValue}, showChildren: ${isNot ? !hasValue : hasValue}`);
      
      const show = isNot ? !hasValue : hasValue;
      return show ? renderChildren(node, context) : '';
    }
    
    if (name === 'Posts') {
      return context.posts.map(post => {
        const nextContext = { ...context, currentPost: post };
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

const themePath = path.join(__dirname, '../sample-theme.html');
const themeHTML = fs.readFileSync(themePath, 'utf-8');
const { blogMeta, posts, pages } = getMergedMockData(path.join(__dirname, '..'));

const activeBlogMeta = { 
  ...blogMeta,
  'if:Endless Scroll': '0',
  'color:Accent Color': '#ff0055'
};

const context = {
  viewType: 'index',
  blog: activeBlogMeta,
  posts: posts,
  pages: pages,
  currentSearchQuery: '',
  currentTag: ''
};

console.log('Tokenizing...');
const tokens = tokenize(themeHTML);
console.log('First few tokens:', tokens.slice(0, 10));

console.log('Building AST...');
const ast = buildAST(tokens);

console.log('Evaluating AST...');
const result = evaluateAST(ast, context);

console.log('--- RESULTS ---');
console.log('Includes Normal Pagination:', result.includes('Normal Pagination') ? 'YES' : 'NO');
console.log('Includes Endless Scroll Active:', result.includes('Endless Scroll Active') ? 'YES' : 'NO');
