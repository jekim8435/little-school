/**
 * 한자 과목 엔진: 세트 하나와 문구·대사를 받아 과목 모듈(mount/unmount)을 만든다.
 * 과목 안 미니 라우터: 활동 고르기 → 활동 화면 → (한 판 끝) 칭찬 → 활동 고르기.
 * 출제 주머니·익힘 단계는 활동과 상관없이 과목 하나에 하나 (ctx.store의 bag, mastery).
 */
import type { AppContext, AppModule, SettingField } from '../../apps/types';
import { h } from '../../ui/dom';
import { drawFromBag, readBag, type BagState } from './bag';
import { ACTIVITIES, MIN_LEARNED, STAR_ACTIVITIES, type ActivityId, type HanjaConfig, type HanjaSettings } from './config';
import { applyResult, readMastery, type Mastery } from './mastery';
import { cardsView } from './screens/cards';
import { boardView } from './screens/board';
import { matchView } from './screens/match';
import { quizView } from './screens/quiz';
import { learnedInOrder, type HanjaItem } from './types';
import { Timers } from './ui';
import './style.css';

/** 한 판이 끝난 칭찬 화면을 보여 주는 시간 (ms) */
const PRAISE_MS = 3500;

export interface View {
  el: HTMLElement;
  /** 화면에 붙인 뒤 시작 (첫 안내 음성 등 — 앞 화면의 소리를 멈춘 뒤에 말하도록) */
  start?(): void;
  destroy(): void;
}

/** 활동 화면이 쓰는 과목 상태 */
export interface Engine {
  ctx: AppContext;
  cfg: HanjaConfig;
  settings: HanjaSettings;
  timers: Timers;
  /** 배운 한자 (세트 순서) */
  learned: string[];
  itemOf(char: string): HanjaItem;
  mastery(): Mastery;
  /** 출제 주머니에서 n자 */
  draw(n: number): string[];
  /** 문제 하나의 결과. affectMastery면 익힘 단계 ±1 */
  record(char: string, correct: boolean, meta: Record<string, unknown>, ms: number, affectMastery: boolean): void;
  /** 활동 고르기로 */
  menu(): void;
  /** 한 판을 끝냄: 별(별 활동이면) → 칭찬 → 활동 고르기 */
  finish(activity: ActivityId): void;
}

export function createHanjaModule(cfg: HanjaConfig, settingsSchema: SettingField[]): AppModule {
  let root: HTMLElement | null = null;
  let view: View | null = null;
  let timers: Timers | null = null;

  const mod: AppModule = {
    id: cfg.id,
    version: 1,
    settingsSchema,

    mount(el, ctx) {
      root = el;
      const t = new Timers();
      timers = t;
      const settings = ctx.settings as unknown as HanjaSettings;
      const byChar: Record<string, HanjaItem> = {};
      for (const it of cfg.set.items) byChar[it.char] = it;
      const learned = learnedInOrder(cfg.set.items, settings.learned);
      let bag: BagState = readBag(ctx.store.get('bag'));
      let mastery: Mastery = readMastery(ctx.store.get('mastery'));

      const host = h('div', { class: 'hj' });
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
        cfg,
        settings,
        timers: t,
        learned,
        itemOf: (c) => byChar[c],
        mastery: () => mastery,
        draw(n) {
          const r = drawFromBag(bag, learned, n);
          bag = r.state;
          ctx.store.set('bag', bag);
          return r.items;
        },
        record(char, correct, meta, ms, affectMastery) {
          ctx.log.record({ item: char, correct, durationMs: ms, meta });
          if (affectMastery) {
            mastery = applyResult(mastery, char, correct);
            ctx.store.set('mastery', mastery);
          }
        },
        menu: () => show(menuView(engine, open)),
        finish(activity) {
          const node = h(
            'div',
            { class: 'hj-view hj-praise' },
            h('div', { class: 'hj-praise-star' }, '★'),
            h('p', { class: 'hj-praise-text' }, cfg.strings.roundDone),
            h('p', { class: 'hj-praise-sub' }, cfg.strings.roundDoneSub),
          );
          show({ el: node, destroy() {} });
          ctx.audio.sfx('cheer');
          ctx.audio.say(cfg.voices.praise.round);
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
        if (a === 'cards') show(cardsView(engine));
        else if (a === 'board') show(boardView(engine));
        else if (a === 'match') show(matchView(engine));
        else show(quizView(engine, a));
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
  return mod;
}

/** 활동이 켜져 있는지 (내 한자판은 항상) */
function activityOn(s: HanjaSettings, a: ActivityId): boolean {
  if (a === 'board') return true;
  const v = (s as unknown as Record<string, unknown>)[`on.${a}`];
  return v !== false;
}

/** 첫 화면: 활동 고르기 (2줄 × 3, 끈 활동은 숨김, 배운 한자가 4자 미만이면 고르기·짝 맞추기 잠김) */
function menuView(e: Engine, open: (a: ActivityId) => void): View {
  const { ctx, cfg } = e;
  const enough = e.learned.length >= MIN_LEARNED;
  const shown = ACTIVITIES.filter((a) => activityOn(e.settings, a) && (a !== 'cards' || e.learned.length > 0));
  const tile = (a: ActivityId) => {
    const locked = !enough && a !== 'cards' && a !== 'board';
    return h(
      'button',
      {
        class: `hj-tile hj-tile-${a}${locked ? ' is-locked' : ''}`,
        type: 'button',
        onClick: () => {
          ctx.audio.sfx('tap');
          if (locked) return ctx.audio.say(cfg.voices.ask.locked);
          open(a);
        },
      },
      h('span', { class: 'hj-tile-icon' }, tileIcon(e, a)),
      h('span', { class: 'hj-tile-name' }, cfg.strings.activities[a]),
      locked ? h('span', { class: 'hj-tile-lock' }, cfg.strings.locked) : null,
    );
  };
  const rows: HTMLElement[] = [];
  for (let i = 0; i < shown.length; i += 3) rows.push(h('div', { class: 'hj-tile-row' }, ...shown.slice(i, i + 3).map(tile)));
  return {
    el: h('div', { class: 'hj-view hj-menu' }, h('h2', { class: 'hj-title' }, cfg.strings.title), ...rows),
    start: () => ctx.audio.say(cfg.voices.ask.pick),
    destroy() {},
  };
}

/** 활동 타일 그림: 배운 한자에서 하나를 보여 준다 (글꼴 확인도 겸함) */
function tileIcon(e: Engine, a: ActivityId): string {
  const sample = e.learned.length ? e.learned : e.cfg.set.items.map((it) => it.char);
  const pick = (i: number) => sample[i % sample.length];
  switch (a) {
    case 'cards':
      return pick(0);
    case 'listen':
      return '🔊';
    case 'picture':
      return '🖼️';
    case 'read':
      return `${pick(1)}=?`;
    case 'match':
      return '🃏';
    default:
      return '▦';
  }
}
