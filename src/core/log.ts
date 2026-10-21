/** 학습 기록 (과목별·날짜별). 부모 모드 ‘기록’·‘자주 틀린 문제’에 쓴다 (명세 8-3, 9장) */
import type { LogRecord } from '../apps/types';
import type { Store } from './storage';

/** 문제 하나의 기록을 남긴다. 오래된 것은 저장할 때 과목별 500건까지만 남는다 */
export function recordLog(store: Store, appId: string, r: LogRecord, now: number = Date.now()): void {
  const list = store.data.logs[appId] || (store.data.logs[appId] = []);
  const entry: { t: number; item: string; correct: boolean; ms: number; meta?: Record<string, unknown> } = {
    t: now,
    item: String(r.item),
    correct: !!r.correct,
    ms: typeof r.durationMs === 'number' && r.durationMs >= 0 ? Math.round(r.durationMs) : 0,
  };
  if (r.meta) entry.meta = JSON.parse(JSON.stringify(r.meta)) as Record<string, unknown>;
  list.push(entry);
  store.changed();
}
