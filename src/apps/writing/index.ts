/**
 * 또박또박 글씨 (Neat Letters) · id `writing` — 한글쓰기 앱을 과목 모듈로 옮긴 것 (명세 14장).
 * 과목 안 미니 라우터: 카테고리 고르기 → 쓰기 방법 고르기 → 쓰기 연습(고른 방법으로만) → (회차 완료) 엔딩 → 허브.
 * 주소 해시는 #/app/writing 그대로 두고 과목 안에서만 화면을 바꾼다.
 */
import type { AppContext, AppModule } from '../types';
import { glyphsOf, type Category } from './categories';
import type { Glyph, ModeId } from './data/types';
import { ENDING_MESSAGE } from './data/messages';
import { emptyRound, firstTarget, nextTarget, readData, recordAttempt, type WritingData } from './round';
import { categoriesView } from './screens/categories';
import { modeView } from './screens/modeSelect';
import { practiceView, type PracticeView } from './screens/practice';
import { SETTINGS_SCHEMA, type WritingSettings } from './settings';
import { showPraise } from './ui/praise';
import './style.css';

/** 엔딩을 보여 주는 시간 (ms) */
const ENDING_MS = 5000;

let root: HTMLElement | null = null;
let view: { destroy(): void; pause?(): void } | null = null;

const app: AppModule = {
  id: 'writing',
  version: 1,
  settingsSchema: SETTINGS_SCHEMA,

  mount(el: HTMLElement, ctx: AppContext) {
    root = el;
    const settings = ctx.settings as unknown as WritingSettings;
    let data: WritingData = readData({
      rounds: ctx.store.get('rounds'),
      guidedRounds: ctx.store.get('guidedRounds'),
      clears: ctx.store.get('clears'),
      lastCategory: ctx.store.get('lastCategory'),
    });
    const save = () => {
      ctx.store.set('rounds', data.rounds);
      ctx.store.set('guidedRounds', data.guidedRounds);
      ctx.store.set('clears', data.clears);
      if (data.lastCategory) ctx.store.set('lastCategory', data.lastCategory);
    };

    const show = (next: { el: HTMLElement; destroy(): void; pause?(): void }) => {
      if (view) view.destroy();
      view = next;
      el.replaceChildren(next.el);
    };
    const plain = (node: HTMLElement) => ({ el: node, destroy() {} });

    const showCategories = () => show(plain(categoriesView(ctx, data, showModes)));

    function showModes(c: Category): void {
      data.lastCategory = c.id;
      save();
      show(plain(modeView(ctx, c, (m) => showPractice(c, m, firstTarget(ids(c), round(c, m))), showCategories)));
    }

    const ids = (c: Category) => glyphsOf(c).map((g) => g.id);
    /** 쓰기 방법마다 회차가 따로다 (따라 쓰기는 별 없음, 명세 14-3) */
    const roundsOf = (m: ModeId) => (m === 'free' ? data.rounds : data.guidedRounds);
    const round = (c: Category, m: ModeId) => roundsOf(m)[c.id] || emptyRound();

    function showPractice(c: Category, mode: ModeId, index: number): void {
      let completed = false;
      const pv: PracticeView = practiceView({
        ctx,
        settings,
        category: c,
        mode,
        index: Math.max(0, index),
        round: round(c, mode),
        onAttempt(g: Glyph, clean: boolean) {
          const res = recordAttempt(ids(c), round(c, mode), g.id, clean);
          roundsOf(mode)[c.id] = res.round;
          if (res.complete) {
            completed = true;
            if (mode === 'free') data.clears[c.id] = (data.clears[c.id] || 0) + 1;
          }
          save();
        },
        onNext() {
          if (completed) return showEnding(c, mode);
          // 하루 학습 시간이 다 됐으면 한 글자가 끝난 이 때 나간다 (명세 5-5)
          if (ctx.isTimeUp()) return ctx.exit();
          const next = nextTarget(ids(c), round(c, mode), index);
          showPractice(c, mode, next < 0 ? 0 : next);
        },
        goTo: (i) => showPractice(c, mode, i),
        back: () => showModes(c),
      });
      show(pv);
    }

    /** 카테고리 하나를 모두 클리어: 혼자 쓰기면 별 1개 (명세 14-3) → 칭찬 → 허브로 */
    function showEnding(c: Category, mode: ModeId): void {
      const node = document.createElement('div');
      node.className = 'w-view w-ending';
      show(plain(node));
      ctx.audio.sfx('cheer');
      ctx.audio.say('writing.ending.all');
      // 별은 혼자 쓰기 클리어에만. 오늘 스티커를 이미 받았으면 껍데기가 별 연출을 생략한다 (칭찬 연출은 그대로)
      if (mode === 'free') ctx.reward.star(1, `clear:${c.id}`);
      const close = showPraise(node, {
        message: ENDING_MESSAGE,
        sub: `${c.name} ${glyphsOf(c).length}자를 모두 썼어!`,
        big: true,
        duration: ENDING_MS,
        onDone: () => ctx.exit(),
      });
      view = { destroy: close };
    }

    // 첫 화면은 카테고리 고르기 (마지막에 고른 카테고리는 강조, 회차는 이어서)
    showCategories();
  },

  pause() {
    if (view && view.pause) view.pause();
  },

  unmount() {
    if (view) view.destroy();
    view = null;
    if (root) root.replaceChildren();
    root = null;
  },
};

export default app;
