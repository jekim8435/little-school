/**
 * 한 판 진행 (세어 보기·10칸 판). 화면 없이 순서만 다룬다.
 * - 틀린 문제는 판 끝에 한 번씩 다시 낸다(한 판 문제 수에 포함하지 않음). 다시 낸 문제에서 또 틀려도 더 내지 않는다
 * - 진행 막대는 본 문제 수에서 멈춘다
 */
import { shuffle, type Rng } from '../../../shared/random';
import { MORE_PER_ROUND, OBJECTS } from './config';
import type { Level } from './level';

export type Problem =
  /** 세어 보기: 사물 object가 n개 */
  | { kind: 'count'; n: number; object: string; retry: boolean }
  /** 10칸 판 (가) 수만큼 놓기 */
  | { kind: 'make'; n: number; retry: boolean }
  /** 10칸 판 (나) 10이 되려면 몇 개 더? placed개가 미리 놓임, 정답은 10 − placed */
  | { kind: 'more'; placed: number; retry: boolean };

export interface Round {
  problems: Problem[];
  index: number;
  main: number;
}

export function createRound(problems: Problem[]): Round {
  return { problems, index: 0, main: problems.length };
}

export function currentProblem(r: Round): Problem | undefined {
  return r.problems[r.index];
}

/** 지금 문제의 결과를 넣고 다음 문제로. 첫 시도에서 틀리면 판 끝에 한 번 더 */
export function answerProblem(r: Round, correct: boolean): Round {
  const p = r.problems[r.index];
  if (!p) return r;
  const problems = r.problems.slice();
  if (!correct && !p.retry) problems.push(Object.assign({}, p, { retry: true }));
  return { problems, index: r.index + 1, main: r.main };
}

export function isRoundDone(r: Round): boolean {
  return r.index >= r.problems.length;
}

export function progressOf(r: Round): number {
  return Math.min(r.index, r.main);
}

/** 문제의 정답 수 (기록의 item) */
export function answerOf(p: Problem): number {
  return p.kind === 'more' ? 10 - p.placed : p.n;
}

/** 사물 종류를 문제마다 바꾼다. 연달아 같은 사물이 나오지 않게(판 사이도: last = 앞 판 마지막 사물) */
export function pickObjects(n: number, last: string | null, rng: Rng = Math.random): string[] {
  const out: string[] = [];
  let prev = last;
  while (out.length < n) {
    for (const o of shuffle(OBJECTS, rng)) {
      if (out.length >= n) break;
      if (o === prev) continue;
      out.push(o);
      prev = o;
    }
  }
  return out;
}

/** 세어 보기 한 판. nums: 주머니에서 꺼낸 수 */
export function countRound(nums: number[], lastObject: string | null, rng: Rng = Math.random): Round {
  const objects = pickObjects(nums.length, lastObject, rng);
  return createRound(nums.map((n, i): Problem => ({ kind: 'count', n, object: objects[i], retry: false })));
}

/** 10칸 판 한 판에 주머니에서 꺼낼 수의 개수 (2단계부터 (나) 문제는 주머니를 쓰지 않음) */
export function frameDraws(level: Level, size: number): number {
  return level >= 2 ? size - MORE_PER_ROUND : size;
}

/**
 * 10칸 판 한 판. nums: 주머니에서 꺼낸 수(frameDraws개).
 * 2단계 이상이면 (나) 문제 MORE_PER_ROUND개를 무작위 자리에 끼운다 — 미리 놓는 수는 1~9에서 서로 다르게
 */
export function frameRound(nums: number[], level: Level, rng: Rng = Math.random): Round {
  const problems: Problem[] = nums.map((n): Problem => ({ kind: 'make', n, retry: false }));
  if (level >= 2) {
    const placed = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng).slice(0, MORE_PER_ROUND);
    for (const p of placed) {
      const at = Math.floor(rng() * (problems.length + 1));
      problems.splice(at, 0, { kind: 'more', placed: p, retry: false });
    }
  }
  return createRound(problems);
}
