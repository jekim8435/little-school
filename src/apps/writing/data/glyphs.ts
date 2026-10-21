import type { Glyph, GlyphSource, GroupId, Stroke, StrokeSource } from './types';
import { samplePath } from './svgPath';
import { getGroup } from './groups';
import digit from './glyphs/digit.json';
import lower from './glyphs/lower.json';
import upper from './glyphs/upper.json';
import consonant from './glyphs/consonant.json';
import double from './glyphs/double.json';
import vowel from './glyphs/vowel.json';
import complex from './glyphs/complex.json';

// JSON 추론 타입(number[][])은 튜플과 맞지 않으므로 스키마 타입으로 단언한다. 형식 검사는 tests/data.test.ts가 맡는다
const asSources = (json: unknown) => json as GlyphSource[];

const SOURCES: Record<GroupId, GlyphSource[]> = {
  digit: asSources(digit),
  lower: asSources(lower),
  upper: asSources(upper),
  consonant: asSources(consonant),
  double: asSources(double),
  vowel: asSources(vowel),
  complex: asSources(complex),
};

export function loadStroke(s: StrokeSource): Stroke {
  const points = s.points ?? (s.path ? samplePath(s.path) : null);
  if (!points || points.length === 0) throw new Error('획에 points나 path가 필요합니다');
  return s.type ? { points, type: s.type } : { points };
}

export function loadGlyph(src: GlyphSource): Glyph {
  return {
    id: src.id,
    group: src.group,
    name: src.name,
    speak: src.speak,
    ...(src.speakNative ? { speakNative: src.speakNative } : {}),
    lang: src.lang,
    strokes: src.strokes.map(loadStroke),
    alternateOrders: src.alternateOrders ?? [],
  };
}

const cache = new Map<GroupId, Glyph[]>();

/** 그룹의 글자 데이터(그룹 chars 순서대로, 데이터가 있는 것만) */
export function getGlyphs(group: GroupId): Glyph[] {
  let list = cache.get(group);
  if (!list) {
    const byId = new Map(SOURCES[group].map((s) => [s.id, loadGlyph(s)]));
    list = getGroup(group)
      .chars.map((c) => byId.get(c))
      .filter((g): g is Glyph => !!g);
    cache.set(group, list);
  }
  return list;
}

export function getGlyph(group: GroupId, id: string): Glyph | undefined {
  return getGlyphs(group).find((g) => g.id === id);
}

/** 그룹 JSON 원본 (편집기용) */
export function getSources(group: GroupId): GlyphSource[] {
  return SOURCES[group];
}

export function getAllSources(): GlyphSource[] {
  return Object.values(SOURCES).flat();
}
