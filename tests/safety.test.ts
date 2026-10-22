/**
 * 아이 안전·마무리 점검 (명세 2-3, 13장).
 * - 외부로 나가는 링크가 하나도 없다 (누르면 Safari가 열려 앱 밖으로 나감)
 * - 과목·화면 코드에 ctx.audio.speak()로 남은 임시 문장이 없다 (모두 voices.json + say(id))
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, '/');
const sources = walk(join(ROOT, 'src'))
  .filter((f) => /\.(ts|css|html|json|svg)$/.test(f))
  .concat([join(ROOT, 'index.html')]);

function hits(re: RegExp, files = sources, allow: (line: string) => boolean = () => false): string[] {
  const out: string[] = [];
  for (const f of files) {
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (re.test(line) && !allow(line)) out.push(`${rel(f)}:${i + 1}: ${line.trim()}`);
      });
  }
  return out;
}

describe('외부로 나가는 링크가 없다 (명세 2-3)', () => {
  it('http(s) 주소를 쓰지 않는다 (SVG 이름공간 표기는 예외)', () => {
    expect(hits(/https?:\/\//, sources, (l) => /www\.w3\.org\/2000\/svg/.test(l))).toEqual([]);
  });

  it('새 창 열기(target=, window.open)를 쓰지 않는다', () => {
    expect(hits(/target\s*[=:]\s*['"]_blank|window\.open\(/)).toEqual([]);
  });
});

describe('임시 음성 문장이 남아 있지 않다 (명세 13장)', () => {
  it('화면·과목 코드가 audio.speak()를 부르지 않는다 (say(id)를 쓴다)', () => {
    const files = sources.filter((f) => /[\\/]src[\\/](apps|screens)[\\/].*\.ts$/.test(f));
    expect(hits(/\baudio\.speak\(/, files)).toEqual([]);
  });
});

describe('플랫폼·저장소 직접 참조 위치 (09 문서 4장 2·3, 11.3)', () => {
  const ts = sources.filter((f) => f.endsWith('.ts'));
  const outside = (dir: string) => ts.filter((f) => !rel(f).startsWith(dir));

  it('navigator.standalone·serviceWorker·storage·userAgent, Capacitor는 src/platform/에만', () => {
    expect(hits(/navigator\.(standalone|serviceWorker|storage|userAgent)|\)\.(standalone|storage)\b|Capacitor|'serviceWorker' in/, outside('src/platform/'))).toEqual([]);
  });

  it('localStorage는 src/core/storage.ts에만', () => {
    expect(hits(/localStorage\./, ts.filter((f) => rel(f) !== 'src/core/storage.ts'))).toEqual([]);
  });
});
