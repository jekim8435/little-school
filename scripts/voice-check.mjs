#!/usr/bin/env node
// 음원 확인 (명세 15-4 3번). 하나라도 있으면 실패:
//  1. 코드에서 say()로 부르는데 voices.json에 없는 ID
//  2. tts: true가 아닌데 음원 파일이 없는 대사
//  3. 문장이 바뀌었는데 다시 만들지 않은 대사 (text ≠ producedText)
//  4. 어떤 대사에도 연결되지 않은 남는 mp3 파일
// 개발 중인 대사(draft: true)는 2·3을 경고로만 알린다(내장 음성으로 읽으며 개발, 05 문서 15-2).
// 과목 마무리 때는 --final: draft가 남아 있으면 실패
//   npm run voice:check            (배포 워크플로)
//   npm run voice:check -- --final (과목 마무리)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileOf, ROOT, voiceSets } from './voice-lib.mjs';

const problems = [];
const warnings = [];
const final = process.argv.includes('--final');
const sets = voiceSets();
const known = new Set(sets.flatMap((s) => Object.keys(s.lines)));

// 1. say('…') ID
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
for (const f of walk(join(ROOT, 'src')).filter((f) => f.endsWith('.ts'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/say\(\s*'([a-z0-9.-]+)'/g)) {
    if (!known.has(m[1])) problems.push(`voices.json에 없는 대사 ID: ${m[1]} (${relative(ROOT, f)})`);
  }
}

let ok = 0;
let tts = 0;
let drafts = 0;
for (const set of sets) {
  const expected = new Set();
  for (const [id, line] of Object.entries(set.lines)) {
    if (line.tts) {
      tts++;
      continue;
    }
    const file = fileOf(id, line);
    expected.add(file);
    if (line.draft) {
      drafts++;
      if (final) problems.push(`개발 중 표시(draft)가 남음: ${id} "${line.text}"`);
      else if (!existsSync(join(ROOT, set.dir, file)) || line.producedText !== line.text) {
        warnings.push(`${id} "${line.text}"`);
        continue;
      }
    }
    // 2. 음원 없음
    if (!existsSync(join(ROOT, set.dir, file))) problems.push(`음원 없음: ${set.dir}/${file} — ${id} "${line.text}"`);
    // 3. 문장이 바뀜
    else if (line.producedText !== line.text) problems.push(`문장이 바뀌었거나 제작 표시가 없음: ${id} — text "${line.text}" / producedText "${line.producedText ?? ''}"`);
    else ok++;
  }
  // 4. 남는 mp3
  const dir = join(ROOT, set.dir);
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((f) => /\.(mp3|m4a)$/.test(f))) {
      if (!expected.has(f)) problems.push(`어느 대사에도 연결되지 않은 파일: ${set.dir}/${f}`);
    }
  }
}

console.log(`대사 ${known.size}개 · 음원 정상 ${ok}개 · 내장 음성으로 두는 대사 ${tts}개 · 개발 중(draft) ${drafts}개`);
if (warnings.length) {
  console.warn(`
개발 중이라 아직 음원이 없는 대사 ${warnings.length}개 (내장 음성으로 읽음, 과목 마무리 때 제작):`);
  for (const w of warnings.slice(0, 5)) console.warn(`  · ${w}`);
  if (warnings.length > 5) console.warn(`  … 외 ${warnings.length - 5}개`);
}
if (problems.length) {
  console.error(`\n음원 문제 ${problems.length}건:`);
  for (const p of problems) console.error(`  ✘ ${p}`);
  console.error('\n제작: npm run voice:list -- <대상> → npm run voice:make -- --csv docs/voice/<폴더>/대사목록.csv');
  process.exit(1);
}
console.log('음원 확인 통과');
