/**
 * AI 음성으로 만들 대사 목록(voice/대사목록.csv)을 다시 만들고, 아직 없는 녹음 파일을 알려 준다.
 * 실행: npm run voice:lines
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { linesToCsv, voiceLines } from '../src/audio/lines';

const lines = voiceLines();
writeFileSync('voice/대사목록.csv', linesToCsv(lines));

const files = existsSync('voice/clips') ? readdirSync('voice/clips') : [];
const ids = new Set(files.filter((f) => /\.(mp3|m4a)$/.test(f)).map((f) => f.replace(/\.(mp3|m4a)$/, '')));
const missing = lines.filter((l) => !ids.has(l.id));
const known = new Set(lines.map((l) => l.id));
const unknown = [...ids].filter((id) => !known.has(id));

console.log(`대사 ${lines.length}개 → voice/대사목록.csv`);
console.log(`녹음 파일: ${lines.length - missing.length}개 있음, ${missing.length}개 없음 (없는 대사는 기기 음성으로 읽어요)`);
if (unknown.length) console.log(`⚠ 대사 목록에 없는 파일 이름: ${unknown.join(', ')}`);
