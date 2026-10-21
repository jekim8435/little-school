import type { GlyphSource, Point, StrokeSource } from '../../src/apps/writing/data/types';
import { resample } from '../../src/shared/judge/resample';

/** 좌표를 소수 첫째 자리까지로 정리 */
export function roundPoint([x, y]: Point): Point {
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/** 손으로 그은 점열을 편집하기 좋은 획으로: 등간격으로 고른 뒤 거의 일직선인 점을 뺀다 */
export function simplifyDrawn(points: Point[]): Point[] {
  if (points.length < 2) return points.map(roundPoint);
  const even = resample(points, 32);
  return rdp(even, 0.9).map(roundPoint);
}

/** SVG 경로를 샘플링한 촘촘한 점열을 편집할 만한 개수로 줄인다 */
export function simplifySampled(points: Point[]): Point[] {
  return rdp(points, 0.35).map(roundPoint);
}

/** Ramer–Douglas–Peucker 단순화 */
function rdp(points: Point[], eps: number): Point[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let maxD = -1;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = segDist(points[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [a, b];
  return [...rdp(points.slice(0, idx + 1), eps).slice(0, -1), ...rdp(points.slice(idx), eps)];
}

export function segDist(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** 그룹 JSON을 저장소 파일과 같은 모양(획 한 줄씩)으로 만든다 */
export function formatGroupJson(glyphs: GlyphSource[]): string {
  const q = JSON.stringify;
  const stroke = (s: StrokeSource) => {
    const parts: string[] = [];
    if (s.path) parts.push(`"path": ${q(s.path)}`);
    else parts.push(`"points": [${(s.points ?? []).map((p) => `[${p[0]}, ${p[1]}]`).join(', ')}]`);
    if (s.type) parts.push(`"type": ${q(s.type)}`);
    return `      { ${parts.join(', ')} }`;
  };
  const glyph = (g: GlyphSource) =>
    [
      '  {',
      `    "id": ${q(g.id)}, "group": ${q(g.group)}, "name": ${q(g.name)}, "speak": ${q(g.speak)}, ` +
        (g.speakNative ? `"speakNative": ${q(g.speakNative)}, ` : '') +
        `"lang": ${q(g.lang)},`,
      '    "strokes": [',
      g.strokes.map(stroke).join(',\n'),
      '    ],',
      `    "alternateOrders": ${q(g.alternateOrders ?? [])}`,
      '  }',
    ].join('\n');
  return `[\n${glyphs.map(glyph).join(',\n')}\n]\n`;
}
