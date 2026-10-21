import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultData,
  KEEP_DAYS,
  MAX_LOGS,
  migrate,
  normalize,
  SCHEMA_VERSION,
  STORAGE_KEY,
  Store,
  type KeyValue,
} from '../../src/core/storage';

const TODAY = '2026-10-21';
const now = () => new Date(2026, 9, 21, 10, 0);

function memory(initial: Record<string, string> = {}): KeyValue & { map: Record<string, string>; writes: number } {
  const map = { ...initial };
  return {
    map,
    writes: 0,
    getItem: (k) => (k in map ? map[k] : null),
    setItem(k, v) {
      this.writes++;
      map[k] = v;
    },
    removeItem: (k) => {
      delete map[k];
    },
  };
}

describe('기본 데이터', () => {
  it('명세 9장 모양으로 시작하고, 지금 모으는 판 1개가 있다', () => {
    const d = defaultData(TODAY);
    expect(d.schemaVersion).toBe(SCHEMA_VERSION);
    expect(d.createdAt).toBe(TODAY);
    expect(d.settings.dailyMinutes).toBe(20);
    expect(d.settings.graceMinutes).toBe(5);
    expect(d.settings.boardSize).toBe(10);
    expect(d.settings.audio).toEqual({ sfxOn: true, sfxVolume: 'normal', voiceOn: true, voiceVolume: 'normal', voiceRate: 'slow' });
    expect(d.settings.parentLock).toEqual({ type: 'math', pin: null });
    expect(d.settings.penOnly).toBe(false);
    expect(d.rewards.boards).toEqual([
      { no: 1, size: 10, startedAt: TODAY, completedAt: null, paidAt: null, rewardText: null, stickers: [] },
    ]);
  });
});

