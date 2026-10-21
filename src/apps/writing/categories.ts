/**
 * 또박또박 글씨의 카테고리 7개 (명세 14-3). 102자.
 * 글자 데이터(glyphs/*.json)의 그룹 id는 한글쓰기 앱 그대로 두고, 카테고리 id·이름·순서만 명세에 맞춘다.
 * 카테고리 id는 저장 데이터·별 이유(clear:<id>)·대사 ID에 쓰므로 바꾸지 않는다.
 */
import { getGlyphs } from './data/glyphs';
import type { Glyph, GroupId } from './data/types';

export type CategoryId = 'digit' | 'consonant' | 'vowel' | 'double-consonant' | 'compound-vowel' | 'lower' | 'upper';

export interface Category {
  id: CategoryId;
  group: GroupId;
  name: string;
  /** 카드에 보여 줄 대표 글자 */
  sample: string;
}

export const CATEGORIES: Category[] = [
  { id: 'digit', group: 'digit', name: '숫자', sample: '1' },
  { id: 'consonant', group: 'consonant', name: '자음', sample: 'ㄱ' },
  { id: 'vowel', group: 'vowel', name: '모음', sample: 'ㅏ' },
  { id: 'double-consonant', group: 'double', name: '쌍자음', sample: 'ㄲ' },
  { id: 'compound-vowel', group: 'complex', name: '합성모음', sample: 'ㅐ' },
  { id: 'lower', group: 'lower', name: '영어 소문자', sample: 'a' },
  { id: 'upper', group: 'upper', name: '영어 대문자', sample: 'A' },
];

export function findCategory(id: string): Category | undefined {
  for (const c of CATEGORIES) if (c.id === id) return c;
  return undefined;
}

export function categoryOfGroup(group: string): Category | undefined {
  for (const c of CATEGORIES) if (c.group === group) return c;
  return undefined;
}

export function glyphsOf(c: Category): Glyph[] {
  return getGlyphs(c.group);
}
