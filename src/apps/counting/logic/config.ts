/**
 * 구슬 세기 상수 (subjects/counting.md). 한 판 문제 수는 아이 반응을 보고 여기 한 곳에서 바꾼다(4장).
 */

export type ActivityId = 'count' | 'frame' | 'ten' | 'match' | 'board';
/** 활동 고르기 화면 순서 (위 3개 · 아래 2개) */
export const ACTIVITIES: ActivityId[] = ['count', 'frame', 'ten', 'match', 'board'];
/** 별이 나오는 활동 */
export const STAR_ACTIVITIES: ActivityId[] = ['count', 'frame', 'ten', 'match'];

/** 세어 보기 한 판 */
export const COUNT_ROUND = 6;
/** 10칸 판 한 판 */
export const FRAME_ROUND = 6;
/** 10 만들기 한 판 */
export const TEN_ROUND = 6;
/** 숫자 짝짓기: 단계별 장 수 × 한 장의 쌍 수 (3단계는 카드를 넓혀 사물을 키우려고 3쌍 × 4장) */
export const MATCH_LAYOUT: Record<1 | 2 | 3, { sheets: number; pairs: number }> = {
  1: { sheets: 3, pairs: 4 },
  2: { sheets: 3, pairs: 4 },
  3: { sheets: 4, pairs: 3 },
};

/** 세어 보기 사물 8종 (pictures/<id>.svg) */
export const OBJECTS = ['apple', 'strawberry', 'car', 'fish', 'duck', 'ball', 'star', 'flower'];

/** 과목 설정 값 (settingsSchema, 9장) */
export interface CountingSettings {
  maxNumber: number;
  autoLevel: boolean;
  choices: number;
  'on.count': boolean;
  'on.frame': boolean;
  'on.ten': boolean;
  'on.match': boolean;
  'on.board': boolean;
}
