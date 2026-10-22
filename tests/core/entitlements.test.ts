import { describe, expect, it } from 'vitest';
import { apps } from '../../src/apps/registry';
import { canUseSubject, usableSubjects } from '../../src/core/entitlements';

describe('과목 이용 권한 (09 문서 1장, R-07)', () => {
  it('지금은 모든 과목이 열려 있다', () => {
    for (const a of apps) expect(canUseSubject(a.id), a.id).toBe(true);
  });
  it('순서를 바꾸지 않고 거른다', () => {
    expect(usableSubjects(['writing', 'sample'])).toEqual(['writing', 'sample']);
  });
});
