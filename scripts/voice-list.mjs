#!/usr/bin/env node
// 음원 제작 자료 만들기 (명세 15-3).
//   npm run voice:list -- <대상> [폴더 이름]
//   예) npm run voice:list -- shell,sample step1-shell
// 대상: shell(껍데기) / 과목 id / 쉼표로 여러 개 / all
// 결과: docs/voice/<폴더 이름>/voice-list.md (부모 검토용 표), 대사목록.csv (voice-make 입력)
// 만들 대사: producedText가 없거나 text와 다르고, tts: true가 아닌 것
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvCell, fileOf, isEnglish, needsProduction, pickSets, ROOT } from './voice-lib.mjs';

const [spec, folderArg] = process.argv.slice(2);
if (!spec) {
  console.error('사용법: npm run voice:list -- <대상(shell, 과목 id, all)> [폴더 이름]');
  process.exit(1);
}
const folder = folderArg || spec.replace(/,/g, '-');
const sets = pickSets(spec);

const rows = [];
for (const set of sets) {
  for (const [id, line] of Object.entries(set.lines)) {
    const status = needsProduction(line);
    if (!status) continue;
    rows.push({ id, line, status, file: fileOf(id, line), dir: set.dir });
  }
}

const outDir = join(ROOT, 'docs/voice', folder);
mkdirSync(outDir, { recursive: true });

const md = [
  `# 음원 제작 목록 — ${folder}`,
  '',
  `대상: ${sets.map((s) => s.target).join(', ')} · ${rows.length}개 · 만든 날 ${new Date().toISOString().slice(0, 10)}`,
  '',
  '문장을 고치고 싶으면 이 표가 아니라 `voices.json`의 `text`를 고친 뒤 `npm run voice:list`를 다시 실행한다.',
  '',
  '| 번호 | 대사 ID | 문장 | 말투 | 쓰이는 화면 | 파일 | 상태 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r, i) =>
    `| ${i + 1} | \`${r.id}\` | ${r.line.text} | ${r.line.tone || ''} | ${r.line.where || ''} | \`${r.dir}/${r.file}\` | ${r.status} |`,
  ),
  '',
].join('\n');
writeFileSync(join(outDir, 'voice-list.md'), md);

// 한글쓰기 앱과 같은 칸 + 저장 위치(껍데기·과목 음원 폴더가 다르므로)
const csv = [
  ['파일 이름', '읽을 문장', '언어', '쓰이는 곳', '저장 위치', '대사 ID'].join(','),
  ...rows.map((r) => [r.file, r.line.text, isEnglish(r.line) ? '영어' : '한국어', r.line.where || '', r.dir, r.id].map(csvCell).join(',')),
].join('\n');
writeFileSync(join(outDir, '대사목록.csv'), '﻿' + csv + '\n');

console.log(`docs/voice/${folder}/voice-list.md, 대사목록.csv — ${rows.length}개`);
for (const r of rows) console.log(`  ${r.status.padEnd(5)} ${r.id}  "${r.line.text}"`);
if (!rows.length) console.log('만들 대사가 없습니다 (모두 제작됨)');
