/**
 * 10칸 판 상태 (5-2). 칸 번호는 채우는 순서: 첫 판 윗줄 왼쪽→오른쪽(0~4), 첫 판 아랫줄(5~9), 둘째 판(10~19).
 * - 어느 빈 칸을 눌러도 다음 순서 칸에 구슬이 들어간다 → 5와 10의 모양이 늘 같다
 * - 구슬을 누르면 마지막 구슬 하나가 빠진다
 * - 1단계는 윗줄 5칸만(아랫줄은 흐리게, 누를 수 없음), 3단계는 판 2개(위아래)를 첫 판부터 채운다
 */
import type { Level } from './level';

export const FRAME_CELLS = 10;

/** 판 개수 */
export function framesFor(level: Level): number {
  return level === 3 ? 2 : 1;
}

/** 구슬을 놓을 수 있는 칸 수 */
export function capacityFor(level: Level): number {
  return level === 1 ? 5 : level === 2 ? 10 : 20;
}

/** 칸을 누를 수 있는지 (1단계 아랫줄은 못 누름) */
export function cellEnabled(index: number, level: Level): boolean {
  return index < capacityFor(level);
}

/** 빈 칸을 눌렀을 때 → 새 구슬 수 (어느 빈 칸이든 다음 순서 칸에) */
export function placeBead(count: number, level: Level): number {
  return Math.min(count + 1, capacityFor(level));
}

/** 구슬을 눌렀을 때 → 마지막 하나가 빠진 구슬 수 */
export function removeBead(count: number): number {
  return Math.max(count - 1, 0);
}

/** ‘다 했어요’를 누를 수 있는지: 구슬 1개 이상 (부모 결정 — 실수로 먼저 눌러 틀린 것이 되지 않게) */
export function canSubmit(count: number): boolean {
  return count >= 1;
}
