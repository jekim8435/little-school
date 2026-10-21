/**
 * 과목 모듈에 넘기는 ctx 만들기 (명세 4-3).
 * 과목은 localStorage·별 계산·소리 설정을 직접 다루지 않고 이것만 쓴다.
 */
import type { AppContext, AppEntry, SettingField, SettingValue } from '../apps/types';
import { attachInput, type InputHandlers } from '../ui/input';
import type { AudioService } from './audio';
import { recordLog } from './log';
import { grantStar, rewardStatus, type StarOutcome } from './rewards';
import type { Store } from './storage';

export interface CtxDeps {
  entry: AppEntry;
  schema: SettingField[] | undefined;
  store: Store;
  audio: AudioService;
  /** 허브(또는 오늘 끝)로 나가기 */
  exit(): void;
  isTimeUp(): boolean;
  /** 정답·오답 연출 (화면을 가진 app-host가 맡는다) */
  feedback(kind: 'correct' | 'oops'): void;
  /** 별을 받았을 때 (상단 바 갱신·별 연출) */
  onStar?(r: StarOutcome): void;
  baseUrl: string;
}

/**
 * 저장된 과목 설정 값을 schema에 맞춰 읽는다 (명세 8-5).
 * 저장값이 없거나 형식이 맞지 않으면 default. schema에 없는 저장값은 무시한다
 */
export function resolveSettings(schema: SettingField[] | undefined, saved: Record<string, unknown>): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {};
  for (const f of schema || []) {
    const v = saved[f.key];
    if (f.type === 'toggle') {
      out[f.key] = typeof v === 'boolean' ? v : f.default;
    } else if (f.type === 'select') {
      out[f.key] = f.options.some((o) => o.value === v) ? (v as string | number) : f.default;
    } else {
      const allowed = f.options.map((o) => o.value);
      out[f.key] = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && allowed.indexOf(x) >= 0) : f.default.slice();
    }
  }
  return out;
}

/** ctx와, 과목을 닫을 때 남은 입력 등록을 모두 푸는 dispose를 돌려준다 */
export function createContext(d: CtxDeps): { ctx: AppContext; dispose(): void } {
  const id = d.entry.id;
  const detachers: (() => void)[] = [];
  const settings = resolveSettings(d.schema, d.store.app(id).settings);
  Object.freeze(settings);

  const ctx: AppContext = {
    reward: {
      star(n = 1) {
        const r = grantStar(d.store, id, n);
        if (r.accepted) d.audio.sfx('star');
        if (d.onStar) d.onStar(r);
        // 과목에는 규약의 필드만 돌려준다
        return { accepted: r.accepted, stars: r.stars, ratio: r.ratio, stickerGranted: r.stickerGranted, doneToday: r.doneToday };
      },
      status: () => rewardStatus(d.store, id),
    },
    log: {
      record: (r) => recordLog(d.store, id, r),
    },
    store: {
      get<T = unknown>(key: string): T | undefined {
        const v = d.store.app(id).data[key];
        // 과목이 받은 값을 고쳐도 저장 데이터가 몰래 바뀌지 않게 복사본을 준다
        return v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as T);
      },
      set(key, value) {
        const data = d.store.app(id).data;
        if (value === undefined) delete data[key];
        else data[key] = JSON.parse(JSON.stringify(value));
        d.store.changed();
      },
    },
    settings,
    audio: {
      sfx: (name) => d.audio.sfx(name),
      say: (lineId) => d.audio.say(lineId),
      speak: (text) => d.audio.speak(text),
      play: (url) => d.audio.play(url),
      stop: () => d.audio.stop(),
      get voiceOn() {
        return d.audio.voiceOn;
      },
      get sfxOn() {
        return d.audio.sfxOn;
      },
    },
    input: {
      attach(el: HTMLElement, handlers: InputHandlers) {
        const off = attachInput(el, handlers);
        let done = false;
        const detach = () => {
          if (done) return;
          done = true;
          off();
          const i = detachers.indexOf(detach);
          if (i >= 0) detachers.splice(i, 1);
        };
        detachers.push(detach);
        return detach;
      },
    },
    ui: {
      feedback: (kind) => d.feedback(kind),
    },
    exit: () => d.exit(),
    isTimeUp: () => d.isTimeUp(),
    baseUrl: d.baseUrl,
  };

  return {
    ctx,
    dispose() {
      // 과목이 깜빡 잊은 입력 해제를 대신 한다 (에어1 메모리 누수 방지)
      while (detachers.length) detachers[detachers.length - 1]();
    },
  };
}
