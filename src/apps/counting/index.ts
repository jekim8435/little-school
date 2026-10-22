/**
 * 구슬 세기 · id `counting` — 공통 에디션 (subjects/counting.md).
 * 과목 안 미니 라우터: 활동 고르기 → 활동 화면 → (한 판 끝) 칭찬 → 활동 고르기.
 * 단계·출제 주머니는 활동과 상관없이 과목 하나에 하나 (ctx.store의 level, bag, bagKey).
 */
import { drawFromBag, emptyBag, readBag, type BagState } from '../../shared/bag';
import { h } from '../../ui/dom';
import type { AppContext, AppModule } from '../types';
import { ACTIVITIES, STAR_ACTIVITIES, type ActivityId, type CountingSettings } from './logic/config';
import { addResult, clampLevel, judgeLevel, levelPool, playLevel, readLevel, type Level, type LevelState } from './logic/level';
import { boardView } from './screens/board';
import { countView } from './screens/count';
import { frameView } from './screens/frame';
import { matchView } from './screens/match';
import { tenView } from './screens/ten';
import { countingSettings } from './settings';
import { COUNTING_STRINGS as S } from './strings';
import { picEl, Timers } from './ui';
import { V } from './voiceIds';
import './style.css';

/** 한 판이 끝난 칭찬 화면을 보여 주는 시간 (ms) */
const PRAISE_MS = 3500;
/** 주머니 키의 판 번호: 단계 범위를 바꾼 뒤(1~5 → 1~10 …) 옛 주머니를 버리도록 */
const BAG_VERSION = 2;

export interface View {
  el: HTMLElement;
  /** 화면에 붙인 뒤 시작 (첫 안내 음성, 크기를 재야 하는 배치 등) */
  start?(): void;
  destroy(): void;
}

/** 활동 화면이 쓰는 과목 상태 */
export interface Engine {
  ctx: AppContext;
  settings: CountingSettings;
  timers: Timers;
  /** 이번 판의 단계 (판 진행 중에는 바뀌지 않음) */
  level: Level;
  /** 숫자 카드 보기 개수 */
  choiceCount: number;
  /** 출제 주머니에서 n개 */
  draw(n: number): number[];
  /** 세어 보기에 마지막으로 나온 사물 (판 사이에도 연달아 같지 않게) */
  lastObject: string | null;
  setLastObject(o: string): void;
  /** 문제 하나의 결과. levelResult면 단계 계산에 넣음(첫 시도, 세어 보기·10칸 판만) */
  record(item: number, correct: boolean, meta: Record<string, unknown>, ms: number, levelResult: boolean): void;
  menu(): void;
  /** 한 판을 끝냄: 단계 판정 → 별(별 활동이면) → 칭찬 → 활동 고르기 */
  finish(activity: ActivityId): void;
}

function readSettings(ctx: AppContext): CountingSettings {
  const s = ctx.settings as Record<string, unknown>;
  const num = (v: unknown, d: number) => (Number(v) > 0 ? Number(v) : d);
  return {
    // 옛 값 5는 가장 작은 10으로
    maxNumber: Math.max(10, num(s.maxNumber, 20)),
    autoLevel: s.autoLevel !== false,
    choices: Math.min(num(s.choices, 3), 4),
    'on.count': s['on.count'] !== false,
    'on.frame': s['on.frame'] !== false,
    'on.ten': s['on.ten'] !== false,
    'on.match': s['on.match'] !== false,
    'on.board': s['on.board'] !== false,
  };
}

let root: HTMLElement | null = null;
let view: View | null = null;
let timers: Timers | null = null;

