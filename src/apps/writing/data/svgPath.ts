import type { Point } from './types';

/** 곡선 한 구간을 나눌 개수 */
const CURVE_STEPS = 16;

/**
 * 간단한 SVG 경로(절대 좌표 M, L, H, V, Q, C, Z)를 점열로 바꾼다.
 * 획 데이터 작성용이라 상대 좌표나 호(A)는 지원하지 않는다.
 */
export function samplePath(d: string): Point[] {
  const tokens = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const pts: Point[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const num = () => {
    const v = Number(tokens[i++]);
    if (Number.isNaN(v)) throw new Error(`잘못된 SVG 경로: ${d}`);
    return v;
  };
  const push = (x: number, y: number) => {
    const last = pts[pts.length - 1];
    if (!last || last[0] !== x || last[1] !== y) pts.push([round(x), round(y)]);
  };

  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) {
      cmd = tokens[i++];
      if (/[a-z]/.test(cmd) && cmd !== 'z') throw new Error(`상대 좌표 명령은 지원하지 않음: ${cmd}`);
    }
    switch (cmd.toUpperCase()) {
      case 'M':
        cx = sx = num();
        cy = sy = num();
        push(cx, cy);
        cmd = 'L'; // M 뒤에 이어지는 좌표는 L로 처리
        break;
      case 'L':
        cx = num();
        cy = num();
        push(cx, cy);
        break;
      case 'H':
        cx = num();
        push(cx, cy);
        break;
      case 'V':
        cy = num();
        push(cx, cy);
        break;
      case 'Q': {
        const x1 = num(), y1 = num(), x = num(), y = num();
        for (let s = 1; s <= CURVE_STEPS; s++) {
          const t = s / CURVE_STEPS, u = 1 - t;
          push(u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y);
        }
        cx = x;
        cy = y;
        break;
      }
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
        for (let s = 1; s <= CURVE_STEPS; s++) {
          const t = s / CURVE_STEPS, u = 1 - t;
          push(
            u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
            u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
          );
        }
        cx = x;
        cy = y;
        break;
      }
      case 'Z':
        cx = sx;
        cy = sy;
        push(sx, sy); // 닫힌 획은 시작점으로 돌아온다
        cmd = '';
        break;
      default:
        throw new Error(`잘못된 SVG 경로: ${d}`);
    }
  }
  return pts;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
