import { describe, expect, it } from 'vitest';
import { getGlyph, getGlyphs, loadGlyph } from '../../../src/apps/writing/data/glyphs';
import type { Glyph, GroupId, Point } from '../../../src/apps/writing/data/types';
import { TOLERANCES } from '../../../src/shared/judge/config';
import { judgeGlyph } from '../../../src/shared/judge/judgeGlyph';
import { isAccidental, isClosed, judgeStroke, matchStroke } from '../../../src/shared/judge/matchStroke';
import { dist, pathLength, resample } from '../../../src/shared/judge/resample';

const easy = TOLERANCES.easy;

const SAMPLES: [GroupId, string][] = [
  ['consonant', 'ㄱ'],
  ['consonant', 'ㄹ'],
  ['consonant', 'ㅇ'],
  ['vowel', 'ㅏ'],
  ['digit', '2'],
];

function glyph(group: GroupId, id: string): Glyph {
  const g = getGlyph(group, id);
  if (!g) throw new Error(`데이터 없음: ${id}`);
  return g;
}

/** 결정적 의사 난수 (테스트가 매번 같게) */
function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/** 사람이 그은 것처럼: 촘촘하게 나누고, 살짝 흔들고, 조금 비켜 쓴다 */
function humanize(points: Point[], { jitter = 1.5, dx = 0, dy = 0, seed = 1 } = {}): Point[] {
  const r = rng(seed);
  return resample(points, 60).map(([x, y]) => [x + dx + (r() - 0.5) * 2 * jitter, y + dy + (r() - 0.5) * 2 * jitter]);
}

const reverse = (p: Point[]) => [...p].reverse();

describe('resample', () => {
  it('N개의 등간격 점을 만들고 시작·끝점을 지킨다', () => {
    const pts = resample([[0, 0], [100, 0], [100, 50]], 32);
    expect(pts).toHaveLength(32);
    expect(pts[0]).toEqual([0, 0]);
    expect(dist(pts[31], [100, 50])).toBeLessThan(1e-6);
    // 직선에서는 이웃한 점 간격이 모두 같다 (꺾인 곳은 경로 길이로 같으므로 직선 거리는 짧아진다)
    const line = resample([[0, 0], [30, 0], [93, 0]], 32);
    for (let i = 1; i < line.length; i++) expect(dist(line[i - 1], line[i])).toBeCloseTo(3, 5);
  });

  it('길이 0인 획도 처리한다', () => {
    expect(resample([[5, 5]], 32)).toHaveLength(32);
  });
});

describe('짧은 획 무시', () => {
  it('길이 3 미만은 실수 터치, dot 획을 기대하면 받는다', () => {
    expect(isAccidental([[10, 10], [11, 11]])).toBe(true);
    expect(isAccidental([[10, 10], [11, 11]], true)).toBe(false);
    expect(isAccidental([[10, 10], [20, 10]])).toBe(false);
  });
});

