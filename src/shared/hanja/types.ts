/**
 * 한자 공용 엔진의 데이터 형식. 한자 과목 여러 개(세트마다 하나)가 같은 엔진을 쓴다.
 */

/** 한자 한 자 */
export interface HanjaItem {
  /** 세트 안의 순서 (1부터). ‘다음 2자 추가’·한자판 배치 순서 */
  no: number;
  char: string;
  /** 뜻 (훈) — 세트 자료의 표기 그대로 */
  meaning: string;
  /** 음 */
  sound: string;
  /** 자료의 줄 번호 (기록용) */
  line?: number;
  /** 그림 id = src/shared/hanja/pictures/<id>.svg */
  picture: string;
}

/** 한자 세트 하나 (과목 하나가 세트 하나를 받는다) */
export interface HanjaSet {
  id: string;
  items: HanjaItem[];
  /** 헷갈리기 쉬운 묶음 (소리·모양·뜻이 비슷한 한자). 둘 다 배운 한자면 보기에 우선 넣는다 */
  confusables: string[][];
}

/** 0 이상 1 미만 난수 (테스트에서 고정값을 넣는다) */
export type Rng = () => number;

/** 대사 ID에 쓰는 한자 표기: 海 → u6d77 */
export function charKey(char: string): string {
  return `u${char.charCodeAt(0).toString(16)}`;
}

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

/** 순서대로 아직 고르지 않은 앞의 n자 (‘다음 2자 추가’, ‘다음 한자 미리 보기’) */
export function nextUnlearned(items: HanjaItem[], learned: string[], n: number): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (out.length >= n) break;
    if (learned.indexOf(it.char) < 0) out.push(it.char);
  }
  return out;
}

/** 배운 한자를 세트 순서대로 (세트에 없는 글자는 버림) */
export function learnedInOrder(items: HanjaItem[], learned: string[]): string[] {
  return items.filter((it) => learned.indexOf(it.char) >= 0).map((it) => it.char);
}
