/**
 * 부모 모드 진입 잠금 (명세 8-1).
 * - 두 자리 × 한 자리 곱셈 문제(예: 17 × 6) 또는 4자리 숫자 암호
 * - 3번 틀리면 1분 잠금
 * - 부모 모드에서 5분 동안 조작이 없으면 잠그고 아이 화면으로
 */

export const MAX_TRIES = 3;
export const LOCK_MS = 60000;
export const IDLE_MS = 5 * 60000;

export interface MathProblem {
  a: number;
  b: number;
  answer: number;
}

/** 두 자리(12~29) × 한 자리(3~9). 너무 쉬운 수(10, 11, 1, 2)는 뺀다 */
export function makeProblem(random: () => number = Math.random): MathProblem {
  const a = 12 + Math.floor(random() * 18);
  const b = 3 + Math.floor(random() * 7);
  return { a, b, answer: a * b };
}

export type CheckResult = 'ok' | 'wrong' | 'locked';

export class ParentLock {
  private wrong = 0;
  private lockedUntil = 0;
  private lastActive = 0;
  unlocked = false;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** 잠겨 있으면 남은 ms, 아니면 0 */
  lockedFor(): number {
    return Math.max(0, this.lockedUntil - this.now());
  }

  /** 답(곱셈 답 또는 암호)을 확인한다 */
  check(given: string, expected: string): CheckResult {
    if (this.lockedFor() > 0) return 'locked';
    if (given !== '' && given === expected) {
      this.wrong = 0;
      this.unlocked = true;
      this.lastActive = this.now();
      return 'ok';
    }
    this.wrong += 1;
    if (this.wrong >= MAX_TRIES) {
      this.wrong = 0;
      this.lockedUntil = this.now() + LOCK_MS;
      return 'locked';
    }
    return 'wrong';
  }

  /** 부모 모드에서 무언가를 할 때마다 */
  active(): void {
    this.lastActive = this.now();
  }

  /** 5분 동안 조작이 없었는지 */
  idle(): boolean {
    return this.unlocked && this.now() - this.lastActive >= IDLE_MS;
  }

  /** 부모 모드를 떠날 때 다시 잠근다 */
  lock(): void {
    this.unlocked = false;
  }
}