describe('단일 획 판정 — 샘플 5자', () => {
  for (const [group, id] of SAMPLES) {
    const g = glyph(group, id);
    g.strokes.forEach((s, i) => {
      const label = `${id} ${i + 1}번 획`;

      it(`${label}: 정방향은 통과`, () => {
        for (const seed of [1, 2, 3]) {
          const user = humanize(s.points, { seed, dx: 4, dy: -3 });
          expect(matchStroke(user, s, easy)).toMatchObject({ ok: true });
        }
      });

      it(`${label}: 역방향은 direction 실패`, () => {
        expect(matchStroke(humanize(reverse(s.points)), s, easy)).toMatchObject({ ok: false, reason: 'direction' });
      });

      it(`${label}: 엉뚱한 위치는 position 실패`, () => {
        const far = s.points.map(([x, y]) => [x > 50 ? x - 45 : x + 45, y] as Point);
        expect(matchStroke(humanize(far), s, easy)).toMatchObject({ ok: false });
        // 같은 획을 크게 옮기면 시작점이 어긋난다
        const shifted = humanize(s.points, { dx: 30, dy: 30 });
        expect(matchStroke(shifted, s, easy)).toMatchObject({ ok: false, reason: 'position' });
      });
    });
  }

  it('ㅇ은 닫힌 획으로 보고, 반대 회전은 direction 실패', () => {
    const o = glyph('consonant', 'ㅇ');
    expect(isClosed(o.strokes[0])).toBe(true);
    // 시작점은 같고 시계 방향으로 도는 원
    const cw: Point[] = Array.from({ length: 40 }, (_, k) => {
      const a = -Math.PI / 2 + (k / 39) * Math.PI * 2;
      return [50 + 34 * Math.cos(a), 50 + 34 * Math.sin(a)];
    });
    expect(matchStroke(cw, o.strokes[0], easy)).toMatchObject({ ok: false, reason: 'direction' });
    expect(matchStroke(reverse(cw), o.strokes[0], easy)).toMatchObject({ ok: true });
  });

  it('ㄱ의 시작·끝만 맞춘 대각선은 shape 실패', () => {
    const g = glyph('consonant', 'ㄱ');
    const diag: Point[] = [[20, 18], [80, 86]];
    expect(matchStroke(humanize(diag), g.strokes[0], easy)).toMatchObject({ ok: false, reason: 'shape' });
  });

  it('직선 획(ㄹ의 가운데)의 방향을 반대로 그으면 direction 실패', () => {
    const r = glyph('consonant', 'ㄹ');
    expect(matchStroke([[82, 48], [18, 48]], r.strokes[1], easy)).toMatchObject({ ok: false, reason: 'direction' });
  });
});

describe('전체 102자 자기 판정', () => {
  const all = (['digit', 'lower', 'upper', 'consonant', 'double', 'vowel', 'complex'] as GroupId[]).flatMap((g) =>
    getGlyphs(g),
  );

  it('102자 모두 있다', () => expect(all).toHaveLength(102));

  for (const g of all) {
    it(`${g.id}: 바르게 쓰면 쉬움·보통에서 통과, 획을 거꾸로 그으면 실패`, () => {
      for (const tol of [TOLERANCES.easy, TOLERANCES.normal]) {
        const user = g.strokes.map((s, i) => humanize(s.points, { seed: i + 7, dx: 2, dy: -2, jitter: 1 }));
        expect(judgeGlyph(user, g, tol)).toEqual({ ok: true });
      }
      g.strokes.forEach((s, i) => {
        if (s.type === 'dot') return;
        expect(matchStroke(humanize(reverse(s.points)), s, easy).ok, `${g.id} ${i + 1}번 획 역방향`).toBe(false);
      });
    });
  }

  it('8은 두 고리가 반대로 돌아도 정방향은 통과하고 역방향은 실패', () => {
    const eight = glyph('digit', '8');
    expect(isClosed(eight.strokes[0])).toBe(true);
    expect(matchStroke(humanize(eight.strokes[0].points), eight.strokes[0], easy).ok).toBe(true);
    expect(matchStroke(humanize(reverse(eight.strokes[0].points)), eight.strokes[0], easy).ok).toBe(false);
  });
});

describe('순서 오류 (따라 쓰기)', () => {
  it('ㄹ에서 2번 차례에 3번 획을 그으면 order', () => {
    const r = glyph('consonant', 'ㄹ');
    const res = judgeStroke(humanize(r.strokes[2].points), r.strokes, 1, easy);
    expect(res).toMatchObject({ ok: false, reason: 'order' });
  });

  it('ㅏ에서 1번 차례에 2번 획을 그으면 order', () => {
    const a = glyph('vowel', 'ㅏ');
    expect(judgeStroke(humanize(a.strokes[1].points), a.strokes, 0, easy)).toMatchObject({
      ok: false,
      reason: 'order',
    });
  });

  it('맞는 차례의 획은 통과', () => {
    const r = glyph('consonant', 'ㄹ');
    expect(judgeStroke(humanize(r.strokes[1].points), r.strokes, 1, easy)).toMatchObject({ ok: true });
  });
});

