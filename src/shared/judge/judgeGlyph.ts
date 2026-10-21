import type { Glyph, Point } from '../types';
import type { Tolerance } from './config';
import { isAccidental, judgeStroke, type FailReason } from './matchStroke';

export interface GlyphResult {
  ok: boolean;
  /**
   * 처음으로 틀린 사용자 획 번호 (0부터, 넘겨받은 userStrokes 기준).
   * 획 수가 모자라면 userStrokes.length (가리킬 획이 없음)
   */
  failedIndex?: number;
  reason?: FailReason | 'count';
}

/** 실수 터치가 아닌 획의 번호. 점 획이 있는 글자는 짧은 획도 남긴다 */
export function keptStrokeIndices(userStrokes: Point[][], glyph: Glyph): number[] {
  const hasDot = glyph.strokes.some((s) => s.type === 'dot');
  return userStrokes.map((_, i) => i).filter((i) => !isAccidental(userStrokes[i], hasDot));
}

/** 혼자 쓰기 전체 판정 (§7.4). alternateOrders에 있는 획순도 허용한다 */
export function judgeGlyph(userStrokes: Point[][], glyph: Glyph, tol: Tolerance): GlyphResult {
  const kept = keptStrokeIndices(userStrokes, glyph);
  const r = judgeKept(
    kept.map((i) => userStrokes[i]),
    glyph,
    tol,
  );
  if (r.failedIndex === undefined) return r;
  return { ...r, failedIndex: kept[r.failedIndex] ?? userStrokes.length };
}

function judgeKept(user: Point[][], glyph: Glyph, tol: Tolerance): GlyphResult {
  if (user.length !== glyph.strokes.length) {
    return { ok: false, reason: 'count', failedIndex: Math.min(user.length, glyph.strokes.length) };
  }

  const identity = glyph.strokes.map((_, i) => i);
  let best: GlyphResult | null = null;
  for (const order of [identity, ...glyph.alternateOrders]) {
    const r = judgeInOrder(user, glyph, order, tol);
    if (r.ok) return r;
    // 가장 멀리까지 맞은 획순의 실패를 알려준다 (같으면 기본 획순 우선)
    if (!best || r.failedIndex! > best.failedIndex!) best = r;
  }
  return best!;
}

function judgeInOrder(user: Point[][], glyph: Glyph, order: number[], tol: Tolerance): GlyphResult {
  for (let i = 0; i < order.length; i++) {
    const r = judgeStroke(user[i], glyph.strokes, order[i], tol, order.slice(i + 1));
    if (!r.ok) return { ok: false, failedIndex: i, reason: r.reason };
  }
  return { ok: true };
}
