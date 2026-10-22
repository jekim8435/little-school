/**
 * 저장/불러오기/마이그레이션/백업 (명세 9장).
 * 모든 데이터는 localStorage 키 하나(`little-school:v1`)에 JSON으로 둔다.
 * 과목은 이 파일을 직접 쓰지 않고 ctx.store를 쓴다(명세 4-3).
 */
import { addDays, dateKey, isDateKey } from './date';

export const STORAGE_KEY = 'little-school:v1';
export const SCHEMA_VERSION = 1;
/** 과목별로 남기는 학습 기록 수, 날짜별 기록을 남기는 날 수 (명세 9장) */
export const MAX_LOGS = 500;
export const KEEP_DAYS = 90;

export type Volume = 'small' | 'normal' | 'large';
export type StarsPerSticker = 3 | 5 | 10;
export type BoardSize = 5 | 10 | 20;

export interface SubjectSetting {
  id: string;
  enabled: boolean;
  order: number;
  starsPerSticker: StarsPerSticker;
}

export interface Settings {
  /** 하루 학습 시간(분). null = 제한 없음. 1은 실기기 점검용(기기 정보 > 점검 도구) */
  dailyMinutes: number | null;
  graceMinutes: number;
  boardSize: BoardSize;
  audio: { sfxOn: boolean; sfxVolume: Volume; voiceOn: boolean; voiceVolume: Volume; voiceRate: 'slow' | 'normal' };
  parentLock: { type: 'math' | 'pin'; pin: string | null };
  /** 펜으로만 사용하기 (명세 2-5, 8-6 — 2026-10-22부터 아이 화면 전체) */
  penOnly: boolean;
  /** 부모가 공통 설정의 소리를 바꾼 적이 있는지 (한글쓰기 앱 설정 이전 때 덮어쓰지 않게, 명세 14-4) */
  audioEdited: boolean;
  subjects: SubjectSetting[];
}

export interface Sticker {
  art: string;
  subject: string;
  date: string;
}

export interface Board {
  no: number;
  size: BoardSize;
  startedAt: string;
  completedAt: string | null;
  paidAt: string | null;
  rewardText: string | null;
  stickers: Sticker[];
}

export interface DaySubject {
  ms: number;
  stars: number;
  sticker: boolean;
}

export interface DayRecord {
  extraMinutes: number;
  subjects: Record<string, DaySubject>;
}

export interface LogEntry {
  t: number;
  item: string;
  correct: boolean;
  ms: number;
  meta?: Record<string, unknown>;
}

export interface AppRecord {
  version: number;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
}

export interface SaveData {
  schemaVersion: number;
  createdAt: string;
  /** 마지막으로 백업한 날 (부모 모드 홈의 ‘마지막 백업: N일 전’, 명세 11-4) */
  lastBackupAt: string | null;
  /** 이 기기에 대한 기록. 한 번이라도 펜 입력이 들어왔는지 (‘펜으로만 사용하기’ 표시 조건) */
  device: { penSeen: boolean };
  settings: Settings;
  rewards: { stars: Record<string, number>; boards: Board[] };
  days: Record<string, DayRecord>;
  logs: Record<string, LogEntry[]>;
  apps: Record<string, AppRecord>;
}

export function defaultSettings(): Settings {
  return {
    dailyMinutes: 20,
    graceMinutes: 5,
    boardSize: 10,
    audio: { sfxOn: true, sfxVolume: 'normal', voiceOn: true, voiceVolume: 'normal', voiceRate: 'slow' },
    parentLock: { type: 'math', pin: null },
    penOnly: false,
    audioEdited: false,
    subjects: [],
  };
}

export function defaultData(today: string): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: today,
    lastBackupAt: null,
    device: { penSeen: false },
    settings: defaultSettings(),
    rewards: { stars: {}, boards: [newBoard(1, 10, today)] },
    days: {},
    logs: {},
    apps: {},
  };
}

