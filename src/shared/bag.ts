/**
 * 출제 주머니 (여러 과목 공용): 문제 거리가 모두 같은 횟수만큼 나오게 한다. 한자 엔진·구슬 세기가 쓴다.
 * - 주머니에 문제 거리(pool)를 하나씩 넣고 섞는다. 한 판은 앞에서부터 꺼낸다
 * - 주머니가 비면 pool 전체를 다시 넣고 섞는다 → 모두 한 번씩 나온 뒤에야 같은 것이 다시 나온다
 * - pool에 같은 값을 여러 번 넣으면 그만큼 자주 나온다(비중. 예: 구슬 세기 2단계는 6~10을 두 개씩)
 * - 방금 꺼낸 것이 바로 다시 나오지 않게 한다(판 안, 판 사이 모두)
 * - 상태는 과목 저장소에 저장해 앱을 껐다 켜도 이어진다
 * - pool이 바뀌면: 빠진 것은 빼고, 새로 들어온 것은 주머니 앞쪽에 넣어 바로 나오게 한다(예: 배운 한자 바꾸기)
 */
import { shuffle, type Rng } from './random';

export interface BagState {
  /** 이번 바퀴에 아직 꺼내지 않은 것 (앞에서부터 꺼냄) */
  queue: string[];
  /** 마지막으로 맞춰 둔 pool (새로 들어온 것을 찾는 데 씀) */
  known: string[];
  /** 마지막으로 꺼낸 것 */
  last: string | null;
}

export const emptyBag = (): BagState => ({ queue: [], known: [], last: null });

/** 저장값을 읽어 형식에 맞춘다 (깨진 값은 빈 주머니) */
export function readBag(raw: unknown): BagState {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return { queue: strs(o.queue), known: strs(o.known), last: typeof o.last === 'string' ? o.last : null };
}

/** pool에 맞춘다: 빠진 것은 빼고, 새로 들어온 것은 앞쪽에 섞어 넣는다 */
export function syncBag(state: BagState, pool: string[], rng: Rng = Math.random): BagState {
  const queue = state.queue.filter((c) => pool.indexOf(c) >= 0);
  const added = pool.filter((c) => state.known.indexOf(c) < 0 && queue.indexOf(c) < 0);
  return { queue: shuffle(added, rng).concat(queue), known: pool.slice(), last: state.last };
}

/** n개를 꺼낸다. pool이 n보다 적으면 주머니를 여러 번 채운다 */
export function drawFromBag(state: BagState, pool: string[], n: number, rng: Rng = Math.random): { items: string[]; state: BagState } {
  let s = syncBag(state, pool, rng);
  const queue = s.queue.slice();
  let last = s.last;
  const items: string[] = [];
  if (!pool.length) return { items, state: s };
  while (items.length < n) {
    if (!queue.length) {
      let fresh = shuffle(pool, rng);
      // 방금 꺼낸 것이 새 바퀴 맨 앞에 오지 않게
      if (fresh.length > 1 && fresh[0] === last) fresh = fresh.slice(1).concat(fresh.slice(0, 1));
      queue.push(...fresh);
    }
    // 비중 때문에 같은 값만 남았으면(예: 바퀴 끝에 7, 7) 다음 바퀴를 미리 이어 붙여 다른 값을 꺼낼 수 있게
    if (queue.every((c) => c === last) && pool.some((c) => c !== last)) queue.push(...shuffle(pool, rng));
    // 연달아 같은 것이 나오지 않게 (같은 바퀴 안에서 다른 것과 자리를 바꿈)
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
