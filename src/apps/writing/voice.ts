/** 또박또박 글씨 대사 ID (src/apps/writing/voices.json, 명세 15-2) */
import type { Glyph } from './data/types';
import type { CategoryId } from './categories';

/** 글자 읽기: writing.char.u3131 (ㄱ). 숫자를 ‘하나, 둘’로 읽으면 -native */
export function glyphVoiceId(g: Glyph, numberReading: string): string {
  const base = `writing.char.u${g.id.codePointAt(0)!.toString(16).padStart(4, '0')}`;
  return numberReading === 'native' && g.speakNative ? `${base}-native` : base;
}

export const categoryVoiceId = (id: CategoryId) => `writing.category.${id}`;

/** 칭찬 문구 i(0부터) */
export const praiseVoiceId = (i: number) => `writing.praise.${i + 1}`;
export const retryVoiceId = (i: number) => `writing.retry.${i + 1}`;
