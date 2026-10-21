import { describe, expect, it } from 'vitest';
import { acceptPointer, PALM_MS } from '../../src/ui/input';

describe('펜 입력 (명세 2-5)', () => {
  const idle = { down: 0, lastAt: -Infinity };

  it('캔버스가 아니면 무엇이든 받는다', () => {
    expect(acceptPointer('touch', {}, 0, { down: 1, lastAt: 0 })).toBe(true);
  });

  it('캔버스: 펜은 언제나, 손가락은 펜을 쓰지 않을 때만', () => {
    expect(acceptPointer('pen', { canvas: true }, 0, idle)).toBe(true);
    expect(acceptPointer('touch', { canvas: true }, 0, idle)).toBe(true);
    expect(acceptPointer('mouse', { canvas: true }, 0, idle)).toBe(true);
  });

  it('손바닥 무시: 펜이 눌려 있는 동안과 뗀 뒤 2초 안에는 손가락 무시', () => {
    expect(acceptPointer('touch', { canvas: true }, 5000, { down: 1, lastAt: 5000 })).toBe(false);
    expect(acceptPointer('touch', { canvas: true }, 5000 + PALM_MS - 1, { down: 0, lastAt: 5000 })).toBe(false);
    expect(acceptPointer('touch', { canvas: true }, 5000 + PALM_MS, { down: 0, lastAt: 5000 })).toBe(true);
  });

  it('펜으로만 쓰기: 캔버스에서 펜 말고는 받지 않는다', () => {
    expect(acceptPointer('touch', { canvas: true, penOnly: true }, 0, idle)).toBe(false);
    expect(acceptPointer('mouse', { canvas: true, penOnly: true }, 0, idle)).toBe(false);
    expect(acceptPointer('pen', { canvas: true, penOnly: true }, 0, idle)).toBe(true);
  });
});
