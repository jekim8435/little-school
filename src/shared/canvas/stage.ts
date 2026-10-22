import type { Point } from '../types';
import { observeResize } from '../../ui/compat';
import { attachInput, type InputHandlers, type InputPoint } from '../../ui/input';

/** 입력 등록 함수 (과목에서는 ctx.input.attach를 넘긴다 — 손바닥 무시·펜으로만 사용하기 적용) */
export type AttachFn = (el: HTMLElement, h: InputHandlers, opts?: { canvas?: boolean }) => () => void;

/** 펜 굵기: 캔버스 한 변의 4% */
export const PEN_WIDTH_RATIO = 0.04;
export const INK_COLOR = '#222222';
export const ERROR_COLOR = '#E5484D';
/** 틀린 획이 흐려지며 사라지는 시간 */
const FLASH_FADE = 180;

export interface InkStroke {
  points: Point[];
  color: string;
}

export type GuideRenderer = (ctx: CanvasRenderingContext2D, size: number) => void;

/**
 * 정사각형 쓰기 영역. 가이드 레이어 위에 잉크 레이어를 겹친다.
 * 모든 획은 0~100 정규화 좌표로 보관하므로 크기가 바뀌어도 그대로 다시 그린다.
 */
export class WritingStage {
  readonly el: HTMLDivElement;
  private guideCanvas: HTMLCanvasElement;
  private inkCanvas: HTMLCanvasElement;
  private guideCtx: CanvasRenderingContext2D;
  private inkCtx: CanvasRenderingContext2D;
  private size = 0;
  private dpr = 1;

  private strokes: InkStroke[] = [];
  /** 잠깐 보였다 사라지는 획 (틀린 획) */
  private flashes: { points: Point[]; color: string; start: number; hold: number }[] = [];
  private current: Point[] | null = null;
  private activePointer: number | null = null;
  private frame = 0;
  private stopObserving: () => void;
  private detachInput: () => void;
  private guideRenderer: GuideRenderer = drawPracticeGrid;

  /** 손을 뗐을 때 호출. 기본 동작은 검정 펜으로 남기기 */
  onStrokeEnd: (points: Point[]) => void = (points) => this.addStroke(points);
  /** 그리기 입력을 받을지 여부 */
  enabled = true;

  constructor(attach: AttachFn = attachInput) {
    this.el = document.createElement('div');
    this.el.className = 'stage';
    this.guideCanvas = document.createElement('canvas');
    this.inkCanvas = document.createElement('canvas');
    this.guideCanvas.className = 'stage-layer';
    this.inkCanvas.className = 'stage-layer stage-ink';
    this.el.append(this.guideCanvas, this.inkCanvas);
    this.guideCtx = this.guideCanvas.getContext('2d')!;
    this.inkCtx = this.inkCanvas.getContext('2d')!;

    const ink = this.inkCanvas;
    this.detachInput = attach(ink, {
      down: this.onDown,
      move: this.onMove,
      up: this.onUp,
      cancel: this.onCancel,
    }, { canvas: true });
    ink.addEventListener('contextmenu', (e) => e.preventDefault());

    this.stopObserving = observeResize(this.el, () => this.resize());
  }

  destroy(): void {
    this.detachInput();
    this.stopObserving();
    cancelAnimationFrame(this.frame);
  }

  setGuideRenderer(r: GuideRenderer): void {
    this.guideRenderer = r;
    this.renderGuide();
  }

  addStroke(points: Point[], color = INK_COLOR): void {
    this.strokes.push({ points, color });
    this.renderInk();
  }

  getStrokes(): InkStroke[] {
    return this.strokes;
  }

  setStrokeColor(index: number, color: string): void {
    const s = this.strokes[index];
    if (!s) return;
    s.color = color;
    this.renderInk();
  }

  /** 오답 검토: 가이드 레이어를 잉크 위로 올려 정답을 겹쳐 보여준다 */
  setGuideOnTop(on: boolean): void {
    this.el.classList.toggle('is-review', on);
  }

  /** 획을 hold ms 동안 color로 보여준 뒤 흐려지며 사라지게 한다 */
  flashStroke(points: Point[], color: string, hold = 400): void {
    this.flashes.push({ points, color, start: performance.now(), hold });
    this.scheduleInk();
  }

  undo(): void {
    this.strokes.pop();
    this.renderInk();
  }

