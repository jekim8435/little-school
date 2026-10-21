/**
 * 한글쓰기 앱 설정 1회 이전 (명세 14-4). 껍데기가 부팅 때 한 번 실행한다
 * (과목은 localStorage를 직접 읽지 않으므로 껍데기가 맡는다).
 * - `wp.settings`의 과목 설정 4개 → apps.writing.settings
 * - 효과음·음성 읽기 → settings.audio (부모가 꼬마학교 공통 설정의 소리를 아직 바꾼 적이 없을 때만)
 * - `wp.lastGroup` → apps.writing.data.lastCategory
 * - 옮긴 뒤 apps.writing.data.migratedFrom = 'wp.settings'. 기존 키는 롤백 대비로 남겨 둔다
 * 아이패드 홈 화면 앱은 앱마다 저장소가 따로라 대개 읽을 것이 없다 → 그냥 기본값으로 시작
 */
import type { KeyValue, Store } from './storage';

export const LEGACY_SETTINGS_KEY = 'wp.settings';
export const LEGACY_LAST_GROUP_KEY = 'wp.lastGroup';

const ALLOWED: Record<string, readonly unknown[]> = {
  difficulty: ['easy', 'normal', 'hard'],
  freeHint: ['outline', 'none'],
  autoDemo: [true, false],
  numberReading: ['sino', 'native'],
};

/** 한글쓰기 앱 그룹 id → 또박또박 글씨 카테고리 id */
const GROUP_TO_CATEGORY: Record<string, string> = {
  digit: 'digit',
  consonant: 'consonant',
  vowel: 'vowel',
  double: 'double-consonant',
  complex: 'compound-vowel',
  lower: 'lower',
  upper: 'upper',
};

/** 옮겼으면 true */
export function migrateWritingFromLegacy(store: Store, kv: KeyValue | null): boolean {
  if (!kv) return false;
  const app = store.app('writing');
  if (app.data.migratedFrom) return false;
  let text: string | null = null;
  try {
    text = kv.getItem(LEGACY_SETTINGS_KEY);
  } catch {
    return false;
  }
  if (text === null) return false;

  let old: Record<string, unknown> = {};
  try {
    const v = JSON.parse(text) as unknown;
    if (v && typeof v === 'object') old = v as Record<string, unknown>;
  } catch {
    /* 깨진 값이면 아무것도 옮기지 않고 표시만 한다 */
  }
  for (const key of Object.keys(ALLOWED)) {
    if (ALLOWED[key].indexOf(old[key]) >= 0) app.settings[key] = old[key];
  }
  const audio = store.data.settings.audio;
  if (!store.data.settings.audioEdited) {
    if (typeof old.sound === 'boolean') audio.sfxOn = old.sound;
    if (typeof old.voice === 'boolean') audio.voiceOn = old.voice;
  }
  try {
    const g = kv.getItem(LEGACY_LAST_GROUP_KEY);
    if (g && GROUP_TO_CATEGORY[g]) app.data.lastCategory = GROUP_TO_CATEGORY[g];
  } catch {
    /* 없으면 그만 */
  }
  app.data.migratedFrom = LEGACY_SETTINGS_KEY;
  store.changed();
  return true;
}
