/**
 * 숫자 짝짓기 (5-3). 뒤집기 없이 보이는 카드로 위 줄 숫자 카드 · 아래 줄 그림 카드의 짝을 잇는다.
 * - 한 장의 수는 모두 다르다(현재 단계 범위, 단계 비중대로 — 출제 주머니는 쓰지 않음)
 * - 한 장의 그림 카드는 사물이 모두 다르다
 * - 그림 카드 모양: 10 이하는 5개씩 줄, 11 이상은 위 줄 10개(5 + 5 한 묶음) + 아래 줄 낱개
 */
import { shuffle, type Rng } from '../../../shared/random';
import { OBJECTS } from './config';
import { levelPool, type Level } from './level';

export interface MatchSheet {
  /** 위 줄 숫자 카드 (왼쪽부터) */
  numbers: number[];
  /** 아래 줄 그림 카드 (왼쪽부터) */
  pictures: { n: number; object: string }[];
}

/** 단계 비중대로 서로 다른 수 count개 */
export function pickDistinct(level: Level, count: number, rng: Rng = Math.random): number[] {
  const out: number[] = [];
  for (const s of shuffle(levelPool(level), rng)) {
    const n = Number(s);
    if (out.indexOf(n) < 0) out.push(n);
    if (out.length >= count) break;
  }
  return out;
}

export function makeSheet(level: Level, pairs: number, rng: Rng = Math.random): MatchSheet {
  const nums = pickDistinct(level, pairs, rng);
  const objects = shuffle(OBJECTS, rng).slice(0, nums.length);
  return {
    numbers: shuffle(nums, rng),
    pictures: shuffle(
      nums.map((n, i) => ({ n, object: objects[i] })),
      rng,
    ),
  };
}

export function makeSheets(level: Level, sheets: number, pairs: number, rng: Rng = Math.random): MatchSheet[] {
  const out: MatchSheet[] = [];
  for (let i = 0; i < sheets; i++) out.push(makeSheet(level, pairs, rng));
  return out;
}

/** 그림 카드의 줄: 각 줄의 개수와, 10개 한 묶음 줄인지 */
export function pictureRows(n: number): { count: number; bundle: boolean }[] {
  if (n > 10) return [{ count: 10, bundle: true }, { count: n - 10, bundle: false }];
  const rows: { count: number; bundle: boolean }[] = [];
  for (let left = n; left > 0; left -= 5) rows.push({ count: Math.min(5, left), bundle: false });
  return rows;
}
