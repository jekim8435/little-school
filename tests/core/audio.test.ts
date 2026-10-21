import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clipUrl, GAIN, pickVoice, SFX, TTS_RATE, TTS_VOLUME, ttsText, type SfxName } from '../../src/core/audio';
import voices from '../../src/voices.json';
import { apps } from '../../src/apps/registry';

describe('clipUrl: 제작 음원을 쓸지', () => {
  const dir = '/little-school/voice/';

  it('음원을 만든 문장과 지금 문장이 같으면 <ID>.mp3', () => {
    expect(clipUrl('shell.done.bye', { text: '안녕', producedText: '안녕' }, dir)).toBe('/little-school/voice/shell.done.bye.mp3');
  });

  it('파일 이름이 따로 있으면 그것 (한글쓰기 앱 음원)', () => {
    expect(clipUrl('writing.char.u3131', { text: '기역', producedText: '기역', file: 'consonant_01.mp3' }, '/a/')).toBe('/a/consonant_01.mp3');
  });

  it('아직 만들지 않았거나, 문장이 바뀌었거나, 내장 음성으로 두기로 했으면 null → 내장 음성', () => {
    expect(clipUrl('a', { text: '안녕' }, dir)).toBeNull();
    expect(clipUrl('a', { text: '안녕!', producedText: '안녕' }, dir)).toBeNull();
    expect(clipUrl('a', { text: '안녕', producedText: '안녕', tts: true }, dir)).toBeNull();
  });
});

describe('pickVoice: 내장 음성 고르기', () => {
  const v = (name: string, lang: string) => ({ name, lang });

  it('언어가 맞는 것 중 선호 목소리를 먼저', () => {
    const list = [v('Samantha', 'en-US'), v('Some Korean', 'ko-KR'), v('Yuna', 'ko-KR')];
    expect(pickVoice(list, 'ko-KR')?.name).toBe('Yuna');
  });

  it('선호 목소리가 없으면 그 언어의 첫 번째, 언어 표기(ko_KR, ko-kr)가 달라도 찾는다', () => {
    expect(pickVoice([v('Alpha', 'en-US'), v('Beta', 'ko_KR')], 'ko-KR')?.name).toBe('Beta');
    expect(pickVoice([v('한국의 여성', 'ko-kr')], 'ko-KR')?.name).toBe('한국의 여성');
  });

  it('그 언어가 없으면 undefined (브라우저 기본값)', () => {
    expect(pickVoice([v('Samantha', 'en-US')], 'ko-KR')).toBeUndefined();
    expect(pickVoice([], 'ko-KR')).toBeUndefined();
  });
});

describe('소리 설정 값', () => {
  it('크기는 작게 < 보통 < 크게', () => {
    expect(GAIN.small).toBeLessThan(GAIN.normal);
    expect(GAIN.normal).toBeLessThan(GAIN.large);
    expect(TTS_VOLUME.small).toBeLessThan(TTS_VOLUME.normal);
    expect(TTS_VOLUME.large).toBeLessThanOrEqual(1);
  });

  it('천천히는 보통보다 느리다 (기본은 천천히, 명세 8-6)', () => {
    expect(TTS_RATE.slow).toBeLessThan(TTS_RATE.normal);
  });

  it('공통 효과음 5종이 모두 있다 (명세 4-3)', () => {
    const names: SfxName[] = ['star', 'correct', 'oops', 'cheer', 'tap'];
    for (const n of names) expect(SFX[n].length, n).toBeGreaterThan(0);
  });

  it('물결표는 빼고 읽는다', () => {
    expect(ttsText('우와~ 잘했어요~')).toBe('우와 잘했어요');
  });
});

describe('voices.json (껍데기 대사, 명세 15-2)', () => {
  const table = voices as Record<string, { text?: unknown }>;

  it('대사 ID 규칙: shell.<화면>.<이름>, 영문 소문자·숫자·-·.만', () => {
    for (const id of Object.keys(table)) expect(id, id).toMatch(/^shell\.[a-z0-9-]+\.[a-z0-9.-]+$/);
  });

  it('모든 대사에 문장이 있다', () => {
    for (const [id, line] of Object.entries(table)) expect(typeof line.text === 'string' && line.text.length > 0, id).toBe(true);
  });
});

describe('과목 대사 (명세 15-2)', () => {
  it('과목 voices.json의 ID는 <과목 id>.<화면>.<이름>', () => {
    for (const a of apps) {
      for (const id of Object.keys(a.voices || {})) expect(id, id).toMatch(new RegExp(`^${a.id}\\.[a-z0-9-]+\\.[a-z0-9.-]+$`));
    }
  });
});

describe('코드에서 부르는 대사 ID가 모두 voices.json에 있다', () => {
  it("say('…')", () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    const known = new Set(Object.keys(voices));
    for (const a of apps) for (const id of Object.keys(a.voices || {})) known.add(id);
    const used = new Set<string>();
    for (const f of walk(fileURLToPath(new URL('../../src', import.meta.url))).filter((f) => f.endsWith('.ts'))) {
      for (const m of readFileSync(f, 'utf8').match(/say\(\s*'[a-z0-9.-]+'/g) ?? []) used.add(m.replace(/^say\(\s*'/, '').replace(/'$/, ''));
    }
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((id) => !known.has(id))).toEqual([]);
  });
});