describe('normalize: 깨지거나 빠진 값 정리', () => {
  it('아무것도 없으면 기본값', () => {
    expect(normalize(null, TODAY)).toEqual(defaultData(TODAY));
    expect(normalize('엉뚱한 값', TODAY)).toEqual(defaultData(TODAY));
  });

  it('명세 9장의 예시 데이터를 그대로 읽는다', () => {
    const sample = {
      schemaVersion: 1,
      createdAt: '2026-10-20',
      settings: {
        dailyMinutes: 20,
        graceMinutes: 5,
        boardSize: 10,
        audio: { sfxOn: true, sfxVolume: 'normal', voiceOn: true, voiceVolume: 'normal', voiceRate: 'slow' },
        parentLock: { type: 'math', pin: null },
        subjects: [
          { id: 'writing', enabled: true, order: 0, starsPerSticker: 3 },
          { id: 'sample', enabled: false, order: 1, starsPerSticker: 3 },
        ],
      },
      rewards: {
        stars: { writing: 2 },
        boards: [
          {
            no: 1, size: 10, startedAt: '2026-10-20', completedAt: '2026-10-28', paidAt: '2026-10-29', rewardText: '놀이터 가기',
            stickers: [{ art: 'lion', subject: 'writing', date: '2026-10-20' }],
          },
          { no: 2, size: 10, startedAt: '2026-10-28', completedAt: '2026-11-05', paidAt: null, rewardText: null, stickers: [] },
          { no: 3, size: 10, startedAt: '2026-11-05', completedAt: null, paidAt: null, rewardText: null, stickers: [] },
        ],
      },
      days: { '2026-10-21': { extraMinutes: 0, subjects: { writing: { ms: 900000, stars: 3, sticker: true } } } },
      logs: { writing: [{ t: 1792480456009, item: 'ㄱ', correct: true, ms: 4200, meta: { category: 'consonant' } }] },
      apps: {
        writing: { version: 1, settings: { difficulty: 'easy', freeHint: 'outline', autoDemo: true, numberReading: 'sino' }, data: {} },
      },
    };
    const d = normalize(JSON.parse(JSON.stringify(sample)), TODAY);
    expect(d.settings.subjects).toEqual(sample.settings.subjects);
    expect(d.rewards).toEqual(sample.rewards);
    expect(d.days).toEqual(sample.days);
    expect(d.logs).toEqual(sample.logs);
    expect(d.apps).toEqual(sample.apps);
    expect(d.createdAt).toBe('2026-10-20');
  });

  it('허용되지 않는 설정 값은 기본값으로', () => {
    const d = normalize(
      {
        settings: {
          dailyMinutes: 7,
          boardSize: 12,
          audio: { sfxOn: 'yes', sfxVolume: 'loud', voiceRate: 'fast' },
          parentLock: { type: 'pin', pin: '12' },
          subjects: [{ id: 'writing', starsPerSticker: 4 }, { enabled: true }, 'x'],
        },
      },
      TODAY,
    );
    expect(d.settings.dailyMinutes).toBe(20);
    expect(d.settings.boardSize).toBe(10);
    expect(d.settings.audio.sfxOn).toBe(true);
    expect(d.settings.audio.sfxVolume).toBe('normal');
    expect(d.settings.audio.voiceRate).toBe('slow');
    expect(d.settings.parentLock).toEqual({ type: 'math', pin: null }); // 4자리가 아닌 암호는 버리고 곱셈으로
    expect(d.settings.subjects).toEqual([{ id: 'writing', enabled: true, order: 0, starsPerSticker: 3 }]);
  });

  it('하루 학습 시간 ‘제한 없음’은 null로 남는다', () => {
    expect(normalize({ settings: { dailyMinutes: null } }, TODAY).settings.dailyMinutes).toBeNull();
  });

  it('지금 모으는 판이 없으면(마지막 판이 완성) 새 판을 붙인다', () => {
    const d = normalize(
      { settings: { boardSize: 5 }, rewards: { boards: [{ no: 1, size: 10, startedAt: '2026-10-01', completedAt: '2026-10-20', stickers: [] }] } },
      TODAY,
    );
    expect(d.rewards.boards).toHaveLength(2);
    expect(d.rewards.boards[1]).toMatchObject({ no: 2, size: 5, startedAt: '2026-10-20', completedAt: null });
  });

  it('별은 양의 정수만 남긴다', () => {
    const d = normalize({ rewards: { stars: { a: 2, b: -1, c: 'x', d: 1.7 } } }, TODAY);
    expect(d.rewards.stars).toEqual({ a: 2, d: 1 });
  });
});

describe('migrate', () => {
  it('지금 버전은 그대로', () => {
    const raw = { schemaVersion: SCHEMA_VERSION, x: 1 };
    expect(migrate(raw)).toEqual(raw);
  });

  it('앱보다 새 버전의 데이터는 거절한다', () => {
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/새 버전/);
  });
});

