/**
 * 익힘 단계 0~3 (기록용). 맞히면 +1, 틀리면 −1(최소 0).
 * 출제 순서에는 영향을 주지 않는다(출제는 주머니로 고르게). 한자판의 별 표시와 부모 모드 기록에만 쓴다.
 * 과목 저장소 안에 한자 기준 키로 저장한다: { "海": 2 }
 */
export type Mastery = Record<string, number>;

export const MASTERY_MAX = 3;

export function readMastery(raw: unknown): Mastery {
  const out: Mastery = {};
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'number' && v >= 0) out[k] = Math.min(MASTERY_MAX, Math.floor(v));
  }
  return out;
}

export function levelOf(m: Mastery, char: string): number {
  return m[char] || 0;
}

/** 결과를 반영한 새 익힘 기록 */
export function applyResult(m: Mastery, char: string, correct: boolean): Mastery {
  const out: Mastery = {};
  for (const k of Object.keys(m)) out[k] = m[k];
  const v = levelOf(m, char) + (correct ? 1 : -1);
  out[char] = Math.max(0, Math.min(MASTERY_MAX, v));
  return out;
}
