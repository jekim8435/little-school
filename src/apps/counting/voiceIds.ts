/**
 * 구슬 세기 대사 ID (voices.json, 8장). 화면 코드는 여기서만 대사 ID를 가져온다(테스트가 모두 등록됐는지 확인).
 */
import type { ActivityId } from './logic/config';

export const V = {
  num: (n: number) => `counting.num.${n}`,
  total: (n: number) => `counting.total.${n}`,
  ask: {
    pick: 'counting.ask.pick-activity',
    count: 'counting.ask.count',
    howMany: 'counting.ask.how-many',
    make: 'counting.ask.make',
    moreToTen: 'counting.ask.more-to-ten',
    match: 'counting.ask.match',
    board: 'counting.ask.board',
    retry: 'counting.ask.retry',
    leave: 'counting.ask.leave',
  },
  ten: 'counting.ten',
  praise: { round: 'counting.praise.round', sheet: 'counting.praise.sheet' },
};

/** 활동을 시작할 때 안내 */
export const ACTIVITY_ASK: Record<ActivityId, string> = {
  count: V.ask.count,
  frame: V.ask.make,
  match: V.ask.match,
  board: V.ask.board,
};

/** 코드가 부를 수 있는 대사 ID 전부 */
export function allVoiceIds(): string[] {
  const ids: string[] = [];
  for (let n = 1; n <= 20; n++) ids.push(V.num(n), V.total(n));
  const ask = V.ask as Record<string, string>;
  for (const k of Object.keys(ask)) ids.push(ask[k]);
  ids.push(V.ten, V.praise.round, V.praise.sheet);
  return ids;
}
