import type { Point, Stroke } from '../types';
import {
  CLOSED_STROKE_MAX_GAP,
  DIRECTION_MIN_COS,
  MIN_LOOP_RATIO,
  MIN_STROKE_LENGTH,
  RESAMPLE_N,
  type Tolerance,
} from './config';
import { dist, pathLength, resample, signedArea } from './resample';

/** 판정 실패 원인. §5.2의 보조 문구를 고르는 데 쓴다 */
export type FailReason = 'order' | 'direction' | 'shape' | 'position';

export interface StrokeResult {
  ok: boolean;
  reason?: FailReason;
  /** 대응점 평균 거리 (작을수록 비슷함) */
  shapeDist: number;
}

/** 실수로 친 터치처럼 너무 짧은 획인지 (dot 획을 기대할 때는 짧아도 받는다) */
export function isAccidental(points: Point[], expectDot = false): boolean {
  return !expectDot && pathLength(points) < MIN_STROKE_LENGTH;
}

export function isClosed(stroke: Stroke): boolean {
  const p = stroke.points;
  return (
    stroke.type !== 'dot' &&
    p.length > 2 &&
    dist(p[0], p[p.length - 1]) <= CLOSED_STROKE_MAX_GAP &&
    pathLength(p) > CLOSED_STROKE_MAX_GAP * 3
  );
}

/** 사용자 획 하나를 템플릿 획 하나와 비교한다 (§7.3) */
export function matchStroke(user: Point[], tmpl: Stroke, tol: Tolerance): StrokeResult {
  if (user.length === 0) return { ok: false, reason: 'position', shapeDist: Infinity };

  const u = resample(user, RESAMPLE_N);
  const t = resample(tmpl.points, RESAMPLE_N);
  const shapeDist = meanDist(u, t);

  // 점 획: 위치만 본다
  if (tmpl.type === 'dot') {
    const ok = dist(centroid(u), centroid(t)) <= tol.startTol;
    return ok ? { ok, shapeDist } : { ok, reason: 'position', shapeDist };
  }

  const uStart = u[0], uEnd = u[u.length - 1];
  const tStart = t[0], tEnd = t[t.length - 1];
  const startOk = dist(uStart, tStart) <= tol.startTol;
  const endOk = dist(uEnd, tEnd) <= tol.endTol;

  if (isClosed(tmpl)) {
    // 닫힌 획은 시작점과 회전 방향으로 판정한다
    if (!startOk) return { ok: false, reason: 'position', shapeDist };
    const tArea = signedArea(t);
    const len = pathLength(t);
    const loopRatio = Math.abs(tArea) / ((len * len) / (4 * Math.PI));
    if (loopRatio >= MIN_LOOP_RATIO && Math.sign(signedArea(u)) !== Math.sign(tArea)) {
      return { ok: false, reason: 'direction', shapeDist };
    }
    if (shapeDist > tol.shapeTol) return { ok: false, reason: 'shape', shapeDist };
    return { ok: true, shapeDist };
  }

  if (!startOk || !endOk) {
    // 반대로 그었다면 끝·시작이 뒤바뀌어 맞는다 → 방향 오류로 안내
    const reversed = dist(uEnd, tStart) <= tol.startTol && dist(uStart, tEnd) <= tol.endTol;
    return { ok: false, reason: reversed ? 'direction' : 'position', shapeDist };
  }
  if (cosine(uStart, uEnd, tStart, tEnd) < DIRECTION_MIN_COS) {
    return { ok: false, reason: 'direction', shapeDist };
  }
  if (shapeDist > tol.shapeTol) return { ok: false, reason: 'shape', shapeDist };
  return { ok: true, shapeDist };
}

/**
 * 따라 쓰기용: expected 번째 획과 비교하고, 틀렸을 때 뒤 순서의 다른 획과 맞으면 순서 오류로 본다.
 */
export function judgeStroke(
  user: Point[],
  strokes: Stroke[],
  expected: number,
  tol: Tolerance,
  /** 순서 오류를 검사할 후보 획 번호 (기본: expected 뒤의 모든 획) */
  candidates: number[] = strokes.map((_, i) => i).filter((i) => i > expected),
): StrokeResult {
  const r = matchStroke(user, strokes[expected], tol);
  if (r.ok) return r;
  for (const j of candidates) {
    const other = matchStroke(user, strokes[j], tol);
    if (other.ok) return { ok: false, reason: 'order', shapeDist: r.shapeDist };
  }
  return r;
}

function meanDist(a: Point[], b: Point[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i]);
  return sum / a.length;
}

function centroid(points: Point[]): Point {
  let x = 0, y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

function cosine(a0: Point, a1: Point, b0: Point, b1: Point): number {
  const ax = a1[0] - a0[0], ay = a1[1] - a0[1];
  const bx = b1[0] - b0[0], by = b1[1] - b0[1];
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la === 0 || lb === 0) return 1; // 길이가 0이면 방향을 판단할 수 없으므로 통과
  return (ax * bx + ay * by) / (la * lb);
}
