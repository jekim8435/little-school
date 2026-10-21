import { describe, expect, it } from 'vitest';
import { IDLE_MS, LOCK_MS, makeProblem, ParentLock } from '../../src/core/parentLock';

describe('곱셈 문제 (명세 8-1)', () => {
  it('두 자리 × 한 자리, 답이 맞다', () => {
    for (const r of [0, 0.3, 0.5, 0.999]) {
      const p = makeProblem(() => r);
      expect(p.a).toBeGreaterThanOrEqual(12);
      expect(p.a).toBeLessThanOrEqual(29);
      expect(p.b).toBeGreaterThanOrEqual(3);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(p.answer).toBe(p.a * p.b);
    }
  });
});

describe('부모 잠금', () => {
  function setup() {
    let t = 1000000;
    const lock = new ParentLock(() => t);
    return { lock, advance: (ms: number) => (t += ms) };
  }

  it('정답이면 열린다', () => {
    const { lock } = setup();
    expect(lock.check('102', '102')).toBe('ok');
    expect(lock.unlocked).toBe(true);
  });

  it('3번 틀리면 1분 잠금, 잠긴 동안은 정답도 안 된다. 1분 뒤 다시 된다', () => {
    const { lock, advance } = setup();
    expect(lock.check('1', '102')).toBe('wrong');
    expect(lock.check('2', '102')).toBe('wrong');
    expect(lock.check('3', '102')).toBe('locked');
    expect(lock.lockedFor()).toBe(LOCK_MS);
    expect(lock.check('102', '102')).toBe('locked');
    advance(LOCK_MS);
    expect(lock.check('102', '102')).toBe('ok');
  });

  it('빈 답은 틀린 것으로', () => {
    const { lock } = setup();
    expect(lock.check('', '')).toBe('wrong');
  });

  it('5분 동안 조작이 없으면 idle, 조작하면 다시 센다', () => {
    const { lock, advance } = setup();
    lock.check('1', '1');
    advance(IDLE_MS - 1);
    expect(lock.idle()).toBe(false);
    lock.active();
    advance(IDLE_MS - 1);
    expect(lock.idle()).toBe(false);
    advance(1);
    expect(lock.idle()).toBe(true);
    lock.lock();
    expect(lock.idle()).toBe(false);
  });
});
