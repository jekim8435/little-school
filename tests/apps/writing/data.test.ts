import { describe, expect, it } from 'vitest';
import { getAllSources, getGlyphs, loadGlyph } from '../../../src/apps/writing/data/glyphs';
import { GROUPS } from '../../../src/apps/writing/data/groups';
import { samplePath } from '../../../src/apps/writing/data/svgPath';

describe('글자 그룹', () => {
  it('7개 그룹, 전체 102자', () => {
    expect(GROUPS).toHaveLength(7);
    expect(GROUPS.reduce((n, g) => n + g.chars.length, 0)).toBe(102);
  });
});

describe('획 데이터 스키마', () => {
  const sources = getAllSources();

  it('M1 샘플 5자가 있다', () => {
    expect(sources.map((s) => s.id).sort()).toEqual(expect.arrayContaining(['ㄱ', 'ㄹ', 'ㅇ', 'ㅏ', '2']));
  });

  for (const src of sources) {
    it(`${src.id}: 그룹에 속하고 점이 0~100 안에 있다`, () => {
      const group = GROUPS.find((g) => g.id === src.group);
      expect(group?.chars).toContain(src.id);
      const glyph = loadGlyph(src);
      expect(glyph.strokes.length).toBeGreaterThan(0);
      for (const s of glyph.strokes) {
        for (const [x, y] of s.points) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(100);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(100);
        }
      }
      for (const order of glyph.alternateOrders) {
        expect([...order].sort((a, b) => a - b)).toEqual(glyph.strokes.map((_, i) => i));
      }
    });
  }
});

describe('전체 102자 데이터', () => {
  it('모든 그룹의 모든 글자에 데이터가 있다', () => {
    for (const g of GROUPS) {
      expect(getGlyphs(g.id).map((gl) => gl.id), g.name).toEqual(g.chars);
    }
  });

  it('글자 id가 겹치지 않는다', () => {
    const ids = getAllSources().map((s) => `${s.group}:${s.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('§10.2 획 수 표와 같다', () => {
    const table: Record<string, number> = {
      ㄱ: 1, ㄴ: 1, ㄷ: 2, ㄹ: 3, ㅁ: 3, ㅂ: 4, ㅅ: 2, ㅇ: 1, ㅈ: 2, ㅊ: 3, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 3,
      ㄲ: 2, ㄸ: 4, ㅃ: 8, ㅆ: 4, ㅉ: 4,
      ㅏ: 2, ㅑ: 3, ㅐ: 3, ㅒ: 4, ㅘ: 4, ㅙ: 5, ㅢ: 2,
    };
    for (const src of getAllSources()) {
      if (src.id in table) expect(src.strokes.length, src.id).toBe(table[src.id]);
    }
  });

  it('한글은 ko-KR, 영문자는 en-US로 읽는다', () => {
    for (const src of getAllSources()) {
      expect(src.lang, src.id).toBe(src.group === 'lower' || src.group === 'upper' ? 'en-US' : 'ko-KR');
    }
  });
});

describe('SVG 경로 샘플링', () => {
  it('직선은 꼭짓점만 남긴다', () => {
    expect(samplePath('M 10 10 L 90 10 V 50 H 20')).toEqual([
      [10, 10],
      [90, 10],
      [90, 50],
      [20, 50],
    ]);
  });

  it('곡선은 여러 점으로 나누고 끝점에 도달한다', () => {
    const pts = samplePath('M 0 0 C 0 50 50 100 100 100');
    expect(pts.length).toBeGreaterThan(10);
    expect(pts[pts.length - 1]).toEqual([100, 100]);
  });

  it('Z는 시작점으로 돌아온다', () => {
    const pts = samplePath('M 10 10 L 90 10 L 50 90 Z');
    expect(pts[pts.length - 1]).toEqual([10, 10]);
  });
});
