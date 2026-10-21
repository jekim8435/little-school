import { describe, expect, it } from 'vitest';
import { CATEGORIES, glyphsOf } from '../../../src/apps/writing/categories';
import { emptyRound, firstTarget, nextTarget, readData, recordAttempt } from '../../../src/apps/writing/round';
import { SETTINGS_SCHEMA } from '../../../src/apps/writing/settings';
import voices from '../../../src/apps/writing/voices.json';

const ids = ['a', 'b', 'c', 'd'];

describe('카테고리 (명세 14-3)', () => {
  it('7개, 순서와 이름이 명세대로, 글자 수 합이 102', () => {
    expect(CATEGORIES.map((c) => c.name)).toEqual(['숫자', '자음', '모음', '쌍자음', '합성모음', '영어 소문자', '영어 대문자']);
    expect(CATEGORIES.map((c) => c.id)).toEqual(['digit', 'consonant', 'vowel', 'double-consonant', 'compound-vowel', 'lower', 'upper']);
    expect(CATEGORIES.map((c) => glyphsOf(c).length)).toEqual([10, 14, 10, 5, 11, 26, 26]);
  });

  it('모든 글자에 읽기 대사가 있다 (숫자는 하나·둘 읽기도)', () => {
    const table = voices as Record<string, { text: string }>;
    for (const c of CATEGORIES) {
      expect(table[`writing.category.${c.id}`], c.id).toBeDefined();
      for (const g of glyphsOf(c)) {
        const id = `writing.char.u${g.id.codePointAt(0)!.toString(16).padStart(4, '0')}`;
        expect(table[id], id).toBeDefined();
        if (g.speakNative) expect(table[`${id}-native`], id).toBeDefined();
      }
    }
  });
});

describe('회차: 다음 글자 고르기', () => {
  it('처음에는 첫 글자', () => {
    expect(firstTarget(ids, emptyRound())).toBe(0);
  });

  it('방금 쓴 글자 뒤의 안 한 글자 → 없으면 앞에서 찾는다 (한글쓰기 앱 nextTarget과 같음)', () => {
    expect(nextTarget(ids, { cleared: ['a'], later: [] }, 0)).toBe(1);
    expect(nextTarget(ids, { cleared: ['c', 'd'], later: [] }, 3)).toBe(0);
    expect(nextTarget(ids, { cleared: ['a', 'b', 'd'], later: [] }, 1)).toBe(2);
  });

  it('틀린 글자(나중에)는 안 한 글자를 다 쓴 뒤 회차 끝에 다시 나온다', () => {
    expect(nextTarget(ids, { cleared: [], later: ['a'] }, 0)).toBe(1);
    expect(nextTarget(ids, { cleared: ['b', 'c', 'd'], later: ['a'] }, 3)).toBe(0);
  });

  it('나중에 목록은 틀린 순서대로, 방금 틀린 글자를 바로 다시 내지 않는다', () => {
    const r = { cleared: ['c', 'd'], later: ['b', 'a'] };
    expect(nextTarget(ids, r, 3)).toBe(1); // b 먼저
    expect(nextTarget(ids, r, 1)).toBe(0); // 방금 b를 틀렸으면 a
  });

  it('남은 게 방금 틀린 글자 하나뿐이면 그 글자', () => {
    expect(nextTarget(ids, { cleared: ['a', 'b', 'c'], later: ['d'] }, 3)).toBe(3);
  });

  it('모두 클리어했으면 -1', () => {
    expect(nextTarget(ids, { cleared: ids.slice(), later: [] }, 0)).toBe(-1);
  });
});

describe('회차: 결과 반영', () => {
  it('틀린 획 없이 쓰면 클리어, 틀렸으면 나중에(맨 뒤로)', () => {
    let r = recordAttempt(ids, emptyRound(), 'a', true).round;
    expect(r).toEqual({ cleared: ['a'], later: [] });
    r = recordAttempt(ids, r, 'b', false).round;
    r = recordAttempt(ids, r, 'c', false).round;
    r = recordAttempt(ids, r, 'b', false).round;
    expect(r.later).toEqual(['c', 'b']);
  });

  it('나중에 글자를 다시 맞히면 클리어로 옮긴다', () => {
    const r = recordAttempt(ids, { cleared: ['a'], later: ['b'] }, 'b', true).round;
    expect(r).toEqual({ cleared: ['a', 'b'], later: [] });
  });

  it('이미 클리어한 글자를 다시 쓰다 틀려도 클리어는 그대로', () => {
    const r = recordAttempt(ids, { cleared: ['a'], later: [] }, 'a', false).round;
    expect(r).toEqual({ cleared: ['a'], later: [] });
  });

  it('모든 글자를 클리어하면 회차 완료, 새 회차는 비어 있다', () => {
    const res = recordAttempt(ids, { cleared: ['a', 'b', 'c'], later: [] }, 'd', true);
    expect(res.complete).toBe(true);
    expect(res.round).toEqual(emptyRound());
  });
});

describe('저장 데이터 읽기', () => {
  it('깨진 값은 빈 값으로', () => {
    expect(readData(null)).toEqual({ rounds: {}, clears: {} });
    expect(readData({ rounds: { digit: { cleared: ['1', 2], later: 'x' } }, clears: { digit: 2, x: -1 }, lastCategory: 'digit' })).toEqual({
      rounds: { digit: { cleared: ['1'], later: [] } },
      clears: { digit: 2 },
      lastCategory: 'digit',
    });
  });
});

describe('과목 설정 (명세 14-4)', () => {
  it('4개, key와 기본값이 한글쓰기 앱과 같다', () => {
    const d = Object.fromEntries(SETTINGS_SCHEMA.map((f) => [f.key, f.default]));
    expect(d).toEqual({ difficulty: 'easy', freeHint: 'outline', autoDemo: true, numberReading: 'sino' });
    for (const f of SETTINGS_SCHEMA) expect(f.help, f.key).toBeTruthy();
  });
});
