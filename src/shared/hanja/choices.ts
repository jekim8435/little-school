/**
 * 보기 고르기.
 * - 정답 외의 보기는 배운 한자에서만 고른다
 * - 헷갈리기 쉬운 짝(세트의 confusables)이 둘 다 배운 한자면 보기에 우선 넣는다
 * - 나머지는 무작위. 같은 판에서 같은 보기 조합이 반복되지 않게 한다(가능한 만큼 — 배운 한자가 적으면 조합이 모자람)
 * - 정답 위치는 매번 무작위
 */
import { shuffle, type Rng } from './types';

/** 정답과 헷갈리기 쉬운 한자들 */
export function partnersOf(answer: string, confusables: string[][]): string[] {
  const out: string[] = [];
  for (const group of confusables) {
    if (group.indexOf(answer) < 0) continue;
    for (const c of group) if (c !== answer && out.indexOf(c) < 0) out.push(c);
  }
  return out;
}

/**
 * 보기 count개 (정답 포함, 섞어서).
 * used: 이 판에서 이미 쓴 보기 조합(정렬한 글자를 이은 문자열). 여기에 이번 조합을 더한다
 */
export function pickChoices(
  answer: string,
  learned: string[],
  count: number,
  confusables: string[][],
  used: string[] = [],
  rng: Rng = Math.random,
): string[] {
  const pool = learned.filter((c) => c !== answer);
  const need = Math.min(count - 1, pool.length);
  const partners = shuffle(
    partnersOf(answer, confusables).filter((c) => pool.indexOf(c) >= 0),
    rng,
  ).slice(0, need);
  const rest = pool.filter((c) => partners.indexOf(c) < 0);
  let best: string[] = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const others = partners.concat(shuffle(rest, rng).slice(0, need - partners.length));
    const key = comboKey([answer].concat(others));
    best = others;
    if (used.indexOf(key) < 0) break;
  }
  const choices = [answer].concat(best);
  used.push(comboKey(choices));
  return shuffle(choices, rng);
}

export function comboKey(chars: string[]): string {
  return chars.slice().sort().join('');
}
