/**
 * 여러 과목이 함께 쓰는 글자 모양 타입 (또박또박 글씨에서 승격, 명세 14-1).
 * 판정(shared/judge)·가이드(shared/canvas)는 획만 있으면 되므로 과목별 글자 정보(이름·읽기 등)는 모른다.
 */

/** 0~100 정규화 좌표의 점 */
export type Point = [number, number];

/** 로딩이 끝난 획: 항상 점열을 가진다 */
export interface Stroke {
  points: Point[];
  /** i·j의 점처럼 짧은 획 */
  type?: 'dot';
}

/** 판정·가이드에 필요한 글자 모양 */
export interface Glyph {
  strokes: Stroke[];
  /** 정답으로 인정하는 다른 획 순서 */
  alternateOrders: number[][];
}
