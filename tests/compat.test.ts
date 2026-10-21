/**
 * 아이패드 에어 1(iOS 12.5 / Safari 12) 호환성 검사 — 소스 코드 단계.
 * 빌드 결과물 검사는 scripts/check-compat.mjs가 한다.
 *
 * 앱 코드(src/)가 Safari 12에 없는 기능을 직접 쓰면 실패한다. 금지 목록은 명세 2-2.
 * 꼭 써야 하면 ui/input.ts(입력)나 ui/compat.ts(기능 채우기)처럼 없을 때의 대안과 함께 감싼다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const srcFiles = walk(SRC).map((f) => relative(ROOT, f).replace(/\\/g, '/'));
const appFiles = srcFiles.filter((f) => f.endsWith('.ts'));
const cssFiles = srcFiles.filter((f) => f.endsWith('.css'));

interface Rule {
  name: string;
  pattern: RegExp;
  why: string;
  /** 대안과 함께 감싸 둔 파일은 예외 */
  allowIn?: string[];
}

const RULES: Rule[] = [
  {
    name: 'Pointer Events 직접 사용',
    pattern: /addEventListener\(\s*['"]pointer|setPointerCapture/,
    why: 'Safari 13부터. ui/input.ts의 attachInput()을 쓰면 터치 이벤트로 대신 받는다',
    allowIn: ['src/ui/input.ts'],
  },
  {
    name: 'ResizeObserver 직접 사용',
    pattern: /new ResizeObserver/,
    why: 'Safari 13.4부터. ui/compat.ts의 observeResize()를 쓴다',
    allowIn: ['src/ui/compat.ts'],
  },
  { name: 'String.replaceAll', pattern: /\.replaceAll\(/, why: 'Safari 13.1부터. replace(/…/g, …)를 쓴다' },
  { name: 'String.matchAll', pattern: /\.matchAll\(/, why: 'Safari 13부터' },
  { name: 'Array/String .at()', pattern: /\.at\(-?\d/, why: 'Safari 15.4부터. arr[arr.length - 1]을 쓴다' },
  { name: 'structuredClone', pattern: /structuredClone\(/, why: 'Safari 15.4부터' },
  { name: 'Promise.allSettled/any', pattern: /Promise\.(allSettled|any)\(/, why: 'Safari 13/14부터' },
  { name: 'Object.hasOwn', pattern: /Object\.hasOwn\(/, why: 'Safari 15.4부터' },
  { name: 'findLast/toSorted 등', pattern: /\.(findLast|findLastIndex|toSorted|toReversed|toSpliced)\(/, why: 'Safari 15.4~16부터' },
  { name: 'navigator.clipboard', pattern: /navigator\.clipboard/, why: 'iOS 13.4부터. 백업 복사는 textarea 선택 + execCommand로' },
  { name: '최상위 await', pattern: /^await\s/, why: 'Safari 15부터. 일반 async 함수 안에서 쓴다' },
  { name: '정규식 lookbehind', pattern: /\(\?<[=!]/, why: 'Safari 16.4부터. 다른 정규식으로 쓴다' },
];

describe('앱 코드가 Safari 12에 없는 기능을 직접 쓰지 않는다', () => {
  for (const rule of RULES) {
    it(rule.name, () => {
      const hits: string[] = [];
      for (const file of appFiles) {
        if (rule.allowIn?.includes(file)) continue;
        readFileSync(join(ROOT, file), 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (rule.pattern.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
              hits.push(`${file}:${i + 1}: ${line.trim()}`);
            }
          });
      }
      expect(hits, `${rule.name} — ${rule.why}`).toEqual([]);
    });
  }
});

describe('CSS가 Safari 12에서도 깨지지 않는다', () => {
  // 주석을 지운 줄 목록 (줄 번호는 유지)
  const files = cssFiles.map((file) => {
    const css = readFileSync(join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    return { file, lines: css.split('\n') };
  });
  const find = (re: RegExp) =>
    files.flatMap(({ file, lines }) => lines.flatMap((l, i) => (re.test(l) ? [`${file}:${i + 1}: ${l.trim()}`] : [])));

  it('CSS 파일이 있다', () => {
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  it('inset 속성을 쓰지 않는다 (Safari 14.1부터)', () => {
    expect(find(/(^|[\s;{])inset\s*:/)).toEqual([]);
  });

  it('display: contents를 쓰지 않는다 (iOS 12 Safari에서 숨겨도 자식이 계속 보이는 버그)', () => {
    expect(find(/display\s*:\s*contents/)).toEqual([]);
  });

  it('aspect-ratio를 쓰지 않는다 (Safari 15부터)', () => {
    expect(find(/(^|[\s;{])aspect-ratio\s*:/)).toEqual([]);
  });

  it('gap을 쓰지 않는다 (flex는 Safari 14.1부터 — 자식 margin을 쓴다)', () => {
    expect(find(/(^|[\s;{])(row-|column-)?gap\s*:/)).toEqual([]);
  });

  it(':is() / :where()를 쓰지 않는다 (Safari 14부터)', () => {
    expect(find(/:(is|where)\(/)).toEqual([]);
  });

  it('새 뷰포트 단위(dvh 등)를 쓰지 않는다 — window.innerHeight로 --vh를 쓴다', () => {
    expect(find(/\d(dv|sv|lv)(h|w|min|max)\b/)).toEqual([]);
  });

  it('clamp()/min()/max() 앞에는 같은 속성의 고정값이 있다 (Safari 13.1부터)', () => {
    const missing: string[] = [];
    for (const { file, lines } of files) {
      lines.forEach((line, i) => {
        const m = line.match(/^\s*([-a-z]+)\s*:\s*(?:clamp|min|max)\(/);
        if (!m) return;
        const prev = lines[i - 1]?.match(/^\s*([-a-z]+)\s*:/);
        if (prev?.[1] !== m[1]) missing.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(missing).toEqual([]);
  });
});
