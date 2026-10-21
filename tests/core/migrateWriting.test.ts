import { describe, expect, it } from 'vitest';
import { migrateWritingFromLegacy } from '../../src/core/migrateWriting';
import { Store, type KeyValue } from '../../src/core/storage';

const now = () => new Date(2026, 9, 21, 10, 0);

function setup(legacy: Record<string, string>) {
  const map = { ...legacy };
  const kv: KeyValue = {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => void (map[k] = v),
    removeItem: (k) => void delete map[k],
  };
  const store = new Store(null, { now });
  store.load();
  return { store, kv, map };
}

const OLD = JSON.stringify({ difficulty: 'hard', freeHint: 'none', autoDemo: false, sound: false, voice: true, numberReading: 'native' });

describe('한글쓰기 앱 설정 1회 이전 (명세 14-4)', () => {
  it('과목 설정 4개는 apps.writing.settings로, 효과음·음성은 공통 설정으로', () => {
    const { store, kv } = setup({ 'wp.settings': OLD, 'wp.lastGroup': 'complex' });
    expect(migrateWritingFromLegacy(store, kv)).toBe(true);
    expect(store.app('writing').settings).toEqual({ difficulty: 'hard', freeHint: 'none', autoDemo: false, numberReading: 'native' });
    expect(store.data.settings.audio.sfxOn).toBe(false);
    expect(store.data.settings.audio.voiceOn).toBe(true);
    expect(store.app('writing').data.lastCategory).toBe('compound-vowel');
    expect(store.app('writing').data.migratedFrom).toBe('wp.settings');
  });

  it('부모가 공통 설정의 소리를 이미 바꿨으면 효과음·음성은 덮어쓰지 않는다', () => {
    const { store, kv } = setup({ 'wp.settings': OLD });
    store.data.settings.audioEdited = true;
    migrateWritingFromLegacy(store, kv);
    expect(store.data.settings.audio.sfxOn).toBe(true);
    expect(store.app('writing').settings.difficulty).toBe('hard');
  });

  it('한 번만 한다 (다시 실행해도 바뀌지 않음), 기존 키는 남겨 둔다', () => {
    const { store, kv, map } = setup({ 'wp.settings': OLD });
    migrateWritingFromLegacy(store, kv);
    store.app('writing').settings.difficulty = 'easy';
    expect(migrateWritingFromLegacy(store, kv)).toBe(false);
    expect(store.app('writing').settings.difficulty).toBe('easy');
    expect(map['wp.settings']).toBe(OLD);
  });

  it('기존 키가 없으면(아이패드 홈 화면 앱처럼 저장소가 따로) 아무것도 하지 않는다', () => {
    const { store, kv } = setup({});
    expect(migrateWritingFromLegacy(store, kv)).toBe(false);
    expect(store.app('writing').data.migratedFrom).toBeUndefined();
  });

  it('이상한 값은 버린다', () => {
    const { store, kv } = setup({ 'wp.settings': JSON.stringify({ difficulty: 'super', autoDemo: 'yes' }) });
    migrateWritingFromLegacy(store, kv);
    expect(store.app('writing').settings).toEqual({});
    expect(store.app('writing').data.migratedFrom).toBe('wp.settings');
  });
});
