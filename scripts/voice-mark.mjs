#!/usr/bin/env node
// 음원을 넣은 대사의 producedText를 지금 문장(text)으로 바꾼다 (명세 15-4 2번).
//   npm run voice:mark -- <폴더 이름>     예) npm run voice:mark -- step1-shell
// 그 폴더의 대사목록.csv에 있는 대사 중 음원 파일이 들어 있는 것만 표시한다.
// (voice:make로 만든 것은 자동으로 표시되므로, Typecast 웹에서 손으로 만들어 넣었을 때 쓴다)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileOf, ROOT, voiceSets, writeVoices } from './voice-lib.mjs';

/** 대사 ID 목록의 producedText = text. 바꾼 수를 돌려준다 */
export function markProduced(ids) {
  let n = 0;
  for (const set of voiceSets()) {
    let changed = false;
    for (const id of ids) {
      const line = set.lines[id];
      if (!line || line.producedText === line.text) continue;
      line.producedText = line.text;
      changed = true;
      n++;
    }
    if (changed) writeVoices(set);
  }
  return n;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) {
    console.error('사용법: npm run voice:mark -- <docs/voice 아래 폴더 이름>');
    process.exit(1);
  }
  const csv = readFileSync(join(ROOT, 'docs/voice', folder, '대사목록.csv'), 'utf8').replace(/^﻿/, '');
  const [head, ...rows] = csv.split(/\r?\n/).filter(Boolean);
  const cols = head.split(',');
  const iId = cols.indexOf('대사 ID');
  if (iId < 0) throw new Error('대사목록.csv에 ‘대사 ID’ 칸이 없습니다 (npm run voice:list로 다시 만드세요)');
  const ids = rows.map((r) => r.split(',')[iId]).map((s) => s.replace(/^"|"$/g, ''));
  const present = ids.filter((id) => {
    for (const set of voiceSets()) if (set.lines[id]) return existsSync(join(ROOT, set.dir, fileOf(id, set.lines[id])));
    return false;
  });
  const n = markProduced(present);
  console.log(`음원이 있는 ${present.length}개 중 ${n}개를 ‘제작됨’으로 표시했습니다 (없는 것 ${ids.length - present.length}개)`);
}