export function newBoard(no: number, size: BoardSize, today: string): Board {
  return { no, size, startedAt: today, completedAt: null, paidAt: null, rewardText: null, stickers: [] };
}

// ── 마이그레이션 ──────────────────────────────────────────

/** schemaVersion n → n+1 변환. 버전을 올릴 때 여기에 함수를 추가한다 */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

/** 옛 버전 데이터를 순서대로 지금 버전으로 바꾼다. 앱보다 새 버전이면 오류 */
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let d = raw;
  let v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 1;
  if (v > SCHEMA_VERSION) throw new Error(`앱보다 새 버전의 데이터예요 (데이터 ${v}, 앱 ${SCHEMA_VERSION}). 앱을 업데이트해 주세요`);
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`데이터 버전 ${v}을 바꾸는 방법이 없어요`);
    d = step(d);
    v += 1;
    d.schemaVersion = v;
  }
  return d;
}

// ── 값 정리 (깨지거나 빠진 값은 기본값으로) ─────────────────

/** 저장된 값을 읽어 형식에 맞는 SaveData로 만든다. 모르는 값·잘못된 값은 버리거나 기본값으로 */
export function normalize(raw: unknown, today: string): SaveData {
  const r = obj(raw);
  const base = defaultData(today);
  const s = obj(r.settings);
  const ds = base.settings;
  const audio = obj(s.audio);
  const lock = obj(s.parentLock);

  const settings: Settings = {
    dailyMinutes: s.dailyMinutes === null ? null : pick(s.dailyMinutes, [1, 10, 15, 20, 30], ds.dailyMinutes),
    graceMinutes: pick(s.graceMinutes, [0, 3, 5], ds.graceMinutes),
    boardSize: pick(s.boardSize, [5, 10, 20] as const, ds.boardSize),
    audio: {
      sfxOn: bool(audio.sfxOn, ds.audio.sfxOn),
      sfxVolume: pick(audio.sfxVolume, VOLUMES, ds.audio.sfxVolume),
      voiceOn: bool(audio.voiceOn, ds.audio.voiceOn),
      voiceVolume: pick(audio.voiceVolume, VOLUMES, ds.audio.voiceVolume),
      voiceRate: pick(audio.voiceRate, ['slow', 'normal'] as const, ds.audio.voiceRate),
    },
    parentLock: {
      type: pick(lock.type, ['math', 'pin'] as const, 'math'),
      pin: typeof lock.pin === 'string' && /^\d{4}$/.test(lock.pin) ? lock.pin : null,
    },
    penOnly: bool(s.penOnly, false),
    audioEdited: bool(s.audioEdited, false),
    subjects: arr(s.subjects)
      .map(obj)
      .filter((x) => typeof x.id === 'string' && x.id !== '')
      .map((x, i) => ({
        id: x.id as string,
        enabled: bool(x.enabled, true),
        order: num(x.order, i),
        starsPerSticker: pick(x.starsPerSticker, [3, 5, 10] as const, 3),
      })),
  };
  // 암호 방식인데 암호가 없으면 곱셈으로
  if (settings.parentLock.type === 'pin' && !settings.parentLock.pin) settings.parentLock.type = 'math';

  const rw = obj(r.rewards);
  const stars: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(rw.stars))) if (typeof v === 'number' && v > 0) stars[k] = Math.floor(v);

  const boards: Board[] = arr(rw.boards)
    .map(obj)
    .filter((b) => isDateKey(b.startedAt))
    .map((b, i) => ({
      no: num(b.no, i + 1),
      size: pick(b.size, [5, 10, 20] as const, 10),
      startedAt: b.startedAt as string,
      completedAt: isDateKey(b.completedAt) ? b.completedAt : null,
      paidAt: isDateKey(b.paidAt) ? b.paidAt : null,
      rewardText: typeof b.rewardText === 'string' ? b.rewardText : null,
      stickers: arr(b.stickers)
        .map(obj)
        .filter((st) => typeof st.art === 'string' && typeof st.subject === 'string')
        .map((st) => ({ art: st.art as string, subject: st.subject as string, date: isDateKey(st.date) ? st.date : today })),
    }));
  // 지금 모으는 판(completedAt == null)은 항상 마지막 1개
  const last = boards[boards.length - 1];
  if (!last || last.completedAt !== null) {
    const size = settings.boardSize;
    boards.push(newBoard(last ? last.no + 1 : 1, size, last?.completedAt ?? today));
  }

  const days: Record<string, DayRecord> = {};
  for (const [k, v] of Object.entries(obj(r.days))) {
    if (!isDateKey(k)) continue;
    const day = obj(v);
    const subjects: Record<string, DaySubject> = {};
    for (const [id, sv] of Object.entries(obj(day.subjects))) {
      const x = obj(sv);
      subjects[id] = { ms: num(x.ms, 0), stars: num(x.stars, 0), sticker: bool(x.sticker, false) };
    }
    days[k] = { extraMinutes: num(day.extraMinutes, 0), subjects };
  }

  const logs: Record<string, LogEntry[]> = {};
  for (const [id, list] of Object.entries(obj(r.logs))) {
    logs[id] = arr(list)
      .map(obj)
      .filter((e) => typeof e.t === 'number' && typeof e.item === 'string')
      .map((e) => {
        const entry: LogEntry = { t: e.t as number, item: e.item as string, correct: bool(e.correct, false), ms: num(e.ms, 0) };
        if (e.meta && typeof e.meta === 'object') entry.meta = e.meta as Record<string, unknown>;
        return entry;
      });
  }

  const apps: Record<string, AppRecord> = {};
  for (const [id, av] of Object.entries(obj(r.apps))) {
    const a = obj(av);
    apps[id] = { version: num(a.version, 1), settings: obj(a.settings), data: obj(a.data) };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: isDateKey(r.createdAt) ? r.createdAt : today,
    lastBackupAt: isDateKey(r.lastBackupAt) ? r.lastBackupAt : null,
    device: { penSeen: bool(obj(r.device).penSeen, false) },
    settings,
    rewards: { stars, boards },
    days,
    logs,
    apps,
  };
}

