/**
 * 카테고리 회차 (명세 14-3, 2026-10-21 부모 결정).
 * - 카테고리마다 회차는 하나. 따라 쓰기·혼자 쓰기 어느 쪽으로 써도 같은 회차에 반영된다
 * - 한 글자를 끝까지 쓴 시도에 틀린 획이 하나도 없으면 그 글자는 이번 회차에서 ‘클리어’
 * - 틀린 획이 있었으면 ‘나중에’ 목록으로 → 회차 끝에 다시 나온다(맞힐 때까지)
 * - 모든 글자를 클리어하면 회차 완료 → 별 1개, 클리어 횟수 +1, 새 회차
 * - 중간에 나가도 ctx.store에 저장되어 이어서 한다
 */

export interface Round {
  /** 이번 회차에 클리어한 글자 id */
  cleared: string[];
  /** 틀린 획이 있었던 글자 (회차 끝에 다시) */
  later: string[];
}

export interface WritingData {
  rounds: Record<string, Round>;
  /** 카테고리별 클리어 횟수 */
  clears: Record<string, number>;
  /** 마지막으로 고른 카테고리 (카드 강조용) */
  lastCategory?: string;
  /** 한글쓰기 앱에서 설정을 옮겨 왔으면 그 키 (명세 14-4) */
  migratedFrom?: string;
}

export const emptyRound = (): Round => ({ cleared: [], later: [] });

/** 저장값을 읽어 형식에 맞춘다 (깨진 값은 빈 회차로) */
export function readData(raw: unknown): WritingData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const rounds: Record<string, Round> = {};
  const rr = o.rounds && typeof o.rounds === 'object' ? (o.rounds as Record<string, Record<string, unknown>>) : {};
  for (const k of Object.keys(rr)) rounds[k] = { cleared: strs(rr[k] && rr[k].cleared), later: strs(rr[k] && rr[k].later) };
  const clears: Record<string, number> = {};
  const cc = o.clears && typeof o.clears === 'object' ? (o.clears as Record<string, unknown>) : {};
  for (const k of Object.keys(cc)) if (typeof cc[k] === 'number' && (cc[k] as number) > 0) clears[k] = Math.floor(cc[k] as number);
  const out: WritingData = { rounds, clears };
  if (typeof o.lastCategory === 'string') out.lastCategory = o.lastCategory;
  if (typeof o.migratedFrom === 'string') out.migratedFrom = o.migratedFrom;
  return out;
}

/**
 * 방금 current번 글자를 마쳤을 때 다음에 쓸 글자 번호.
 * 1) current 뒤에서 아직 클리어하지 않았고 ‘나중에’도 아닌 첫 글자 → 없으면 처음부터 current 앞까지
 * 2) 그런 글자가 없으면 ‘나중에’ 목록의 순서대로 (회차 끝에 다시)
 * 모두 클리어했으면 -1
 */
export function nextTarget(ids: string[], round: Round, current: number): number {
  const fresh = (id: string) => round.cleared.indexOf(id) < 0 && round.later.indexOf(id) < 0;
  for (let i = current + 1; i < ids.length; i++) if (fresh(ids[i])) return i;
  for (let i = 0; i <= current && i < ids.length; i++) if (fresh(ids[i])) return i;
  for (const id of round.later) {
    const i = ids.indexOf(id);
    if (i >= 0 && round.cleared.indexOf(id) < 0) {
      // 방금 틀린 글자가 ‘나중에’의 유일한 글자가 아니면 바로 다시 내지 않는다
      if (i === current && round.later.filter((x) => round.cleared.indexOf(x) < 0).length > 1) continue;
      return i;
    }
  }
  return -1;
}

/** 처음 열 때 쓸 글자: 클리어하지 않은 첫 글자 (‘나중에’는 뒤로) */
export function firstTarget(ids: string[], round: Round): number {
  return nextTarget(ids, round, -1);
}

/**
 * 한 글자를 끝까지 쓴 결과를 회차에 반영한다.
 * clean: 틀린 획 없이 썼는지. 돌려준 complete가 true면 회차 완료(새 회차로 비워 둠)
 */
export function recordAttempt(ids: string[], round: Round, id: string, clean: boolean): { round: Round; complete: boolean } {
  const r: Round = { cleared: round.cleared.slice(), later: round.later.slice() };
  if (clean) {
    if (r.cleared.indexOf(id) < 0) r.cleared.push(id);
    r.later = r.later.filter((x) => x !== id);
  } else if (r.cleared.indexOf(id) < 0) {
    // 맨 뒤로 보낸다 (이미 있으면 위치를 뒤로)
    r.later = r.later.filter((x) => x !== id).concat([id]);
  }
  const complete = ids.length > 0 && ids.every((x) => r.cleared.indexOf(x) >= 0);
  return { round: complete ? emptyRound() : r, complete };
}
