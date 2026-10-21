import { describe, expect, it } from 'vitest';
import { IDLE_MS, StudySession } from '../../src/core/session';
import { Store } from '../../src/core/storage';

const SEC = 1000;
const MIN = 60 * SEC;

/** 가짜 시계: advance로 시간을 흘린다 */
function setup(dailyMinutes: number | null = 20, graceMinutes = 5) {
  let t = new Date(2026, 9, 21, 10, 0).getTime();
  const store = new Store(null, { now: () => new Date(t) });
  store.load();
  store.data.settings.dailyMinutes = dailyMinutes;
  store.data.settings.graceMinutes = graceMinutes;
  const s = new StudySession(store, () => t);
  /** ms만큼 흘리되, touchEvery마다 화면을 누른다(아이가 공부 중). 1초마다 flush */
  const advance = (ms: number, touchEvery = 10 * SEC) => {
    for (let passed = 0; passed < ms; passed += SEC) {
      t += SEC;
      if (touchEvery && passed % touchEvery === 0) s.touch();
      s.flush();
    }
  };
  const ms = (id = 'sample') => store.daySubject(id).ms;
  return { store, s, advance, ms, setTime: (v: number) => (t = v), time: () => t };
}

describe('학습 시간 측정 (명세 7장)', () => {
  it('과목 화면이 열린 동안만 잰다', () => {
    const { s, advance, ms } = setup();
    advance(MIN); // 허브: 재지 않음
    expect(ms()).toBe(0);
    s.start('sample');
    advance(2 * MIN);
    s.stop();
    advance(MIN);
    expect(ms()).toBe(2 * MIN);
  });

  it('세로 방향·백그라운드 동안은 멈춘다', () => {
    const { s, advance, ms } = setup();
    s.start('sample');
    advance(MIN);
    s.setPaused(true);
    advance(MIN);
    s.setPaused(false);
    advance(MIN);
    s.stop();
    expect(ms()).toBe(2 * MIN);
  });

  it('30초 넘게 터치가 없으면 쉬는 중: 마지막 터치 후 30초까지만 세고, 다시 누르면 이어서', () => {
    const { s, advance, ms } = setup();
    s.start('sample');
    advance(10 * SEC); // 1초째에 한 번 누름
    advance(2 * MIN, 0); // 터치 없음
    expect(ms()).toBe(SEC + IDLE_MS);
    s.touch();
    advance(20 * SEC);
    s.stop();
    expect(ms()).toBe(SEC + IDLE_MS + 20 * SEC);
  });

  it('과목별로 따로, 하루 합계는 모든 과목', () => {
    const { s, advance, ms } = setup();
    s.start('sample');
    advance(MIN);
    s.start('writing'); // 바로 다른 과목 (앞 과목은 저절로 멈춤)
    advance(2 * MIN);
    s.stop();
    expect(ms('sample')).toBe(MIN);
    expect(ms('writing')).toBe(2 * MIN);
    expect(s.usedMs()).toBe(3 * MIN);
  });
});

describe('오늘 공부 끝 (명세 5-5)', () => {
  it('하루 시간에 닿으면 isTimeUp, 유예 시간이 지나면 강제로 끝', () => {
    const { s, advance } = setup(1, 2);
    s.start('sample');
    advance(59 * SEC);
    expect(s.isTimeUp()).toBe(false);
    advance(SEC);
    expect(s.isTimeUp()).toBe(true);
    expect(s.shouldForceDone()).toBe(false); // 한 판이 끝나기를 기다린다
    advance(2 * MIN - SEC);
    expect(s.shouldForceDone()).toBe(false);
    advance(SEC);
    expect(s.shouldForceDone()).toBe(true);
  });

  it('유예 0분이면 닿자마자 강제로 끝', () => {
    const { s, advance } = setup(1, 0);
    s.start('sample');
    advance(MIN);
    expect(s.shouldForceDone()).toBe(true);
  });

  it('‘오늘 10분 더’로 풀린다', () => {
    const { s, advance } = setup(1, 5);
    s.start('sample');
    advance(MIN);
    expect(s.isTimeUp()).toBe(true);
    s.addToday(10);
    expect(s.isTimeUp()).toBe(false);
    expect(s.limitMs()).toBe(11 * MIN);
  });

  it('제한 없음이면 끝나지 않는다', () => {
    const { s, advance } = setup(null);
    s.start('sample');
    advance(90 * MIN);
    expect(s.isTimeUp()).toBe(false);
  });

  it('다음 날(자정 기준) 저절로 풀린다', () => {
    const { s, advance, setTime, time } = setup(1);
    s.start('sample');
    advance(MIN);
    s.stop();
    expect(s.isTimeUp()).toBe(true);
    const d = new Date(time());
    setTime(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 1).getTime());
    expect(s.isTimeUp()).toBe(false);
  });

  it('과목 화면 밖(허브)에서는 강제 이동하지 않는다', () => {
    const { s, advance } = setup(1, 0);
    s.start('sample');
    advance(MIN);
    s.stop();
    expect(s.isTimeUp()).toBe(true);
    expect(s.shouldForceDone()).toBe(false);
  });
});
