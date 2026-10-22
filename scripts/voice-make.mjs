#!/usr/bin/env node
// Typecast API로 대사목록.csv(npm run voice:list가 만든 것)의 대사를 음원(mp3)으로 만듭니다 (명세 15-3).
// 한글쓰기 앱의 도구(docs/voice/_template/voice-make.mjs)를 꼬마학교에 맞게 고친 것:
// - CSV의 ‘저장 위치’ 칸(public/voice, public/apps/<id>/voice)에 저장
// - 말투(감정)는 typecast.json의 styles를 ‘대사 ID’ 앞부분으로 고름 (예: "shell.sticker." → happy)
// - 만든 대사는 voices.json의 producedText를 text와 같게 바꿔 둔다 (= npm run voice:mark)
//
//   목소리 고르기:  npm run voice:make -- --list-voices [--age child] [--lang kor]
//   미리 보기:      npm run voice:make -- --csv docs/voice/step1-shell/대사목록.csv --dry-run
//   만들기:         npm run voice:make -- --csv docs/voice/step1-shell/대사목록.csv [--only shell.done] [--force]
//
// 필요: Node 18+, 환경변수 TYPECAST_API_KEY(저장소에 넣지 않음)
// 음원은 Typecast가 준 mp3를 원본 바이트 그대로 저장한다. 다시 압축·인코딩하지 않는다
// (AI 생성 메타데이터·워터마크 보존, 09 문서 6장 ③·음원 재생성, R-11)
// 설정: docs/voice/typecast.json (목소리 ID, 모델, 말투) — 한글쓰기 앱과 같은 목소리

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.typecast.ai';

// ---------- 인자 ----------
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};

const CSV_PATH = opt('csv', '');
const OUT_DIR = opt('out', ''); // CSV에 저장 위치가 없을 때만
const CONFIG_PATH = opt('config', 'docs/voice/typecast.json');
const ONLY = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const FORCE = flag('force');
const DRY = flag('dry-run');

const KEY = process.env.TYPECAST_API_KEY;

// ---------- CSV (따옴표 포함 칸 처리) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some((v) => v !== '')) rows.push(row); }
  return rows;
}

// ---------- 말투 고르기 ----------
// 대사 ID(없으면 파일 이름) 앞부분으로 감정을 정합니다. typecast.json 의 "styles" 로 바꿀 수 있습니다.
const DEFAULT_STYLES = {
  '*': { emotion: 'normal', intensity: 1.0 },
};

