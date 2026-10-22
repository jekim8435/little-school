/**
 * 한자똑똑 과목 설정 (subjects/hanja-ttokttok.md ‘부모 설정’). 세트마다 배운 한자 판이 달라 세트를 받아 만든다.
 */
import type { HanjaSet } from '../../shared/hanja/types';
import { nextUnlearned } from '../../shared/hanja/types';
import type { SettingField } from '../types';
import { HANJA_SETTINGS_STRINGS as S, HANJA_STRINGS } from './strings';

/** 기본 배운 한자 수 (세트 1: 日 ~ 海 16자) */
const DEFAULT_LEARNED = 16;

export function hanjaSettings(set: HanjaSet): SettingField[] {
  const toggle = (key: 'cards' | 'listen' | 'picture' | 'read' | 'match'): SettingField => ({
    key: `on.${key}`,
    label: HANJA_STRINGS.activities[key],
    group: S.activitiesGroup,
    type: 'toggle',
    default: true,
  });
  return [
    {
      key: 'learned',
      label: S.learned,
      group: S.learnGroup,
      type: 'multi',
      columns: 8,
      // 판 칸: 한자 + 줄바꿈 + 훈음
      options: set.items.map((it) => ({ value: it.char, label: `${it.char}\n${it.meaning} ${it.sound}` })),
      default: set.items.slice(0, DEFAULT_LEARNED).map((it) => it.char),
      help: S.learnedHelp,
      actions: [
        { label: S.addNext, run: (cur) => cur.concat(nextUnlearned(set.items, cur, 2)) },
        { label: S.clearAll, run: () => [] },
      ],
    },
    { key: 'preview', label: S.preview, group: S.learnGroup, type: 'toggle', default: false, help: S.previewHelp },
    {
      key: 'choiceCount',
      label: S.choiceCount,
      group: S.quizGroup,
      type: 'select',
      options: [3, 4].map((n) => ({ value: n, label: S.choiceOption(n) })),
      default: 4,
      help: S.choiceCountHelp,
    },
    toggle('cards'),
    toggle('listen'),
    toggle('picture'),
    toggle('read'),
    toggle('match'),
  ];
}