describe('난이도', () => {
  it('어려움일수록 덜 너그럽다', () => {
    const g = glyph('consonant', 'ㄱ');
    const sloppy = humanize(g.strokes[0].points, { dx: 12, dy: 0, jitter: 2 });
    expect(matchStroke(sloppy, g.strokes[0], TOLERANCES.easy).ok).toBe(true);
    expect(matchStroke(sloppy, g.strokes[0], TOLERANCES.hard).ok).toBe(false);
  });
});

describe('전체 판정 (혼자 쓰기)', () => {
  const r = glyph('consonant', 'ㄹ');
  const correct = r.strokes.map((s, i) => humanize(s.points, { seed: i + 1 }));

  it('바른 획순은 통과', () => {
    expect(judgeGlyph(correct, r, easy)).toEqual({ ok: true });
  });

  it('실수 터치는 무시하고 판정한다', () => {
    expect(judgeGlyph([correct[0], [[50, 50], [51, 50]], correct[1], correct[2]], r, easy)).toEqual({ ok: true });
  });

  it('획 수가 다르면 count 실패', () => {
    // 모자라면 가리킬 획이 없고, 넘치면 남는 첫 획을 가리킨다
    expect(judgeGlyph(correct.slice(0, 2), r, easy)).toEqual({ ok: false, reason: 'count', failedIndex: 2 });
    expect(judgeGlyph([...correct, correct[2]], r, easy)).toEqual({ ok: false, reason: 'count', failedIndex: 3 });
  });

  it('틀린 획 번호는 실수 터치를 포함한 원래 번호로 알려준다', () => {
    const tap: Point[] = [[50, 50], [51, 50]];
    expect(judgeGlyph([tap, correct[0], reverse(correct[1]), correct[2]], r, easy)).toEqual({
      ok: false,
      failedIndex: 2,
      reason: 'direction',
    });
  });

  it('2·3번 순서를 바꾸면 2번째 획에서 order 실패', () => {
    expect(judgeGlyph([correct[0], correct[2], correct[1]], r, easy)).toEqual({
      ok: false,
      failedIndex: 1,
      reason: 'order',
    });
  });

  it('처음 틀린 획의 번호와 원인을 알려준다', () => {
    expect(judgeGlyph([correct[0], reverse(correct[1]), correct[2]], r, easy)).toEqual({
      ok: false,
      failedIndex: 1,
      reason: 'direction',
    });
  });

  it('alternateOrders에 있는 획순은 허용한다', () => {
    const alt = loadGlyph({ ...rawOf('ㄹ'), alternateOrders: [[0, 2, 1]] });
    expect(judgeGlyph([correct[0], correct[2], correct[1]], alt, easy)).toEqual({ ok: true });
  });

  it('dot 획은 짧아도 받는다', () => {
    const i = loadGlyph({
      id: 'i',
      group: 'lower',
      name: 'i',
      speak: 'i',
      lang: 'en-US',
      strokes: [{ points: [[50, 40], [50, 85]] }, { points: [[50, 20]], type: 'dot' }],
    });
    const user: Point[][] = [humanize(i.strokes[0].points), [[51, 21], [52, 21]]];
    expect(pathLength(user[1])).toBeLessThan(3);
    expect(judgeGlyph(user, i, easy)).toEqual({ ok: true });
    expect(judgeGlyph([user[0], [[80, 80]]], i, easy)).toMatchObject({ ok: false, failedIndex: 1, reason: 'position' });
  });
});

function rawOf(id: string) {
  const g = glyph('consonant', id);
  return { ...g, strokes: g.strokes.map((s) => ({ points: s.points })) };
}
