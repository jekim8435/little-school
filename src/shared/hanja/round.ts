/**
 * 한 판 진행 (고르기 활동·짝 맞추기). 화면 없이 순서만 다룬다.
 * - 한 판 = 주머니에서 꺼낸 한자 10개
 * - 고르기: 틀린 한자마다 판 끝에 한 번씩 다시 낸다(10개에 포함하지 않음). 다시 낸 문제에서 또 틀려도 더 내지 않는다
 * - 짝 맞추기: 10자를 5쌍씩 두 판으로 나눈다
 */
import { shuffle, type Rng } from './types';

export const ROUND_SIZE = 10;
export const PAIRS_PER_BOARD = 5;

export interface Problem {
  char: string;
  /** 판 끝에 다시 낸 문제 */
  retry: boolean;
}

export interface QuizRound {
  problems: Problem[];
  /** 지금 문제 위치 */
  index: number;
  /** 본 문제 수 (진행 막대의 분모) */
  main: number;
}

export function createQuizRound(chars: string[]): QuizRound {
  return { problems: chars.map((char) => ({ char, retry: false })), index: 0, main: chars.length };
}

export function currentProblem(r: QuizRound): Problem | undefined {
  return r.problems[r.index];
}

/** 지금 문제의 결과를 넣고 다음 문제로. 첫 시도에서 틀리면 판 끝에 한 번 더 */
export function answerProblem(r: QuizRound, correct: boolean): QuizRound {
  const p = r.problems[r.index];
  if (!p) return r;
  const problems = r.problems.slice();
  if (!correct && !p.retry) problems.push({ char: p.char, retry: true });
  return { problems, index: r.index + 1, main: r.main };
}

export function isRoundDone(r: QuizRound): boolean {
  return r.index >= r.problems.length;
}

/** 진행 막대에 보일 수 (본 문제만, 10에서 멈춤) */
export function progressOf(r: QuizRound): number {
  return Math.min(r.index, r.main);
}

export interface MatchCard {
  /** 판 안에서 카드 구분 */
  key: number;
  char: string;
  kind: 'hanja' | 'picture';
}

/** 10자를 5자씩 두 판으로 */
export function splitBoards(chars: string[]): string[][] {
  const boards: string[][] = [];
  for (let i = 0; i < chars.length; i += PAIRS_PER_BOARD) boards.push(chars.slice(i, i + PAIRS_PER_BOARD));
  return boards;
}

/** 한 판의 카드 (한자 카드 + 그림 카드, 섞어서) */
export function boardCards(chars: string[], rng: Rng = Math.random): MatchCard[] {
  const cards: MatchCard[] = [];
  chars.forEach((char) => {
    cards.push({ key: 0, char, kind: 'hanja' });
    cards.push({ key: 0, char, kind: 'picture' });
  });
  return shuffle(cards, rng).map((c, i) => ({ key: i, char: c.char, kind: c.kind }));
}

/** 두 카드가 짝인지: 한자 카드와 그림 카드이고 같은 한자 (같은 한자가 두 번 있으면 어느 쪽과 맞춰도 정답) */
export function isPair(a: MatchCard, b: MatchCard): boolean {
  return a.kind !== b.kind && a.char === b.char;
}
