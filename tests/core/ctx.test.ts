import { describe, expect, it, vi } from 'vitest';
import type { AppEntry, SettingField } from '../../src/apps/types';
import type { AudioService } from '../../src/core/audio';
import { createContext, resolveSettings } from '../../src/core/ctx';
import { Store } from '../../src/core/storage';
import { syncSubjects, visibleSubjects } from '../../src/core/subjects';

const now = () => new Date(2026, 9, 21, 10, 0);

const SCHEMA: SettingField[] = [
  { key: 'count', label: '개수', type: 'select', options: [{ value: 3, label: '3' }, { value: 5, label: '5' }], default: 5 },
  { key: 'hint', label: '힌트', type: 'toggle', default: true },
  { key: 'chars', label: '글자', type: 'multi', options: [{ value: 'a', label: 'a' }, { value: 'b', label: 'b' }], default: ['a'] },
];

function setup() {
  const store = new Store(null, { now });
  store.load();
  syncSubjects(store.data.settings.subjects, ['sample']);
  const audio = { sfx: vi.fn(), say: vi.fn(), sayNext: vi.fn(), speak: vi.fn(), play: vi.fn(), stop: vi.fn(), voiceOn: true, sfxOn: true };
  const entry: AppEntry = { id: 'sample', name: '샘플', icon: '', color: '#fff', load: () => Promise.reject(new Error('x')) };
  const exit = vi.fn();
  const feedback = vi.fn();
  const { ctx, dispose } = createContext({
    entry,
    schema: SCHEMA,
    store,
    audio: audio as unknown as AudioService,
    exit,
    isTimeUp: () => false,
    feedback,
    baseUrl: '/little-school/',
  });
  return { store, audio, ctx, dispose, exit, feedback };
}

describe('resolveSettings (명세 8-5)', () => {
  it('저장값이 없으면 default', () => {
    expect(resolveSettings(SCHEMA, {})).toEqual({ count: 5, hint: true, chars: ['a'] });
  });

  it('맞는 저장값은 쓰고, 형식이 틀린 값은 default, schema에 없는 키는 무시', () => {
    expect(resolveSettings(SCHEMA, { count: 3, hint: 'yes', chars: ['b', 'z', 1], old: 1 })).toEqual({ count: 3, hint: true, chars: ['b'] });
    expect(resolveSettings(SCHEMA, { count: 4 }).count).toBe(5);
  });

  it('schema가 없으면 빈 설정', () => {
    expect(resolveSettings(undefined, { a: 1 })).toEqual({});
  });
});

describe('과목 목록 맞추기 (명세 4-1, 8-4)', () => {
  it('registry에 새로 생긴 과목을 켜진 상태·비율 3으로 뒤에 붙인다', () => {
    const subjects = [{ id: 'writing', enabled: false, order: 4, starsPerSticker: 5 as const }];
    expect(syncSubjects(subjects, ['writing', 'sample'])).toBe(true);
    expect(subjects).toEqual([
      { id: 'writing', enabled: false, order: 4, starsPerSticker: 5 },
      { id: 'sample', enabled: true, order: 5, starsPerSticker: 3 },
    ]);
    expect(syncSubjects(subjects, ['writing', 'sample'])).toBe(false);
  });

  it('허브에는 registry에 있고 켜진 과목만 순서대로', () => {
    const subjects = [
      { id: 'b', enabled: true, order: 2, starsPerSticker: 3 as const },
      { id: 'a', enabled: true, order: 1, starsPerSticker: 3 as const },
      { id: 'off', enabled: false, order: 0, starsPerSticker: 3 as const },
      { id: 'gone', enabled: true, order: 0, starsPerSticker: 3 as const },
    ];
    expect(visibleSubjects(subjects, ['a', 'b', 'off'])).toEqual(['a', 'b']);
  });
});

describe('ctx (명세 4-3)', () => {
  it('settings는 읽기 전용, 저장된 과목 설정을 반영한다', () => {
    const { ctx } = setup();
    expect(ctx.settings).toEqual({ count: 5, hint: true, chars: ['a'] });
    expect(Object.isFrozen(ctx.settings)).toBe(true);
  });

  it('store는 apps.<id>.data에 저장하고, 꺼낸 값을 고쳐도 저장 데이터는 그대로', () => {
    const { ctx, store } = setup();
    ctx.store.set('progress', { level: 2, done: ['a'] });
    expect(store.data.apps.sample.data.progress).toEqual({ level: 2, done: ['a'] });
    const p = ctx.store.get<{ level: number }>('progress')!;
    p.level = 99;
    expect(ctx.store.get<{ level: number }>('progress')!.level).toBe(2);
    ctx.store.set('progress', undefined);
    expect('progress' in store.data.apps.sample.data).toBe(false);
    expect(ctx.store.get('nothing')).toBeUndefined();
  });

  it('log.record는 과목별 기록에 쌓는다', () => {
    const { ctx, store } = setup();
    ctx.log.record({ item: 'ㄱ', correct: false, durationMs: 1234.4, meta: { errors: ['order'] } });
    expect(store.data.logs.sample).toHaveLength(1);
    expect(store.data.logs.sample[0]).toMatchObject({ item: 'ㄱ', correct: false, ms: 1234, meta: { errors: ['order'] } });
  });

  it('reward.star는 이 과목에 별을 쌓고 별 효과음을 낸다. status로 상태를 본다', () => {
    const { ctx, store, audio } = setup();
    expect(ctx.reward.status()).toEqual({ stars: 0, ratio: 3, doneToday: false });
    const r = ctx.reward.star(1, 'sample-complete');
    expect(r).toMatchObject({ accepted: true, stars: 1, ratio: 3 });
    expect(audio.sfx).toHaveBeenCalledWith('star');
    expect(store.data.rewards.stars.sample).toBe(1);
    expect(store.daySubject('sample').stars).toBe(1);
  });

  it('오늘 스티커를 이미 받은 과목은 별을 받지 않는다', () => {
    const { ctx, store, audio } = setup();
    store.daySubject('sample').sticker = true;
    expect(ctx.reward.star().accepted).toBe(false);
    expect(audio.sfx).not.toHaveBeenCalled();
    expect(ctx.reward.status().doneToday).toBe(true);
  });

  it('audio는 공통 소리 서비스로 넘기고, exit·feedback은 껍데기가 처리한다', () => {
    const { ctx, audio, exit, feedback } = setup();
    ctx.audio.say('sample.play.intro');
    ctx.audio.sfx('tap');
    ctx.ui.feedback('oops');
    ctx.exit();
    expect(audio.say).toHaveBeenCalledWith('sample.play.intro');
    expect(audio.sfx).toHaveBeenCalledWith('tap');
    expect(feedback).toHaveBeenCalledWith('oops');
    expect(exit).toHaveBeenCalled();
    expect(ctx.baseUrl).toBe('/little-school/');
    expect(ctx.audio.voiceOn).toBe(true);
  });

  it('dispose는 과목이 풀지 않은 입력 등록을 모두 푼다', () => {
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    const { ctx, dispose } = setup();
    const listeners = new Set<string>();
    const el = {
      addEventListener: (t: string) => listeners.add(t),
      removeEventListener: (t: string) => listeners.delete(t),
    } as unknown as HTMLElement;
    const h = { down: () => true, move() {}, up() {}, cancel() {} };
    const off = ctx.input.attach(el, h);
    ctx.input.attach(el, h);
    expect(listeners.size).toBeGreaterThan(0);
    off();
    off(); // 두 번 불러도 괜찮다
    dispose();
    expect(listeners.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
