import { describe, expect, it } from 'vitest';
import { getSources } from '../../../src/apps/writing/data/glyphs';
import { GROUPS } from '../../../src/apps/writing/data/groups';
import { formatGroupJson, simplifyDrawn } from '../../../tools/dev/format';
import type { Point } from '../../../src/apps/writing/data/types';

describe('편집기 JSON 내보내기', () => {
  for (const g of GROUPS) {
    it(`${g.id}: 내보낸 JSON을 다시 읽으면 원본과 같다`, () => {
      const src = getSources(g.id);
      expect(JSON.parse(formatGroupJson(src))).toEqual(src);
    });
  }
});

describe('그려서 만든 획 단순화', () => {
  it('직선은 양 끝점만 남는다', () => {
    const line: Point[] = Array.from({ length: 50 }, (_, i) => [10 + i, 20 + i * 0.5]);
    expect(simplifyDrawn(line)).toEqual([
      [10, 20],
      [59, 44.5],
    ]);
  });

  it('꺾인 선은 꺾인 점을 남긴다', () => {
    const corner: Point[] = [
      ...Array.from({ length: 30 }, (_, i) => [20 + i * 2, 20] as Point),
      ...Array.from({ length: 30 }, (_, i) => [80, 20 + i * 2] as Point),
    ];
    const out = simplifyDrawn(corner);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.length).toBeLessThanOrEqual(4);
    expect(out[0]).toEqual([20, 20]);
    expect(out[out.length - 1]).toEqual([80, 78]);
  });
});
