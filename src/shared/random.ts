/**
 * 여러 과목이 함께 쓰는 난수 도우미. 테스트에서는 Rng에 고정값을 넣는다.
 */

/** 0 이상 1 미만 난수 */
export type Rng = () => number;

export function shuffle<T>(list: T[], rng: Rng = Math.random): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}
