// 음원 도구 공통 (명세 15장): voices.json 읽기·쓰기, 대상 고르기, 음원 파일 위치.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 대사 묶음 목록. 대상 이름: 'shell'(껍데기) 또는 과목 id
 * - json: voices.json 경로, dir: 음원 폴더(public 아래, 앱 주소와 같은 구조)
 */
export function voiceSets() {
  const sets = [{ target: 'shell', json: join(ROOT, 'src/voices.json'), dir: 'public/voice' }];
  const appsDir = join(ROOT, 'src/apps');
  for (const id of readdirSync(appsDir).sort()) {
    const json = join(appsDir, id, 'voices.json');
    if (existsSync(json)) sets.push({ target: id, json, dir: `public/apps/${id}/voice` });
  }
  return sets.map((s) => ({ ...s, lines: JSON.parse(readFileSync(s.json, 'utf8')) }));
}

/** 'shell,sample' → 해당 묶음들. 'all'이면 전부 */
export function pickSets(spec) {
  const all = voiceSets();
  if (!spec || spec === 'all') return all;
  const want = spec.split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = want.filter((w) => !all.some((s) => s.target === w));
  if (unknown.length) throw new Error(`모르는 대상: ${unknown.join(', ')} (있는 것: ${all.map((s) => s.target).join(', ')})`);
  return all.filter((s) => want.includes(s.target));
}

/** 대사의 음원 파일 이름 (file이 따로 없으면 <ID>.mp3) */
export const fileOf = (id, line) => line.file || `${id}.mp3`;

/** 음원을 (다시) 만들어야 하는지: tts가 아니고, 만든 적이 없거나 문장이 바뀌었으면 */
export function needsProduction(line) {
  if (line.tts) return null;
  if (!line.producedText) return '신규';
  if (line.producedText !== line.text) return '문장 변경';
  return null;
}

export function writeVoices(set) {
  writeFileSync(set.json, JSON.stringify(set.lines, null, 2) + '\n');
}

/** 영어 대사인지 (lang이 en으로 시작) */
export const isEnglish = (line) => /^en/i.test(line.lang || '');

/** 대사 ID 목록의 producedText = text (voice:make가 만든 뒤 부른다). 바꾼 수를 돌려준다 */
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

/** CSV 한 칸 */
export const csvCell = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
