/**
 * 단계 조절 (3장). 단계는 과목에 하나(활동 공통)이고 ctx.store에 저장한다. 1단계 1~10 · 2단계 1~20 · 3단계 1~30
 * - 올림: 그 단계에서 첫 시도 기준 최근 8문제 중 7개 이상 정답
 * - 내림: 최근 6문제 중 3개 이상 틀림 (1단계 아래로는 안 감)
 * - 판이 끝날 때 판정하고 다음 판부터 적용. 단계가 바뀌면 최근 기록을 비운다
 * - 최대 수 설정을 넘는 단계로는 오르지 않는다. 자동 단계 조절을 끄면 최대 수의 단계로 낸다
 * - 다시 낸 문제·10 만들기·짝짓기·숫자판은 기록에 넣지 않는다(부르는 쪽이 넣지 않음)
 */

export type Level = 1 | 2 | 3;

export const UP_WINDOW = 8;
export const UP_CORRECT = 7;
export const DOWN_WINDOW = 6;
export const DOWN_WRONG = 3;

export interface LevelState {
  level: Level;
  /** 최근 첫 시도 결과 (오래된 것부터, 최대 UP_WINDOW개) */
  recent: boolean[];
}

export const initialLevel = (): LevelState => ({ level: 1, recent: [] });

/** 단계의 가장 큰 수 */
export function levelMax(level: Level): number {
  return level * 10;
}

/** 최대 수 설정(10/20/30)이 허락하는 가장 높은 단계 */
export function maxLevelFor(maxNumber: number): Level {
  return maxNumber <= 10 ? 1 : maxNumber <= 20 ? 2 : 3;
}

function asLevel(v: unknown): Level {
  return v === 2 || v === 3 ? v : 1;
}

/** 저장값을 읽어 형식에 맞춘다 (깨진 값은 1단계) */
export function readLevel(raw: unknown): LevelState {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const recent = Array.isArray(o.recent) ? o.recent.filter((x): x is boolean => typeof x === 'boolean') : [];
  return { level: asLevel(o.level), recent: recent.slice(-UP_WINDOW) };
}

/** 최대 수를 낮췄으면 현재 단계도 내린다 */
export function clampLevel(s: LevelState, maxNumber: number): LevelState {
  const top = maxLevelFor(maxNumber);
  return s.level > top ? { level: top, recent: [] } : s;
}

/** 이번 판에 쓸 단계 */
export function playLevel(s: LevelState, maxNumber: number, autoLevel: boolean): Level {
  const top = maxLevelFor(maxNumber);
  return autoLevel ? (Math.min(s.level, top) as Level) : top;
}

/** 첫 시도 결과 하나를 넣는다 */
export function addResult(s: LevelState, correct: boolean): LevelState {
  return { level: s.level, recent: s.recent.concat([correct]).slice(-UP_WINDOW) };
}

/** 판이 끝날 때: 올림·내림 판정 */
export function judgeLevel(s: LevelState, maxNumber: number): LevelState {
  const r = s.recent;
  const up = r.length >= UP_WINDOW && r.filter((x) => x).length >= UP_CORRECT;
  if (up && s.level < maxLevelFor(maxNumber)) return { level: (s.level + 1) as Level, recent: [] };
  const wrong = r.slice(-DOWN_WINDOW).filter((x) => !x).length;
  if (wrong >= DOWN_WRONG && s.level > 1) return { level: (s.level - 1) as Level, recent: [] };
  return s;
}

/**
 * 출제 주머니에 넣을 수 (비중은 개수로, 6장). 새 범위가 2/3
 * 1단계 1~10 한 개씩 / 2단계 11~20 두 개씩 + 1~10 한 개씩 / 3단계 21~30 네 개씩 + 1~20 한 개씩
 */
export function levelPool(level: Level): string[] {
  const out: string[] = [];
  const add = (from: number, to: number, times: number) => {
    for (let n = from; n <= to; n++) for (let k = 0; k < times; k++) out.push(String(n));
  };
  if (level === 1) add(1, 10, 1);
  else if (level === 2) {
    add(1, 10, 1);
    add(11, 20, 2);
  } else {
    add(1, 20, 1);
    add(21, 30, 4);
  }
  return out;
}
