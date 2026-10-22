/**
 * 세어 보기 사물 배치 (5-1). 크기 단위는 pt(높이 기준 단위 --u 하나 = 1pt).
 * - 개수에 따라 크기와 격자를 정한다: 1~5개 140pt(3 × 2) · 6~10개 110pt(4 × 3) · 11~20개 84pt(5 × 4) · 21~30개 76pt(6 × 5)
 * - 격자 칸 가운데 일부를 골라 칸 안에서 조금씩 흔든다 → 줄이 딱 맞지 않는 자연스러운 배치, 겹침 없음
 * - 칸은 사물 크기의 1.45배를 넘지 않게 해 넓은 화면(갤럭시)에서도 너무 퍼지지 않고 가운데로 모인다
 */
import { shuffle, type Rng } from '../../../shared/random';

/** 터치 대상 최소 크기 (02 문서 10장) */
export const MIN_TOUCH = 60;
/** 칸 안에서 사물 둘레에 남기는 여백 (이웃 사물과는 그 두 배 이상 떨어짐) */
const CELL_PAD = 6;
const SPREAD = 1.45;

export interface Placed {
  /** 영역 왼쪽 위 기준 사물 왼쪽 위 (pt) */
  x: number;
  y: number;
  size: number;
}

export function gridFor(n: number): { cols: number; rows: number; size: number } {
  if (n <= 5) return { cols: 3, rows: 2, size: 140 };
  if (n <= 10) return { cols: 4, rows: 3, size: 110 };
  if (n <= 20) return { cols: 5, rows: 4, size: 84 };
  return { cols: 6, rows: 5, size: 76 };
}

/** n개(1~30)를 w × h 영역에 놓는다 */
export function scatter(n: number, w: number, h: number, rng: Rng = Math.random): Placed[] {
  const g = gridFor(n);
  const cellW = Math.min(w / g.cols, g.size * SPREAD);
  const cellH = Math.min(h / g.rows, g.size * SPREAD);
  const size = Math.floor(Math.min(g.size, cellW - CELL_PAD * 2, cellH - CELL_PAD * 2));
  const left = (w - cellW * g.cols) / 2;
  const top = (h - cellH * g.rows) / 2;
  const cells: number[] = [];
  for (let i = 0; i < g.cols * g.rows; i++) cells.push(i);
  const jx = cellW - size - CELL_PAD * 2;
  const jy = cellH - size - CELL_PAD * 2;
  return shuffle(cells, rng)
    .slice(0, n)
    .sort((a, b) => a - b)
    .map((c) => ({
      x: left + (c % g.cols) * cellW + CELL_PAD + rng() * jx,
      y: top + Math.floor(c / g.cols) * cellH + CELL_PAD + rng() * jy,
      size,
    }));
}
