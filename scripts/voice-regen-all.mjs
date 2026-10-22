#!/usr/bin/env node
// 모든 음원을 한 번에 다시 만든다 (09 문서 6장 ‘음원 재생성’, R-10).
//   npm run voice:regen-all -- --dry-run     대상·글자 수만 보기 (API를 부르지 않음, 크레딧 0)
//   npm run voice:regen-all                  대상 개수·글자 수를 보여 주고 "yes"를 입력해야 시작
//   npm run voice:regen-all -- --yes         확인 없이 시작 (자동화용)
//
// - 기준 목록: 껍데기·과목의 voices.json (tts: true 제외). 한글쓰기 앱에서 가져온 음원도 포함
// - 생성 설정: docs/voice/typecast.json (목소리 ID·모델·속도·감정 — 감정은 대사 ID 앞부분 기준)
// - 같은 파일을 여러 대사가 함께 쓰면(예: 영어 a·A → letter-a.mp3) 파일 하나로 한 번만 만든다
// - 이미 있는 파일도 덮어쓴다(voice:make --force). Typecast가 준 mp3를 원본 그대로 저장(재압축 없음)
// - 실제 생성은 TYPECAST_API_KEY가 필요하다. 정식 공개 전 유료 플랜으로 전체를 다시 만들 때 쓴다 (6장 ②)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { csvCell, fileOf, isEnglish, ROOT, voiceSets } from './voice-lib.mjs';

/** 다시 만들 파일 목록: 음원 폴더+파일 이름이 같으면 하나로 (첫 대사 ID를 대표로) */
export function regenTargets(sets = voiceSets()) {
  const seen = new Set();
  const out = [];
  for (const set of sets) {
    for (const [id, line] of Object.entries(set.lines)) {
      if (line.tts) continue;
      const file = fileOf(id, line);
      const key = `${set.dir}/${file}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id, text: line.text, en: isEnglish(line), where: line.where || '', dir: set.dir, file });
    }
  }
  return out;
}

function ask(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve('');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => {
      rl.close();
      resolve(a.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  const yes = args.includes('--yes');
  const targets = regenTargets();
  const chars = targets.reduce((n, t) => n + t.text.length, 0);
  const byDir = {};
  for (const t of targets) byDir[t.dir] = (byDir[t.dir] || 0) + 1;

  console.log(`전체 재생성 대상: 음원 파일 ${targets.length}개 · 글자 수 ${chars}자`);
  for (const [d, n] of Object.entries(byDir)) console.log(`  ${d}: ${n}개`);
  console.log('예상 크레딧: 위 글자 수만큼 (Typecast는 읽는 글자 수 기준으로 차감). 기존 파일을 모두 덮어씁니다.');

  // voice-make가 읽는 CSV (한글쓰기 앱과 같은 칸 + 저장 위치 + 대사 ID)
  const dir = join(ROOT, 'docs/voice/_regen-all');
  mkdirSync(dir, { recursive: true });
  const csv = join(dir, '대사목록.csv');
  writeFileSync(
    csv,
    '﻿' +
      [['파일 이름', '읽을 문장', '언어', '쓰이는 곳', '저장 위치', '대사 ID'].join(',')]
        .concat(targets.map((t) => [t.file, t.text, t.en ? '영어' : '한국어', t.where, t.dir, t.id].map(csvCell).join(',')))
        .join('\n') +
      '\n',
  );
  console.log(`목록: docs/voice/_regen-all/대사목록.csv`);

  if (dry) {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/voice-make.mjs'), '--csv', csv, '--force', '--dry-run'], { stdio: 'inherit', cwd: ROOT });
    process.exit(r.status || 0);
  }
  if (!yes) {
    const a = await ask(`정말 ${targets.length}개를 모두 다시 만들까요? 크레딧이 듭니다. 계속하려면 yes 입력: `);
    if (a !== 'yes') {
      console.log('그만뒀습니다 (아무것도 만들지 않음).');
      process.exit(1);
    }
  }
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/voice-make.mjs'), '--csv', csv, '--force'], { stdio: 'inherit', cwd: ROOT });
  process.exit(r.status || 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