const app: AppModule = {
  id: 'counting',
  version: 1,
  settingsSchema: countingSettings,

  mount(el, ctx) {
    root = el;
    const t = new Timers();
    timers = t;
    const settings = readSettings(ctx);
    let levelState: LevelState = clampLevel(readLevel(ctx.store.get('level')), settings.maxNumber);
    ctx.store.set('level', levelState);
    let bag: BagState = readBag(ctx.store.get('bag'));
    let bagKey = String(ctx.store.get('bagKey') || '');
    const storedObject = ctx.store.get('lastObject');
    let lastObject: string | null = typeof storedObject === 'string' ? storedObject : null;

    const host = h('div', { class: 'cn' });
    el.replaceChildren(host);
    const show = (v: View) => {
      t.clear();
      ctx.audio.stop();
      if (view) view.destroy();
      view = v;
      host.replaceChildren(v.el);
      if (v.start) v.start();
    };

    const engine: Engine = {
      ctx,
      settings,
      timers: t,
      level: 1,
      choiceCount: settings.choices,
      draw(n) {
        // 단계가 바뀌었으면 주머니를 새로 (6장)
        const key = `${BAG_VERSION}:${engine.level}`;
        if (bagKey !== key) {
          bag = emptyBag();
          bagKey = key;
          ctx.store.set('bagKey', bagKey);
        }
        const r = drawFromBag(bag, levelPool(engine.level), n);
        bag = r.state;
        ctx.store.set('bag', bag);
        return r.items.map(Number);
      },
      get lastObject() {
        return lastObject;
      },
      setLastObject(o) {
        lastObject = o;
        ctx.store.set('lastObject', o);
      },
      record(item, correct, meta, ms, levelResult) {
        ctx.log.record({ item: String(item), correct, durationMs: ms, meta });
        if (levelResult && settings.autoLevel) {
          levelState = addResult(levelState, correct);
          ctx.store.set('level', levelState);
        }
      },
      menu: () => show(menuView(engine, open)),
      finish(activity) {
        if (settings.autoLevel) {
          levelState = judgeLevel(levelState, settings.maxNumber);
          ctx.store.set('level', levelState);
        }
        const node = h(
          'div',
          { class: 'cn-view cn-praise' },
          h('div', { class: 'cn-praise-star' }, '★'),
          h('p', { class: 'cn-praise-text' }, S.roundDone),
          h('p', { class: 'cn-praise-sub' }, S.roundDoneSub),
        );
        show({ el: node, destroy() {} });
        ctx.audio.sfx('cheer');
        ctx.audio.say(V.praise.round);
        // 오늘 스티커를 이미 받았으면 껍데기가 별을 무시한다 (칭찬은 그대로)
        if (STAR_ACTIVITIES.indexOf(activity) >= 0) ctx.reward.star(1, `round:${activity}`);
        t.set(() => {
          // 하루 학습 시간이 다 됐으면 한 판이 끝난 이때 나간다 (03 문서 5-5)
          if (ctx.isTimeUp()) ctx.exit();
          else engine.menu();
        }, PRAISE_MS);
      },
    };

    function open(a: ActivityId): void {
      engine.level = playLevel(levelState, settings.maxNumber, settings.autoLevel);
      if (a === 'count') show(countView(engine));
      else if (a === 'frame') show(frameView(engine));
      else if (a === 'ten') show(tenView(engine));
      else if (a === 'match') show(matchView(engine));
      else show(boardView(engine));
    }

    engine.menu();
  },

  unmount() {
    if (timers) timers.clear();
    timers = null;
    if (view) view.destroy();
    view = null;
    if (root) root.replaceChildren();
    root = null;
  },
};

export default app;

/** 첫 화면: 활동 고르기 (위 3개 · 아래 2개, 끈 활동은 숨김. 모두 끄면 숫자판만) */
function menuView(e: Engine, open: (a: ActivityId) => void): View {
  const { ctx } = e;
  const on = ACTIVITIES.filter((a) => (e.settings as unknown as Record<string, boolean>)[`on.${a}`]);
  const shown: ActivityId[] = on.length ? on : ['board'];
  const tile = (a: ActivityId) =>
    h(
      'button',
      {
        class: `cn-tile cn-tile-${a}`,
        type: 'button',
        onClick: () => {
          ctx.audio.sfx('tap');
          open(a);
        },
      },
      h('span', { class: 'cn-tile-icon' }, tileIcon(a)),
      h('span', { class: 'cn-tile-name' }, S.activities[a]),
    );
  const rows: HTMLElement[] = [];
  const perRow = shown.length > 4 ? 3 : 2;
  for (let i = 0; i < shown.length; i += perRow) rows.push(h('div', { class: 'cn-tile-row' }, ...shown.slice(i, i + perRow).map(tile)));
  return {
    el: h('div', { class: `cn-view cn-menu is-${shown.length > 4 ? 'wide' : 'grid'}` }, h('h2', { class: 'cn-title' }, S.title), ...rows),
    start: () => ctx.audio.say(V.ask.pick),
    destroy() {},
  };
}

function tileIcon(a: ActivityId): HTMLElement {
  if (a === 'count') return h('span', { class: 'cn-tile-pics' }, picEl('apple'), picEl('apple'), picEl('apple'));
  if (a === 'frame') return h('span', { class: 'cn-tile-pics' }, picEl('bead'), picEl('bead'), picEl('bead-more'));
  if (a === 'ten') return h('span', { class: 'cn-tile-badge' }, h('b', {}, '10'), picEl('bead-more'));
  if (a === 'match') return h('span', { class: 'cn-tile-badge' }, h('b', {}, '3'), picEl('star'));
  return h('span', { class: 'cn-tile-nums' }, '1 2 3');
}
