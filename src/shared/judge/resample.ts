import type { Point } from '../types';

export function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}

/** 경로의 처음부터 fraction(0~1) 비율 길이까지의 점열 */
export function partialPath(points: Point[], fraction: number): Point[] {
  if (points.length < 2 || fraction >= 1) return points.slice();
  const target = pathLength(points) * Math.max(0, fraction);
  const out: Point[] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const d = dist(points[i - 1], points[i]);
    if (acc + d >= target) {
      const t = d === 0 ? 0 : (target - acc) / d;
      out.push(lerp(points[i - 1], points[i], t));
      return out;
    }
    acc += d;
    out.push(points[i]);
  }
  return out;
}

/** 경로를 n개의 등간격 점으로 다시 뽑는다 (시작·끝점 유지) */
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0) return [];
  const total = pathLength(points);
  if (total === 0) return Array.from({ length: n }, () => [points[0][0], points[0][1]] as Point);

  const step = total / (n - 1);
  const out: Point[] = [[points[0][0], points[0][1]]];
  let acc = 0;
  let prev = points[0];
  for (let i = 1; i < points.length && out.length < n - 1; ) {
    const cur = points[i];
    const d = dist(prev, cur);
    if (acc + d >= step && d > 0) {
      const p = lerp(prev, cur, (step - acc) / d);
      out.push(p);
      prev = p; // 새 점에서 다시 잰다
      acc = 0;
    } else {
      acc += d;
      prev = cur;
      i++;
    }
  }
  const last = points[points.length - 1];
  while (out.length < n) out.push([last[0], last[1]]);
  return out;
}

/** 부호 있는 면적 (화면 좌표: 양수 = 시계 방향) */
export function signedArea(points: Point[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