function styleFor(file, styles) {
  const key = Object.keys(styles)
    .filter((k) => k !== '*' && file.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return styles[key ?? '*'] ?? DEFAULT_STYLES['*'];
}

// ---------- API ----------
async function api(pathname, init = {}, tries = 4) {
  for (let t = 1; ; t++) {
    const res = await fetch(API + pathname, {
      ...init,
      headers: { 'X-API-KEY': KEY, ...(init.headers || {}) },
    });
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && t < tries) {
      const wait = 2000 * t;
      console.warn(`  ${res.status} — ${wait / 1000}초 후 다시 시도`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const body = await res.text().catch(() => '');
    const hint = {
      401: 'API 키가 틀렸습니다',
      402: '크레딧이 부족합니다',
      404: '목소리 ID를 찾을 수 없습니다',
      422: '이 문장을 읽을 수 없습니다 (문장을 조금 바꿔 보세요)',
    }[res.status];
    throw new Error(`${res.status}${hint ? ` (${hint})` : ''}: ${body.slice(0, 300)}`);
  }
}

async function listVoices() {
  const qs = new URLSearchParams();
  for (const k of ['model', 'gender', 'age']) if (opt(k)) qs.set(k, opt(k));
  const res = await api(`/v3/voices${qs.size ? `?${qs}` : ''}`);
  let voices = await res.json();
  if (!Array.isArray(voices)) voices = voices.voices ?? voices.data ?? [];
  const lang = opt('lang');
  console.log(`목소리 ${voices.length}개\n`);
  for (const v of voices) {
    const name = typeof v.voice_name === 'object'
      ? (v.voice_name[lang] ?? v.voice_name.kor ?? v.voice_name.eng ?? Object.values(v.voice_name)[0])
      : v.voice_name;
    const models = (v.models || [])
      .map((m) => `${m.version}[${(m.emotions || []).join('/')}]`)
      .join(' ');
    console.log(`${v.voice_id}  ${name}  (${v.gender ?? '-'}, ${v.age ?? '-'})  ${models}`);
    if (v.preview_url) console.log(`    미리듣기: ${v.preview_url}`);
  }
}

async function synth({ text, voiceId, lang, style, cfg }) {
  const body = {
    voice_id: voiceId,
    text,
    model: cfg.model,
    language: lang,
    prompt:
      cfg.model === 'ssfm-v21'
        ? { emotion_preset: style.emotion, emotion_intensity: style.intensity }
        : { emotion_type: 'preset', emotion_preset: style.emotion, emotion_intensity: style.intensity },
    output: {
      audio_format: 'mp3',
      audio_tempo: cfg.tempo ?? 1.0,
      audio_pitch: cfg.pitch ?? 0,
      target_lufs: cfg.lufs ?? -16,
    },
  };
  const res = await api('/v1/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Buffer.from(await res.arrayBuffer());
}

const exists = (p) => access(p).then(() => true, () => false);

// ---------- 실행 ----------
async function main() {
  if (!KEY && !DRY) {
    console.error('TYPECAST_API_KEY 환경변수를 먼저 설정하세요. (README의 "API 키" 참고)');
    process.exit(1);
  }
  if (flag('list-voices')) return listVoices();
  if (!CSV_PATH) throw new Error('--csv docs/voice/<폴더>/대사목록.csv 를 지정하세요 (먼저 npm run voice:list)');

  const cfg = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  cfg.model ??= 'ssfm-v30';
  const styles = { ...DEFAULT_STYLES, ...(cfg.styles || {}) };
  const replace = cfg.replace || {}; // 예: { "~": "" }

  const [header, ...rows] = parseCsv(await readFile(CSV_PATH, 'utf8'));
  const col = (n) => header.indexOf(n);
  const [iFile, iText, iLang, iDir, iId] = [col('파일 이름'), col('읽을 문장'), col('언어'), col('저장 위치'), col('대사 ID')];
  if ([iFile, iText, iLang].includes(-1)) throw new Error('CSV 머리줄(파일 이름, 읽을 문장, 언어)을 찾을 수 없습니다');

  let lines = rows.map((r) => ({
    file: r[iFile].trim(),
    text: r[iText].trim(),
    langKo: r[iLang].trim(),
    dir: iDir >= 0 && r[iDir] ? r[iDir].trim() : OUT_DIR,
    id: iId >= 0 && r[iId] ? r[iId].trim() : r[iFile].trim(),
  }));
  if (lines.some((l) => !l.dir)) throw new Error('CSV에 저장 위치가 없으면 --out 폴더를 지정하세요');
  if (ONLY.length) lines = lines.filter((l) => ONLY.some((p) => l.id.startsWith(p) || l.file.startsWith(p)));

  if (!DRY) {
    for (const d of new Set(lines.map((l) => l.dir))) await mkdir(d, { recursive: true });
  }
  const made_ids = [];

  let made = 0, skipped = 0, failed = 0, chars = 0;
  for (const l of lines) {
    const out = path.join(l.dir, l.file);
    if (!FORCE && (await exists(out))) { skipped++; continue; }

    const isEn = l.langKo === '영어';
    const voiceId = isEn ? cfg.enVoice : cfg.koVoice;
    const lang = isEn ? 'eng' : 'kor';
    const style = styleFor(l.id, styles);
    let text = l.text;
    for (const [from, to] of Object.entries(replace)) text = text.split(from).join(to);
    chars += text.length;

    console.log(`${l.id.padEnd(30)} ${lang} ${style.emotion}(${style.intensity})  "${text}"`);
    if (DRY) continue;
    if (!voiceId) throw new Error(`typecast.json 에 ${isEn ? 'enVoice' : 'koVoice'} 를 넣어 주세요`);

    try {
      // Typecast mp3를 받은 그대로 저장 (재인코딩 금지)
      await writeFile(out, await synth({ text, voiceId, lang, style, cfg }));
      made++;
      made_ids.push(l.id);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, cfg.delayMs ?? 300));
  }

  console.log(`\n${DRY ? '만들 예정' : '만든'} ${DRY ? lines.length - skipped : made}개 · 이미 있음 ${skipped}개${failed ? ` · 실패 ${failed}개` : ''} · 글자 수 ${chars}`);
  if (!DRY && made_ids.length) {
    // 만든 대사는 producedText를 지금 문장으로 (다음 voice:list에 다시 나오지 않게)
    const { markProduced } = await import('./voice-mark.mjs');
    markProduced(made_ids);
  }
  if (!DRY) console.log('확인: npm run voice:check');
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
