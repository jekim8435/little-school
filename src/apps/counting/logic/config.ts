/**
 * 구슬 세기 상수 (subjects/counting.md). 한 판 문제 수는 아이 반응을 보고 여기 한 곳에서 바꾼다(4장).
 */

export type ActivityId = 'count' | 'frame' | 'match' | 'board';
/** 활동 고르기 화면 순서 (2 × 2) */
export const ACTIVITIES: ActivityId[] = ['count', 'frame', 'match', 'board'];
/** 별이 나오는 활동 */
export const STAR_ACTIVITIES: ActivityId[] = ['count', 'frame', 'match'];

/** 세어 보기 한 판 */
export const COUNT_ROUND = 6;
/** 10칸 판 한 판 */
export const FRAME_ROUND = 6;
/** 10칸 판 한 판 중 ‘10이 되려면 몇 개 더?’ 문제 수 (2단계부터) */
export const MORE_PER_ROUND = 2;
/** 숫자 짝짓기: 장 수 × 한 장의 쌍 수 */
export const MATCH_SHEETS = 3;
export const PAIRS_PER_SHEET = 4;

/** 세어 보기 사물 8종 (pictures/<id>.svg) */
export const OBJECTS = ['apple', 'strawberry', 'car', 'fish', 'duck', 'ball', 'star', 'flower'];

/** 과목 설정 값 (settingsSchema, 9장) */
export interface CountingSettings {
  maxNumber: number;
  autoLevel: boolean;
  choices: number;
  'on.count': boolean;
  'on.frame': boolean;
  'on.match': boolean;
  'on.board': boolean;
}
