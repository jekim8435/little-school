/**
 * 숫자 카드 보기 (5-1). 정답 주변 수(±1, ±2)에서 고르고, 모자라면 ±3, ±4…로 넓혀 가까운 수부터 채운다.
 * 모두 min 이상 max 이하. 범위 전체로도 모자라면 있는 만큼만. 정답 위치는 무작위.
 * 같은 판에서 같은 보기 조합 반복은 가능한 만큼 피한다(used에 조합을 쌓음).
 */
import { shuffle, type Rng } from '../../../shared/random';

export function pickNumberChoices(
  answer: number,
  min: number,
  max: number,
  count: number,
  used: string[] = [],
  rng: Rng = Math.random,
): number[] {
  const need = count - 1;
  // 거리별 후보 묶음 (가까운 것부터)
  const rings: number[][] = [];
  for (let d = 1; d <= max - min; d++) {
    const ring = [answer - d, answer + d].filter((n) => n >= min && n <= max);
    if (ring.length) rings.push(ring);
  }
  const near = (): number[] => {
    // ±1, ±2는 한 묶음으로 섞어서 고르고, 모자랄 때만 바깥으로
    const out: number[] = [];
    const first = shuffle(rings.slice(0, 2).reduce((a, r) => a.concat(r), [] as number[]), rng);
    for (const n of first) if (out.length < need) out.push(n);
    for (let i = 2; i < rings.length && out.length < need; i++) {
      for (const n of shuffle(rings[i], rng)) if (out.length < need) out.push(n);
    }
    return out;
  };
  let best = near();
  for (let attempt = 0; attempt < 8 && used.indexOf(comboKey([answer].concat(best))) >= 0; attempt++) best = near();
  const choices = [answer].concat(best);
  used.push(comboKey(choices));
  return shuffle(choices, rng);
}

export function comboKey(nums: number[]): string {
  return nums
    .slice()
    .sort((a, b) => a - b)
    .join(',');
}
