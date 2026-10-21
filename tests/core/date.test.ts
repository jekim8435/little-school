import { describe, expect, it } from 'vitest';
import { addDays, dateKey, daysBetween, isDateKey } from '../../src/core/date';

describe('날짜 키', () => {
  it('기기 로컬 날짜로 YYYY-MM-DD를 만든다', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 9, 21, 0, 0))).toBe('2026-10-21');
  });

  it('날 수를 센다', () => {
    expect(daysBetween('2026-10-21', '2026-10-21')).toBe(0);
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-11-01', '2026-10-31')).toBe(-1);
    expect(daysBetween('2027-12-31', '2028-03-01')).toBe(61); // 윤년
  });

  it('날짜를 더한다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-21', -89)).toBe('2026-07-24');
  });

  it('날짜 키 형식을 검사한다', () => {
    expect(isDateKey('2026-10-21')).toBe(true);
    expect(isDateKey('2026-1-2')).toBe(false);
    expect(isDateKey(20261021)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});
