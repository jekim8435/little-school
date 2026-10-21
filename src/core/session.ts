/**
 * 학습 시간 측정과 ‘오늘 공부 끝’ 판정 (명세 5-5, 7장).
 * - 과목 화면이 보이는 동안만 잰다(허브·스티커판 제외)
 * - 세로 방향 안내·백그라운드 전환 동안은 멈춘다(setPaused)
 * - 30초 넘게 터치가 없으면 ‘쉬는 중’으로 보고 멈추고, 다시 터치하면 이어서 잰다
 * - 하루 학습 시간(설정 + 오늘 더한 시간)에 닿으면 isTimeUp(). 과목이 확인하지 않아도
 *   닿은 뒤 유예 시간이 지나면 shouldForceDone()이 true → 껍데기가 ‘오늘 공부 끝’으로 보낸다
 */
import type { Store } from './storage';

/** 이만큼 터치가 없으면 쉬는 중 (명세 7장) */
export const IDLE_MS = 30000;

export class StudySession {
  private appId: string | null = null;
  /** 지금 재고 있는 구간의 시작. 재지 않는 중이면 null */
  private from: number | null = null;
  private lastTouch = 0;
  private paused = false;
  /** 이번 과목 화면에서 시간에 닿은 시각 (유예 계산용) */
  private reachedAt: number | null = null;

  constructor(
    private readonly store: Store,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** 과목 화면이 열렸을 때 */
  start(appId: string): void {
    this.stop();
    const t = this.now();
    this.appId = appId;
    this.lastTouch = t;
    this.from = this.paused ? null : t;
    this.reachedAt = null;
  }

  /** 과목 화면을 떠날 때 */
  stop(): void {
    this.flush();
    this.appId = null;
    this.from = null;
    this.reachedAt = null;
  }

  /** 세로 방향 안내·백그라운드 전환 */
  setPaused(p: boolean): void {
    if (p === this.paused) return;
    this.flush();
    this.paused = p;
    if (p) this.from = null;
    else if (this.appId) {
      const t = this.now();
      this.from = t;
      this.lastTouch = t; // 돌아온 순간부터 다시 잰다
    }
  }

  /** 화면을 누를 때마다 */
  touch(): void {
    const t = this.now();
    if (this.appId && !this.paused && this.from === null) this.from = t; // 쉬다가 다시 시작
    this.lastTouch = t;
  }

  /** 지금까지 잰 시간을 오늘 기록에 더한다. 주기적으로(1초마다) 부른다 */
  flush(): void {
    if (!this.appId || this.from === null) return;
    const t = this.now();
    const end = Math.min(t, this.lastTouch + IDLE_MS);
    if (end > this.from) {
      this.store.daySubject(this.appId).ms += end - this.from;
      this.store.changed();
    }
    // 쉬는 중이 되었으면 다음 터치까지 재지 않는다
    this.from = end < t ? null : t;
  }

  /** 오늘 쓸 수 있는 시간(ms). 제한 없음이면 Infinity */
  limitMs(): number {
    const m = this.store.data.settings.dailyMinutes;
    if (m === null) return Infinity;
    const day = this.store.data.days[this.store.today()];
    return (m + (day ? day.extraMinutes : 0)) * 60000;
  }

  /** 오늘 공부한 시간(ms), 아직 기록에 더하지 않은 지금 구간 포함 */
  usedMs(): number {
    const day = this.store.data.days[this.store.today()];
    let ms = 0;
    if (day) for (const k of Object.keys(day.subjects)) ms += day.subjects[k].ms;
    if (this.appId && this.from !== null) ms += Math.max(0, Math.min(this.now(), this.lastTouch + IDLE_MS) - this.from);
    return ms;
  }

  /** 하루 학습 시간에 닿았는지 (자정이 지나면 저절로 풀린다) */
  isTimeUp(): boolean {
    return this.usedMs() >= this.limitMs();
  }

  /** 시간에 닿은 뒤 유예 시간이 지났는지 → 과목이 확인하지 않아도 ‘오늘 공부 끝’으로 */
  shouldForceDone(): boolean {
    if (!this.appId || !this.isTimeUp()) return false;
    const t = this.now();
    if (this.reachedAt === null) this.reachedAt = t;
    return t - this.reachedAt >= this.store.data.settings.graceMinutes * 60000;
  }

  /** 부모 모드 ‘오늘 10분 더’ */
  addToday(minutes: number): void {
    this.store.day().extraMinutes += minutes;
    this.reachedAt = null;
    this.store.changed();
  }
}
