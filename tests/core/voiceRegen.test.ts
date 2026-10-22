import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// scripts/*.mjs는 타입이 없어 경로를 문자열로 불러온다
const lib = (p: string) => import(p) as Promise<Record<string, any>>;

describe('음원 전체 재생성 목록 (09 문서 6장, R-10)', async () => {
  const { regenTargets } = await lib('../../scripts/voice-regen-all.mjs');
  const targets: { id: string; dir: string; file: string; en: boolean }[] = regenTargets();

  it('지금 있는 음원 파일이 모두 들어 있다 (껍데기·샘플·또박또박 글씨)', () => {
    const files = new Set(targets.map((t) => `${t.dir}/${t.file}`));
    expect(files.size).toBe(targets.length); // 같은 파일은 한 번만
    expect(targets.filter((t) => t.dir === 'public/voice')).toHaveLength(7);
    expect(targets.filter((t) => t.dir === 'public/apps/writing/voice')).toHaveLength(106);
  });

  it('한글쓰기 앱에서 가져온 음원 93개가 모두 재생성 대상이다', () => {
    const legacy = targets.filter((t) => t.dir === 'public/apps/writing/voice' && !t.file.startsWith('writing.'));
    expect(legacy).toHaveLength(93);
    // 영어 알파벳은 영어 목소리로
    expect(legacy.filter((t) => t.file.startsWith('letter-')).every((t) => t.en)).toBe(true);
  });

  it('생성 설정이 한글쓰기 앱 때와 같다 (목소리 ID, 칭찬·엔딩 happy 1.4, 나머지 normal 1.0)', () => {
    const cfg = JSON.parse(readFileSync('docs/voice/typecast.json', 'utf8'));
    const old = JSON.parse(readFileSync('docs/voice/_template/typecast.json', 'utf8'));
    expect(cfg.koVoice).toBe(old.koVoice);
    expect(cfg.enVoice).toBe(old.enVoice);
    expect([cfg.model, cfg.tempo, cfg.pitch, cfg.lufs]).toEqual([old.model, old.tempo, old.pitch, old.lufs]);
    const style = (id: string) => {
      const k = Object.keys(cfg.styles).filter((p) => id.startsWith(p)).sort((a, b) => b.length - a.length)[0];
      return k ? cfg.styles[k] : { emotion: 'normal', intensity: 1 };
    };
    expect(style('writing.praise.1')).toEqual(old.styles['praise-']);
    expect(style('writing.ending.all')).toEqual(old.styles['ending-']);
    expect(style('writing.retry.1')).toEqual(old.styles['retry-']);
    expect(style('writing.free.fail')).toEqual(old.styles['free-fail']);
    expect(style('writing.char.u3131')).toEqual({ emotion: 'normal', intensity: 1 });
  });
});