/** 오래된 기록을 지운다: 과목별 최근 MAX_LOGS건, 최근 KEEP_DAYS일 */
export function prune(d: SaveData, today: string): void {
  for (const id of Object.keys(d.logs)) {
    const list = d.logs[id];
    if (list.length > MAX_LOGS) d.logs[id] = list.slice(list.length - MAX_LOGS);
  }
  const oldest = addDays(today, -(KEEP_DAYS - 1));
  for (const k of Object.keys(d.days)) if (k < oldest) delete d.days[k];
}

const VOLUMES = ['small', 'normal', 'large'] as const;

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v) && v >= 0 ? v : fallback;
}
function pick<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.indexOf(v as T) >= 0 ? (v as T) : fallback;
}

// ── 저장소 ──────────────────────────────────────────────

/** localStorage와 같은 모양 (테스트에서는 메모리 객체를 넣는다) */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoreOptions {
  /** 바뀐 뒤 이만큼 기다렸다가 한 번에 저장 (명세 9장: 300ms) */
  debounceMs?: number;
  now?: () => Date;
}

export type RestoreResult = { ok: true; data: SaveData } | { ok: false; error: string };

export class Store {
  data: SaveData;
  /** 마지막 저장이 실패했는지 (용량 초과·사생활 보호 모드 등). 부모 모드에서 알린다 */
  saveFailed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly now: () => Date;

  constructor(
    private readonly kv: KeyValue | null,
    opts: StoreOptions = {},
  ) {
    this.debounceMs = opts.debounceMs ?? 300;
    this.now = opts.now ?? (() => new Date());
    this.data = defaultData(this.today());
  }

