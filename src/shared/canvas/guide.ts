import type { Glyph, Point, Stroke } from '../types';
import { isClosed } from '../judge/matchStroke';
import { dist, partialPath, pathLength } from '../judge/resample';

/** 가이드 색과 크기 (크기는 0~100 좌표 단위) */
export const GUIDE = {
  band: '#F8C9C9',
  bandCurrent: '#F4AFAF',
  bandFuture: '#FCE6E6',
  bandDone: '#FBE9E9',
  outline: '#ECE7E0',
  numberFill: '#E5484D',
  demoInk: '#E5484D',
  bandWidth: 13,
  dashWidth: 1,
  dash: [2.6, 2.2],
  arrowLength: 5,
  arrowHalfWidth: 3.6,
  numberRadius: 4.4,
  demoWidth: 5,
};

export interface DemoFrame {
  /** 애니메이션할 획 번호 목록 */
  queue: number[];
  /** queue 안에서 지금 그리는 위치 */
  active: number;
  /** 현재 획의 진행 비율 0~1 */
  fraction: number;
}

export interface GuideState {
  /** guide: §5.1 스타일, outline: 연한 회색 윤곽만, none: 아무것도 없음 */
  style: 'guide' | 'outline' | 'none';
  /** 지금 써야 할 획 번호. -1이면 강조 없이 모두 같은 색 (미리보기용) */
  current: number;
  done: boolean[];
  demo: DemoFrame | null;
}

export function initialGuideState(glyph: Glyph, style: GuideState['style'] = 'guide'): GuideState {
  return { style, current: 0, done: glyph.strokes.map(() => false), demo: null };
}

/**
 * 글자 가이드를 그린다. now(ms)는 현재 획 번호 원의 깜빡임에 쓴다.
 * ctx는 이미 CSS 픽셀 기준으로 맞춰져 있고 size는 한 변의 CSS 픽셀 크기다.
 */
export function drawGuide(
  ctx: CanvasRenderingContext2D,
  size: number,
  glyph: Glyph,
  state: GuideState,
  now = 0,
): void {
  if (state.style === 'none') return;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (state.style === 'outline') {
    for (const s of glyph.strokes) drawBand(ctx, s, GUIDE.outline);
    ctx.restore();
    return;
  }

  const demo = state.demo;
  const strokes = glyph.strokes;
  const isDone = (i: number) => state.done[i];
  const bandColor = (i: number) => {
    if (demo) return GUIDE.band;
    if (state.current < 0) return GUIDE.band;
    if (isDone(i)) return GUIDE.bandDone;
    if (i === state.current) return GUIDE.bandCurrent;
    return GUIDE.bandFuture;
  };

  // 1) 넓은 띠: 앞으로 쓸 획 → 완료한 획 → 현재 획 순서로 겹쳐서 현재 획이 위에 오게
  const order = strokes.map((_, i) => i).sort((a, b) => rank(a) - rank(b));
  function rank(i: number) {
    if (i === state.current && !demo) return 2;
    return isDone(i) ? 1 : 0;
  }
  for (const i of order) drawBand(ctx, strokes[i], bandColor(i));

  // 2) 점선 중심선 + 화살표 (완료한 획은 생략)
  for (const i of order) {
    if (isDone(i) && !demo) continue;
    drawCenterline(ctx, strokes[i]);
  }

  // 3) 애니메이션 중이면 지금까지 그린 부분을 진하게 덮는다
  if (demo) {
    for (let q = 0; q <= demo.active && q < demo.queue.length; q++) {
      const s = strokes[demo.queue[q]];
      const frac = q < demo.active ? 1 : demo.fraction;
      drawDemoInk(ctx, s, frac, q === demo.active);
    }
  }

  // 4) 번호 원
  const placed: Point[] = [];
  strokes.forEach((s, i) => {
    const pos = numberPosition(s, placed);
    placed.push(pos);
    if (isDone(i) && !demo) return;
    let scale = 1;
    let alpha = 1;
    if (!demo && state.current >= 0) {
      if (i === state.current) {
        const t = (now % 1000) / 1000;
        scale = 1 + 0.14 * Math.sin(t * Math.PI * 2);
      } else {
        alpha = 0.55; // 아직 차례가 아닌 획
      }
    }
    drawNumber(ctx, pos, i + 1, scale, alpha);
  });

  ctx.restore();
}

