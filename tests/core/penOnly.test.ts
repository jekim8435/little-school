import { describe, expect, it } from 'vitest';
import { shouldBlock } from '../../src/ui/penOnly';

describe('펜으로만 사용하기 (2026-10-22)', () => {
  it('켜져 있으면 아이 화면의 손가락 입력을 버린다', () => {
    expect(shouldBlock('touch', true, false)).toBe(true);
  });
  it('펜·마우스는 언제나 받는다', () => {
    expect(shouldBlock('pen', true, false)).toBe(false);
    expect(shouldBlock('mouse', true, false)).toBe(false);
  });
  it('부모 모드·부모 잠금 자리는 손가락도 받는다', () => {
    expect(shouldBlock('touch', true, true)).toBe(false);
  });
  it('꺼져 있으면 아무것도 막지 않는다', () => {
    expect(shouldBlock('touch', false, false)).toBe(false);
  });
});
