/**
 * 한자똑똑 (1)~(3) · id `hanja-1`… — 가족용 전용 (subjects/hanja-ttokttok.md).
 * 세트를 받아 한자 공용 엔진(src/shared/hanja/)을 띄우는 진입점. 새 세트는 data/set-N.json + 아래 SETS 한 줄 + registry 한 줄.
 * 대사·음원은 시리즈가 함께 쓴다(대사 hanja.*, 음원 public/apps/hanja/voice/, registry의 folder: 'hanja').
 */
import type { AppModule } from '../types';
import type { HanjaVoices } from '../../shared/hanja/config';
import { createHanjaModule } from '../../shared/hanja/module';
import { charKey, type HanjaSet } from '../../shared/hanja/types';
import set1 from './data/set-1.json';
import { hanjaSettings } from './settings';
import { HANJA_STRINGS } from './strings';

const SETS: Record<string, HanjaSet> = {
  'hanja-1': set1 as HanjaSet,
};

export const HANJA_VOICES: HanjaVoices = {
  char: (c) => `hanja.char.${charKey(c)}`,
  meaning: (c) => `hanja.meaning.${charKey(c)}`,
  ask: {
    pick: 'hanja.ask.pick-activity',
    cards: 'hanja.ask.cards',
    listen: 'hanja.ask.listen',
    picture: 'hanja.ask.picture',
    read: 'hanja.ask.read',
    match: 'hanja.ask.match',
    board: 'hanja.ask.board',
    locked: 'hanja.ask.locked',
    leave: 'hanja.ask.leave',
    retry: 'hanja.ask.retry',
  },
  praise: { round: 'hanja.praise.round', board: 'hanja.praise.board' },
};

/** 과목 id의 모듈 (registry에서 부른다) */
export function hanjaApp(id: string): AppModule {
  const set = SETS[id];
  if (!set) throw new Error(`한자 세트가 없어요: ${id}`);
  return createHanjaModule({ id, set, strings: HANJA_STRINGS, voices: HANJA_VOICES }, hanjaSettings(set));
}

export { SETS as HANJA_SETS };
