/**
 * 구슬 세기 과목 설정 (subjects/counting.md 9장). 효과음·음성·소리 크기는 공통 설정이라 두지 않는다.
 */
import type { SettingField } from '../types';
import { ACTIVITIES, type ActivityId } from './logic/config';
import { COUNTING_SETTINGS_STRINGS as S, COUNTING_STRINGS } from './strings';

const toggle = (a: ActivityId): SettingField => ({
  key: `on.${a}`,
  label: COUNTING_STRINGS.activities[a],
  group: S.activitiesGroup,
  type: 'toggle',
  default: true,
});

export const countingSettings: SettingField[] = [
  {
    key: 'maxNumber',
    label: S.maxNumber,
    group: S.numberGroup,
    type: 'select',
    options: [10, 20, 30].map((n) => ({ value: n, label: S.numberOption(n) })),
    default: 20,
    help: S.maxNumberHelp,
  },
  { key: 'autoLevel', label: S.autoLevel, group: S.numberGroup, type: 'toggle', default: true, help: S.autoLevelHelp },
  {
    key: 'choices',
    label: S.choices,
    group: S.quizGroup,
    type: 'select',
    options: [3, 4].map((n) => ({ value: n, label: S.choiceOption(n) })),
    default: 3,
    help: S.choicesHelp,
  },
  ...ACTIVITIES.map(toggle),
];
