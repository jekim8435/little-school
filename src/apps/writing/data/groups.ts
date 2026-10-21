import type { GroupId, GroupInfo } from './types';

const range = (from: string, to: string) =>
  Array.from({ length: to.charCodeAt(0) - from.charCodeAt(0) + 1 }, (_, i) =>
    String.fromCharCode(from.charCodeAt(0) + i),
  );

/** 그룹을 늘릴 때는 여기와 glyphs/*.json만 고친다 */
export const GROUPS: GroupInfo[] = [
  { id: 'digit', name: '숫자', sample: '1', chars: range('0', '9') },
  { id: 'lower', name: '영어 소문자', sample: 'a', chars: range('a', 'z') },
  { id: 'upper', name: '영어 대문자', sample: 'A', chars: range('A', 'Z') },
  { id: 'consonant', name: '기본 자음', sample: 'ㄱ', chars: [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'] },
  { id: 'double', name: '쌍자음', sample: 'ㄲ', chars: [...'ㄲㄸㅃㅆㅉ'] },
  { id: 'vowel', name: '기본 모음', sample: 'ㅏ', chars: [...'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'] },
  { id: 'complex', name: '복합 모음', sample: 'ㅐ', chars: [...'ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ'] },
];

export function getGroup(id: GroupId): GroupInfo {
  const g = GROUPS.find((g) => g.id === id);
  if (!g) throw new Error(`알 수 없는 그룹: ${id}`);
  return g;
}
