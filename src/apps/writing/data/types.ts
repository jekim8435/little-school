import type { Point, Stroke } from '../../../shared/types';

export type { Point, Stroke };

export type GroupId = 'digit' | 'lower' | 'upper' | 'consonant' | 'double' | 'vowel' | 'complex';

export type ModeId = 'guided' | 'free';

/** JSON 파일에 저장되는 획 (points 또는 SVG path 중 하나) */
export interface StrokeSource {
  points?: Point[];
  /** SVG 경로(M/L/C/Q/Z, 절대 좌표). 로딩할 때 점열로 샘플링한다 */
  path?: string;
  /** i·j의 점처럼 짧은 획 */
  type?: 'dot';
}

/** JSON 파일에 저장되는 글자 */
export interface GlyphSource {
  id: string;
  group: GroupId;
  name: string;
  speak: string;
  /** 숫자를 고유어로 읽을 때 (설정 numberReading: native) */
  speakNative?: string;
  lang: 'ko-KR' | 'en-US';
  strokes: StrokeSource[];
  alternateOrders?: number[][];
}

export interface Glyph {
  id: string;
  group: GroupId;
  name: string;
  speak: string;
  speakNative?: string;
  lang: 'ko-KR' | 'en-US';
  strokes: Stroke[];
  alternateOrders: number[][];
}

export interface GroupInfo {
  id: GroupId;
  name: string;
  /** 카드에 보여줄 대표 글자 */
  sample: string;
  /** 전체 글자 목록(데이터가 아직 없는 글자도 포함) */
  chars: string[];
}
