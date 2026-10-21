/** 판정 관련 상수는 모두 이 파일에 모은다 (값은 실기기에서 써 보며 조정) */

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Tolerance {
  /** 시작점 거리 허용치 (0~100 좌표) */
  startTol: number;
  /** 끝점 거리 허용치 */
  endTol: number;
  /** 리샘플링한 대응점 평균 거리 허용치 */
  shapeTol: number;
}

export const TOLERANCES: Record<Difficulty, Tolerance> = {
  easy: { startTol: 18, endTol: 20, shapeTol: 14 },
  normal: { startTol: 13, endTol: 15, shapeTol: 10 },
  hard: { startTol: 9, endTol: 10, shapeTol: 7 },
};

/** 리샘플링 점 개수 */
export const RESAMPLE_N = 32;

/** 이보다 짧은 획은 실수 터치로 보고 무시 (dot 획은 예외) */
export const MIN_STROKE_LENGTH = 3;

/** (끝−시작) 벡터의 코사인 유사도 최소값 */
export const DIRECTION_MIN_COS = 0.5;

/** 템플릿의 시작·끝 거리가 이보다 가까우면 닫힌 획(ㅇ, O, 0)으로 본다 */
export const CLOSED_STROKE_MAX_GAP = 10;

/**
 * 닫힌 획의 회전 방향을 볼지 정하는 기준: |부호 있는 면적| ÷ (같은 둘레 원의 면적).
 * 8처럼 두 고리가 반대로 도는 획은 면적이 상쇄되어 이 값이 작으므로 모양 검사에만 맡긴다
 */
export const MIN_LOOP_RATIO = 0.25;