  clear(): void {
    this.strokes = [];
    this.flashes = [];
    this.current = null;
    this.activePointer = null;
    this.renderInk();
  }

  // ── 크기 ──────────────────────────────────────────────

  private resize(): void {
    const size = this.el.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    if (size === this.size && dpr === this.dpr) return;
    this.size = size;
    this.dpr = dpr;
    for (const c of [this.guideCanvas, this.inkCanvas]) {
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
    }
    this.renderGuide();
    this.renderInk();
  }

  // ── 렌더링 ────────────────────────────────────────────

  renderGuide(): void {
    const ctx = this.guideCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.guideCanvas.width, this.guideCanvas.height);
    if (!this.size) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.guideRenderer(ctx, this.size);
  }

  private renderInk(): void {
    const ctx = this.inkCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.inkCanvas.width, this.inkCanvas.height);
    if (!this.size) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const width = this.size * PEN_WIDTH_RATIO;
    for (const s of this.strokes) drawSmoothStroke(ctx, s.points, this.size, width, s.color);
    this.renderFlashes(ctx, width);
    if (this.current) drawSmoothStroke(ctx, this.current, this.size, width, INK_COLOR);
  }

  private renderFlashes(ctx: CanvasRenderingContext2D, width: number): void {
    if (!this.flashes.length) return;
    const now = performance.now();
    this.flashes = this.flashes.filter((f) => now - f.start < f.hold + FLASH_FADE);
    for (const f of this.flashes) {
      const t = now - f.start - f.hold;
      ctx.globalAlpha = t <= 0 ? 1 : 1 - t / FLASH_FADE;
      drawSmoothStroke(ctx, f.points, this.size, width, f.color);
    }
    ctx.globalAlpha = 1;
    if (this.flashes.length) this.scheduleInk();
  }

  private scheduleInk(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderInk();
    });
  }

  // ── 손가락·마우스 입력 (ui/input.ts가 Pointer/Touch 차이를 감춘다) ──

  private toPoint(p: InputPoint): Point {
    const r = this.inkCanvas.getBoundingClientRect();
    return [((p.x - r.left) / r.width) * 100, ((p.y - r.top) / r.height) * 100];
  }

  private onDown = (id: number, p: InputPoint): boolean => {
    // 첫 번째 손가락만 쓰고, 그리는 중에 들어온 두 번째 손가락은 버린다
    if (!this.enabled || this.activePointer !== null) return false;
    if (this.inkCanvas.getBoundingClientRect().width === 0) return false; // 아직 크기가 정해지지 않음
    this.activePointer = id;
    this.current = [this.toPoint(p)];
    this.scheduleInk();
    return true;
  };

  private onMove = (id: number, points: InputPoint[]): void => {
    if (id !== this.activePointer || !this.current) return;
    for (const p of points) this.current.push(this.toPoint(p));
    this.scheduleInk();
  };

  private onUp = (id: number): void => {
    if (id !== this.activePointer || !this.current) return;
    const points = this.current;
    this.current = null;
    this.activePointer = null;
    this.renderInk();
    this.onStrokeEnd(points);
  };

  private onCancel = (id: number): void => {
    if (id !== this.activePointer) return;
    this.current = null;
    this.activePointer = null;
    this.renderInk();
  };
}

/** 점열을 2차 베지어(중점 연결)로 부드럽게 그린다 */
export function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  size: number,
  width: number,
  color: string,
): void {
  if (points.length === 0) return;
  const k = size / 100;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0] * k, points[0][1] * k, width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0] * k, points[0][1] * k);
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    ctx.quadraticCurveTo(x * k, y * k, ((x + nx) / 2) * k, ((y + ny) / 2) * k);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last[0] * k, last[1] * k);
  ctx.stroke();
}

/** 템플릿 획처럼 꼭짓점이 드문 점열은 모서리를 살려 직선으로 잇는다 */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  size: number,
  width: number,
  color: string,
): void {
  if (points.length === 0) return;
  const k = size / 100;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0] * k, points[0][1] * k);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x * k, y * k);
  if (points.length === 1) ctx.lineTo(points[0][0] * k, points[0][1] * k);
  ctx.stroke();
}

/** 기본 가이드: 테두리 + 점선 십자 (깍두기 공책 느낌) */
export function drawPracticeGrid(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.save();
  ctx.strokeStyle = '#e6d9c6';
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.setLineDash([size * 0.02, size * 0.02]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  ctx.restore();
}
