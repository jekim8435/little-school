// 빌드 결과물(dist/)이 아이패드 에어 1(iOS 12.5 / Safari 12)에서 동작할 수 있는지 검사한다.
// 사용법: npm run build && npm run check:compat   (GitHub Actions 배포 전에도 실행된다)
//
// 검사 항목
//  1. JS: ES2019 문법만 쓰는지 (??, ?., 클래스 필드, #private 등이 남아 있으면 Safari 12가 파일을 못 읽는다)
//     동적 import()와 import.meta는 Safari 11.1부터 되므로 허용한다. 정규식 lookbehind도 금지.
//  2. index.html 안의 인라인 스크립트: 옛 브라우저에서도 오류 화면을 띄울 수 있게 ES5인지
//  3. CSS: Safari 12가 모르는 것 — inset 속성, gap, aspect-ratio, :is()/:where(), dvh 등 새 뷰포트 단위,
//     대체값 없는 clamp()/min()/max(), 그리고 iOS 12에서 숨김이 안 먹는 display:contents (명세 2-2)
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');
const problems = [];
const ok = [];

// 1. JS 문법
for (const f of readdirSync(assets).filter((f) => f.endsWith('.js'))) {
  const code = readFileSync(join(assets, f), 'utf8')
    .replace(/\bimport\(/g, '__dynImport(')
    .replace(/\bimport\.meta\b/g, '__importMeta');
  try {
    parse(code, { ecmaVersion: 2019, sourceType: 'module' });
    // 정규식 lookbehind는 ES2018 문법이라 위 검사를 통과하지만 Safari 16.4부터 된다
    const lb = code.search(/\(\?<[=!]/);
    if (lb >= 0) throw Object.assign(new Error('정규식 lookbehind (?<= / (?<!'), { pos: lb });
    ok.push(`JS ${f}: ES2019`);
  } catch (e) {
    const at = code.slice(Math.max(0, e.pos - 40), e.pos + 40);
    problems.push(`JS ${f}: Safari 12가 읽지 못하는 문법 (${e.message})\n    …${at}…`);
  }
}

// 2. index.html 인라인 스크립트
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
inline.forEach((code, i) => {
  try {
    parse(code, { ecmaVersion: 5, sourceType: 'script' });
    ok.push(`HTML 인라인 스크립트 ${i + 1}: ES5`);
  } catch (e) {
    problems.push(`HTML 인라인 스크립트 ${i + 1}: ES5가 아님 (${e.message})`);
  }
});

// 3. CSS
for (const f of readdirSync(assets).filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(join(assets, f), 'utf8');
  const before = problems.length;
  for (const m of css.matchAll(/display:contents/g)) {
    problems.push(`CSS ${f}: display:contents — iOS 12 Safari에서는 숨겨도 안의 요소가 계속 보여요 …${css.slice(Math.max(0, m.index - 30), m.index + 20)}`);
  }
  for (const m of css.matchAll(/(?<![-\w])inset:/g)) {
    problems.push(`CSS ${f}: inset 속성은 Safari 14.1부터 (top/right/bottom/left로 쓰세요) …${css.slice(m.index, m.index + 30)}`);
  }
  const banned = [
    [/(?<![-\w])(row-|column-)?gap:/g, 'gap — flex는 Safari 14.1부터 (자식 margin으로 쓰세요)'],
    [/(?<![-\w])aspect-ratio:/g, 'aspect-ratio — Safari 15부터 (padding 트릭으로 쓰세요)'],
    [/:(is|where)\(/g, ':is()/:where() — Safari 14부터'],
    [/\d(dv|sv|lv)(h|w|min|max)\b/g, '새 뷰포트 단위 — Safari 15.4부터 (--vh 변수로 쓰세요)'],
  ];
  for (const [re, why] of banned) {
    for (const m of css.matchAll(re)) {
      problems.push(`CSS ${f}: ${why} …${css.slice(Math.max(0, m.index - 30), m.index + 30)}`);
    }
  }
  // prop:clamp(…)/min(…)/max(…) 바로 앞에 같은 속성의 대체값이 있어야 한다.
  // 컨테이너 단위(cq*)를 쓰는 값은 JS(observeResize)가 대신 크기를 맞추므로 예외.
  for (const m of css.matchAll(/([;{])([-a-z]+):((?:clamp|min|max)\([^;}]*)/g)) {
    const [, , prop, value] = m;
    if (/\d+cq[whib]/.test(value)) continue;
    const prev = css.slice(0, m.index).match(/(?:^|[;{])([-a-z]+):[^;{}]*$/);
    if (!prev || prev[1] !== prop) {
      problems.push(`CSS ${f}: ${prop}:${value} — Safari 13.1 미만은 clamp/min/max를 몰라서, 앞에 '${prop}: 고정값;'이 필요해요`);
    }
  }
  if (problems.length === before) ok.push(`CSS ${f}: 문제 없음`);
}

for (const line of ok) console.log(`  ✔ ${line}`);
if (problems.length) {
  console.error(`\n아이패드 에어 1(Safari 12) 호환성 문제 ${problems.length}건:`);
  for (const p of problems) console.error(`  ✘ ${p}`);
  process.exit(1);
}
console.log('\n아이패드 에어 1(Safari 12) 호환성 검사 통과');