function drawBand(ctx: CanvasRenderingContext2D, s: Stroke, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = GUIDE.bandWidth;
  if (s.type === 'dot' || s.points.length === 1) {
    ctx.beginPath();
    ctx.arc(s.points[0][0], s.points[0][1], GUIDE.bandWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  polyline(ctx, s.points);
  ctx.stroke();
}

function drawCenterline(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.type === 'dot' || stroke.points.length < 2) return;
  let s = stroke;
  if (isClosed(stroke)) {
    // 닫힌 획은 화살표가 시작 번호 원과 겹치지 않게 조금 앞에서 끝낸다
    const total = pathLength(stroke.points);
    s = { points: partialPath(stroke.points, (total - GUIDE.numberRadius * 3.2) / total) };
  }
  const len = pathLength(s.points);
  // 화살촉 자리를 남기고 점선을 긋는다
  const body = partialPath(s.points, Math.max(0, (len - GUIDE.arrowLength * 0.8) / len));
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = GUIDE.dashWidth;
  ctx.setLineDash(GUIDE.dash);
  ctx.lineCap = 'butt';
  polyline(ctx, body);
  ctx.stroke();
  ctx.restore();

  const tip = s.points[s.points.length - 1];
  const back = pointBack(s.points, GUIDE.arrowLength);
  drawArrowHead(ctx, back, tip);
}

function drawArrowHead(ctx: CanvasRenderingContext2D, from: Point, tip: Point): void {
  const d = dist(from, tip) || 1;
  const ux = (tip[0] - from[0]) / d, uy = (tip[1] - from[1]) / d;
  // 화살촉 끝을 띠 끝(둥근 끝 포함) 안쪽에 둔다
  const tx = tip[0] + ux * (GUIDE.bandWidth * 0.3), ty = tip[1] + uy * (GUIDE.bandWidth * 0.3);
  const bx = tx - ux * GUIDE.arrowLength, by = ty - uy * GUIDE.arrowLength;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(bx - uy * GUIDE.arrowHalfWidth, by + ux * GUIDE.arrowHalfWidth);
  ctx.lineTo(bx + uy * GUIDE.arrowHalfWidth, by - ux * GUIDE.arrowHalfWidth);
  ctx.closePath();
  ctx.fill();
}

function drawDemoInk(ctx: CanvasRenderingContext2D, s: Stroke, fraction: number, active: boolean): void {
  ctx.strokeStyle = GUIDE.demoInk;
  ctx.fillStyle = GUIDE.demoInk;
  ctx.lineWidth = GUIDE.demoWidth;
  if (s.type === 'dot' || s.points.length === 1) {
    if (fraction <= 0) return;
    ctx.beginPath();
    ctx.arc(s.points[0][0], s.points[0][1], (GUIDE.demoWidth / 2) * 1.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const part = partialPath(s.points, fraction);
  polyline(ctx, part);
  ctx.stroke();
  if (active && fraction < 1) {
    // 펜 끝
    const p = part[part.length - 1];
    ctx.beginPath();
    ctx.arc(p[0], p[1], GUIDE.demoWidth * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNumber(ctx: CanvasRenderingContext2D, p: Point, n: number, scale: number, alpha: number): void {
  const r = GUIDE.numberRadius * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = GUIDE.numberFill;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${r * 1.25}px -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), p[0], p[1] + r * 0.06);
  ctx.restore();
}

/** 번호 원 위치: 획 시작점. 앞 번호와 겹치면 자기 획을 따라 조금 앞으로 옮겨 띠 위에 둔다 */
function numberPosition(s: Stroke, placed: Point[]): Point {
  const minGap = GUIDE.numberRadius * 2.1;
  let pos = s.points[0];
  for (let k = 1; k <= 4 && placed.some((p) => dist(p, pos) < minGap); k++) {
    pos = pointAhead(s.points, minGap * k * 0.75);
  }
  return pos;
}

/** 경로 끝에서 거꾸로 len만큼 떨어진 점 */
function pointBack(points: Point[], len: number): Point {
  const total = pathLength(points);
  const part = partialPath(points, Math.max(0, (total - len) / total));
  return part[part.length - 1];
}

/** 경로 시작에서 len만큼 나아간 점 */
function pointAhead(points: Point[], len: number): Point {
  const total = pathLength(points) || 1;
  const part = partialPath(points, Math.min(1, len / total));
  return part[part.length - 1];
}

function polyline(ctx: CanvasRenderingContext2D, pts: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}
