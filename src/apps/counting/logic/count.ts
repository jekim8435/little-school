/**
 * 세어 보기에서 사물 누르기 (5-1). 사물 하나에 수 하나 — 이미 센 사물을 다시 눌러도 세지 않는다(일대일 대응).
 * 누르는 순서는 자유. 다 세면 보기(숫자 카드)가 나온다.
 */

export interface CountState {
  /** 사물 수 */
  total: number;
  /** 사물마다 붙은 수 (0 = 아직 안 셈) */
  marks: number[];
  /** 지금까지 센 수 */
  counted: number;
  /** 다 세기까지 누른 횟수 (다시 누른 횟수 포함, 기록 meta.tapsBeforeAll) */
  taps: number;
}

export function startCount(total: number): CountState {
  const marks: number[] = [];
  for (let i = 0; i < total; i++) marks.push(0);
  return { total, marks, counted: 0, taps: 0 };
}

/** 사물 i를 눌렀다. fresh: 새로 셌는지(false면 이미 센 사물) */
export function tapObject(s: CountState, i: number): { state: CountState; fresh: boolean } {
  if (i < 0 || i >= s.total || isAllCounted(s)) return { state: s, fresh: false };
  const taps = s.taps + 1;
  if (s.marks[i]) return { state: { total: s.total, marks: s.marks, counted: s.counted, taps }, fresh: false };
  const marks = s.marks.slice();
  marks[i] = s.counted + 1;
  return { state: { total: s.total, marks, counted: s.counted + 1, taps }, fresh: true };
}

export function isAllCounted(s: CountState): boolean {
  return s.counted >= s.total;
}
