/**
 * 출제 주머니: 배운 한자가 모두 같은 횟수만큼 나오게 한다.
 * - 주머니에 배운 한자를 하나씩 넣고 섞는다. 한 판은 앞에서부터 꺼낸다
 * - 주머니가 비면 배운 한자 전체를 다시 넣고 섞는다 → 모든 한자가 한 번씩 나온 뒤에야 같은 한자가 다시 나온다
 * - 방금 꺼낸 한자가 바로 다시 나오지 않게 한다(판 안, 판 사이 모두)
 * - 활동과 상관없이 과목 하나에 주머니 하나. 상태는 과목 저장소에 저장해 앱을 껐다 켜도 이어진다
 * - 배운 한자가 바뀌면: 해제한 한자는 빼고, 새로 고른 한자는 주머니 앞쪽에 넣어 바로 나오게 한다
 */
import { shuffle, type Rng } from './types';

export interface BagState {
  /** 이번 바퀴에 아직 꺼내지 않은 한자 (앞에서부터 꺼냄) */
  queue: string[];
  /** 마지막으로 맞춰 둔 배운 한자 목록 (새로 고른 한자를 찾는 데 씀) */
  known: string[];
  /** 마지막으로 꺼낸 한자 */
  last: string | null;
}

export const emptyBag = (): BagState => ({ queue: [], known: [], last: null });

/** 저장값을 읽어 형식에 맞춘다 (깨진 값은 빈 주머니) */
export function readBag(raw: unknown): BagState {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return { queue: strs(o.queue), known: strs(o.known), last: typeof o.last === 'string' ? o.last : null };
}

/** 배운 한자 목록에 맞춘다: 해제한 한자는 빼고, 새 한자는 앞쪽에 섞어 넣는다 */
export function syncBag(state: BagState, learned: string[], rng: Rng = Math.random): BagState {
  const queue = state.queue.filter((c) => learned.indexOf(c) >= 0);
  const added = learned.filter((c) => state.known.indexOf(c) < 0 && queue.indexOf(c) < 0);
  return { queue: shuffle(added, rng).concat(queue), known: learned.slice(), last: state.last };
}

/** n자를 꺼낸다. 배운 한자가 n보다 적으면 주머니를 여러 번 채운다 */
export function drawFromBag(state: BagState, learned: string[], n: number, rng: Rng = Math.random): { items: string[]; state: BagState } {
  let s = syncBag(state, learned, rng);
  const queue = s.queue.slice();
  let last = s.last;
  const items: string[] = [];
  if (!learned.length) return { items, state: s };
  while (items.length < n) {
    if (!queue.length) {
      let fresh = shuffle(learned, rng);
      // 방금 꺼낸 한자가 새 바퀴 맨 앞에 오지 않게
      if (fresh.length > 1 && fresh[0] === last) fresh = fresh.slice(1).concat(fresh.slice(0, 1));
      queue.push(...fresh);
    }
    // 연달아 같은 한자가 나오지 않게 (같은 바퀴 안에서 다른 한자와 자리를 바꿈)
    let i = 0;
    if (queue[0] === last) for (i = 1; i < queue.length && queue[i] === last; i++);
    if (i >= queue.length) i = 0;
    const c = queue.splice(i, 1)[0];
    items.push(c);
    last = c;
  }
  s = { queue, known: s.known, last };
  return { items, state: s };
}
