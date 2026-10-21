/**
 * 또박또박 글씨 과목 설정 (명세 14-4). 부모 모드 > 또박또박 글씨 설정에 자동으로 그려진다.
 * key·기본값은 한글쓰기 앱(store/settings.ts)과 같게 둔다. 효과음·음성 읽기는 공통 설정으로 옮겼다.
 */
import type { SettingField } from '../types';

export const SETTINGS_SCHEMA: SettingField[] = [
  {
    key: 'difficulty',
    label: '판정 난이도',
    group: '판정',
    type: 'select',
    options: [
      { value: 'easy', label: '쉬움' },
      { value: 'normal', label: '보통' },
      { value: 'hard', label: '어려움' },
    ],
    default: 'easy',
    help: '획의 시작·끝·모양을 얼마나 정확하게 봐야 맞다고 할지예요',
  },
  {
    key: 'freeHint',
    label: '혼자 쓰기 힌트',
    group: '도움',
    type: 'select',
    options: [
      { value: 'outline', label: '윤곽 보여 주기' },
      { value: 'none', label: '없음' },
    ],
    default: 'outline',
    help: '혼자 쓰기에서 글자 윤곽을 흐리게 보여 줘요',
  },
  {
    key: 'autoDemo',
    label: '획순 애니메이션 자동 재생',
    group: '도움',
    type: 'toggle',
    default: true,
    help: '따라 쓰기에서 글자를 열 때 획순을 먼저 보여 줘요',
  },
  {
    key: 'numberReading',
    label: '숫자 읽기',
    group: '읽기',
    type: 'select',
    options: [
      { value: 'sino', label: '일, 이, 삼' },
      { value: 'native', label: '하나, 둘, 셋' },
    ],
    default: 'sino',
    help: '숫자를 읽어 줄 때 ‘일, 이, 삼’ 또는 ‘하나, 둘, 셋’으로 읽어요',
  },
];

export interface WritingSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  freeHint: 'outline' | 'none';
  autoDemo: boolean;
  numberReading: 'sino' | 'native';
}