describe('Store', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('저장된 것이 없으면 기본값으로 시작한다', () => {
    const s = new Store(memory(), { now });
    s.load();
    expect(s.data).toEqual(defaultData(TODAY));
  });

  it('바뀐 뒤 300ms 동안 모아서 한 번만 저장한다', () => {
    const kv = memory();
    const s = new Store(kv, { now });
    s.load();
    s.data.rewards.stars.sample = 1;
    s.changed();
    vi.advanceTimersByTime(200);
    s.data.rewards.stars.sample = 2;
    s.changed();
    vi.advanceTimersByTime(299);
    expect(kv.writes).toBe(0);
    vi.advanceTimersByTime(1);
    expect(kv.writes).toBe(1);
    expect(JSON.parse(kv.map[STORAGE_KEY]).rewards.stars).toEqual({ sample: 2 });
  });

  it('flush는 기다리지 않고 바로 저장하고, 예약된 저장을 취소한다', () => {
    const kv = memory();
    const s = new Store(kv, { now });
    s.load();
    s.changed();
    s.flush();
    vi.advanceTimersByTime(1000);
    expect(kv.writes).toBe(1);
  });

  it('저장한 것을 다시 읽으면 같다 (앱을 다시 열어도 유지)', () => {
    const kv = memory();
    const a = new Store(kv, { now });
    a.load();
    a.daySubject('sample').stars = 2;
    a.app('sample').data.level = 3;
    a.flush();
    const b = new Store(kv, { now });
    b.load();
    expect(b.data).toEqual(a.data);
  });

  it('깨진 데이터는 따로 남겨 두고 새로 시작한다', () => {
    const kv = memory({ [STORAGE_KEY]: '{깨짐' });
    const s = new Store(kv, { now });
    s.load();
    expect(s.data).toEqual(defaultData(TODAY));
    expect(kv.map[`${STORAGE_KEY}:broken`]).toBe('{깨짐');
  });

  it('localStorage를 쓸 수 없어도(null) 메모리에서 동작한다', () => {
    const s = new Store(null, { now });
    s.load();
    s.changed();
    expect(s.flush()).toBe(true);
  });

  it('저장이 실패하면 saveFailed로 알린다', () => {
    const kv = memory();
    kv.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const s = new Store(kv, { now });
    s.load();
    expect(s.flush()).toBe(false);
    expect(s.saveFailed).toBe(true);
  });

  it(`기록은 과목별 최근 ${MAX_LOGS}건, 날짜는 최근 ${KEEP_DAYS}일만 남긴다`, () => {
    const s = new Store(memory(), { now });
    s.load();
    s.data.logs.sample = Array.from({ length: MAX_LOGS + 20 }, (_, i) => ({ t: i, item: String(i), correct: true, ms: 0 }));
    s.day('2026-07-23'); // 90일 전보다 하루 더 앞
    s.day('2026-07-24'); // 오늘 포함 90일째
    s.day(TODAY);
    s.flush();
    expect(s.data.logs.sample).toHaveLength(MAX_LOGS);
    expect(s.data.logs.sample[0].t).toBe(20);
    expect(Object.keys(s.data.days).sort()).toEqual(['2026-07-24', TODAY]);
  });

  it('day/daySubject/app은 없으면 만들고, 있으면 같은 것을 돌려준다', () => {
    const s = new Store(memory(), { now });
    s.load();
    s.daySubject('sample').ms = 1000;
    expect(s.daySubject('sample').ms).toBe(1000);
    expect(s.day().subjects.sample.ms).toBe(1000);
    expect(s.app('sample')).toBe(s.app('sample'));
  });

  describe('백업·복원', () => {
    it('백업 → 전체 초기화 → 복원하면 그대로 돌아온다', () => {
      const s = new Store(memory(), { now });
      s.load();
      s.data.rewards.stars.sample = 2;
      s.data.rewards.boards[0].stickers.push({ art: 'lion', subject: 'sample', date: TODAY });
      s.data.logs.sample = [{ t: 1, item: 'a', correct: false, ms: 10 }];
      const backup = s.exportJson();
      const before = JSON.parse(backup);
      s.reset();
      expect(s.data.rewards.stars).toEqual({});
      const r = s.parseBackup(backup);
      expect(r.ok).toBe(true);
      if (r.ok) s.restore(r.data);
      expect(JSON.parse(s.exportJson())).toEqual(before);
    });

    it('앞뒤 공백·줄바꿈이 붙어도 읽는다', () => {
      const s = new Store(memory(), { now });
      s.load();
      expect(s.parseBackup(`\n  ${s.exportJson()}  \n`).ok).toBe(true);
    });

    it('JSON이 아니거나 꼬마학교 데이터가 아니면 거절한다', () => {
      const s = new Store(memory(), { now });
      s.load();
      expect(s.parseBackup('{"schemaVersion":1,').ok).toBe(false);
      expect(s.parseBackup('[1,2]').ok).toBe(false);
      expect(s.parseBackup('{"hello":1}').ok).toBe(false);
      const newer = s.parseBackup(JSON.stringify({ ...s.data, schemaVersion: SCHEMA_VERSION + 1 }));
      expect(newer.ok).toBe(false);
    });

    it('백업한 날을 기록한다', () => {
      const s = new Store(memory(), { now });
      s.load();
      s.markBackedUp();
      expect(s.data.lastBackupAt).toBe(TODAY);
    });
  });
});
