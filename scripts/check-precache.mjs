// 빌드 결과물(dist/)의 파일이 모두 서비스 워커의 미리 받아 두기(프리캐시) 목록에 들어 있는지 검사한다 (명세 11-2).
// 하나라도 빠지면 비행기 모드에서 그 과목·음원·그림이 열리지 않는다.
// 사용법: npm run build (마지막에 실행됨) 또는 node scripts/check-precache.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const swPath = join(dist, 'sw.js');

if (!existsSync(swPath)) {
  // 네이티브 빌드(VITE_NATIVE=1)는 서비스 워커가 없다
  console.log('sw.js 없음 — 서비스 워커를 만들지 않는 빌드라 프리캐시 검사를 건너뜀');
  process.exit(0);
}

const sw = readFileSync(swPath, 'utf8');
const listed = new Set([...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// 서비스 워커 자신과 Workbox 런타임은 목록에 없어도 된다
const IGNORE = [/^sw\.js$/, /^workbox-[\w-]+\.js$/, /\.map$/];
const files = walk(dist)
  .map((f) => relative(dist, f).replace(/\\/g, '/'))
  .filter((f) => !IGNORE.some((re) => re.test(f)));

const missing = files.filter((f) => !listed.has(f));
console.log(`  프리캐시 ${listed.size}개 / 빌드 파일 ${files.length}개`);
if (missing.length) {
  console.error('\n프리캐시 목록에 빠진 파일 (비행기 모드에서 열리지 않음):');
  for (const f of missing) console.error(`  ✘ ${f}`);
  console.error('\nvite.config.ts의 workbox.globPatterns에 확장자를 더하세요.');
  process.exit(1);
}
console.log('모든 파일이 프리캐시에 들어 있음 (오프라인 실행 가능)');
