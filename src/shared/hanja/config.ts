/**
 * 한자 과목 하나를 띄우는 설정. 과목(세트)마다 데이터·문구·대사 접두어를 넘겨 공용 엔진을 쓴다.
 */
import type { HanjaSet } from './types';

/** 활동 id. listen은 화면 이름이 ‘한자 찾기’로 바뀌었지만 기록·설정 키와 맞추려고 id는 그대로 둔다 */
export type ActivityId = 'cards' | 'listen' | 'picture' | 'read' | 'match' | 'board';

/** 활동 고르기 화면의 순서 (2줄 × 3) */
export const ACTIVITIES: ActivityId[] = ['cards', 'listen', 'picture', 'read', 'match', 'board'];

/** 고르기 활동 (별 있음, 배운 한자 4자 미만이면 잠김) */
export const QUIZ_ACTIVITIES: ActivityId[] = ['listen', 'picture', 'read'];
/** 별이 나오는 활동 */
export const STAR_ACTIVITIES: ActivityId[] = ['listen', 'picture', 'read', 'match'];
/** 고르기 활동·짝 맞추기를 여는 최소 배운 한자 수 */
export const MIN_LEARNED = 4;

/** 화면 문구 (과목의 strings.ts가 채운다) */
export interface HanjaStrings {
  activities: Record<ActivityId, string>;
  title: string;
  locked: string;
  back: string;
  leaveConfirm: string;
  replay: string;
  next: string;
  soon: string;
  retry: string;
  boardOf: (n: number, total: number) => string;
  roundDone: string;
  roundDoneSub: string;
  /** 한자 카드를 한 바퀴 다 본 칭찬 화면 아랫줄 */
  cardsDoneSub: string;
  boardDone: string;
}

/** 대사 ID (과목의 voices.json에 등록) */
export interface HanjaVoices {
  /** 한자 훈음: prefix.char.u6d77 */
  char(char: string): string;
  /** 뜻만: prefix.meaning.u6d77 */
  meaning(char: string): string;
  ask: Record<ActivityId | 'pick' | 'locked' | 'leave' | 'retry', string>;
  praise: { round: string; board: string };
}

export interface HanjaConfig {
  /** 과목 id */
  id: string;
  set: HanjaSet;
  strings: HanjaStrings;
  voices: HanjaVoices;
}

/** 과목 설정 값 (settingsSchema 키) */
export interface HanjaSettings {
  learned: string[];
  preview: boolean;
  choiceCount: number;
  'on.cards': boolean;
  'on.listen': boolean;
  'on.picture': boolean;
  'on.read': boolean;
  'on.match': boolean;
}