  today(): string {
    return dateKey(this.now());
  }

  /** 저장된 데이터를 읽는다. 읽을 수 없으면 깨진 원본을 따로 남기고 새로 시작한다 */
  load(): void {
    const today = this.today();
    let text: string | null = null;
    try {
      text = this.kv ? this.kv.getItem(STORAGE_KEY) : null;
    } catch {
      text = null;
    }
    if (text === null) {
      this.data = defaultData(today);
      return;
    }
    try {
      this.data = normalize(migrate(JSON.parse(text) as Record<string, unknown>), today);
    } catch {
      try {
        this.kv?.setItem(`${STORAGE_KEY}:broken`, text);
      } catch {
        /* 남길 수 없으면 그대로 */
      }
      this.data = defaultData(today);
    }
    prune(this.data, today);
  }

  /** 데이터를 바꾼 뒤 부른다. 잠시 뒤 한 번에 저장한다 */
  changed(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  /** 기다리지 않고 지금 저장한다 (앱이 백그라운드로 갈 때 등) */
  flush(): boolean {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    prune(this.data, this.today());
    try {
      this.kv?.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.saveFailed = false;
    } catch {
      this.saveFailed = true;
    }
    return !this.saveFailed;
  }

  /** 오늘(또는 지정한 날)의 기록. 없으면 만든다 */
  day(key: string = this.today()): DayRecord {
    return this.data.days[key] || (this.data.days[key] = { extraMinutes: 0, subjects: {} });
  }

  /** 그날 과목 기록. 없으면 만든다 */
  daySubject(id: string, key: string = this.today()): DaySubject {
    const subjects = this.day(key).subjects;
    return subjects[id] || (subjects[id] = { ms: 0, stars: 0, sticker: false });
  }

  /** 과목 저장 공간 (`apps.<id>`). 없으면 만든다 */
  app(id: string): AppRecord {
    return this.data.apps[id] || (this.data.apps[id] = { version: 1, settings: {}, data: {} });
  }

  /**
   * 저장된 데이터의 크기(바이트, UTF-16 기준 대략). 기기 정보 화면용 진단 함수.
   * localStorage는 이 파일에서만 다룬다 (09 문서 4장 3, R-05)
   */
  savedBytes(): number {
    try {
      const s = this.kv ? this.kv.getItem(STORAGE_KEY) : null;
      return s ? s.length * 2 : 0;
    } catch {
      return 0;
    }
  }

  /** 백업용 JSON 문자열 */
  exportJson(): string {
    return JSON.stringify(this.data);
  }

  /** 백업을 한 날로 기록 */
  markBackedUp(): void {
    this.data.lastBackupAt = this.today();
    this.changed();
  }

  /** 붙여 넣은 백업 JSON을 검사한다. 덮어쓰기는 restore()로 */
  parseBackup(text: string): RestoreResult {
    let raw: unknown;
    try {
      raw = JSON.parse(text.trim());
    } catch {
      return { ok: false, error: 'JSON 형식이 아니에요. 백업한 글자를 빠짐없이 붙여 넣었는지 확인해 주세요' };
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('schemaVersion' in raw) || !('rewards' in raw)) {
      return { ok: false, error: '꼬마학교 백업 데이터가 아니에요' };
    }
    try {
      return { ok: true, data: normalize(migrate(raw as Record<string, unknown>), this.today()) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** 백업 데이터로 덮어쓰고 바로 저장 */
  restore(data: SaveData): void {
    this.data = data;
    this.flush();
  }

  /** 전체 초기화 */
  reset(): void {
    this.data = defaultData(this.today());
    this.flush();
  }
}

/** 브라우저의 localStorage. 쓸 수 없는 환경(사생활 보호 모드 등)이면 null → 메모리에서만 동작 */
export function browserStorage(): KeyValue | null {
  try {
    const ls = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}
