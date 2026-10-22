/**
 * 숫자 짝짓기 `match` (5-3) — 3장 × 4쌍. 뒤집기 없이 모두 보이는 카드.
 * 위 줄 숫자 카드 4장(낮게), 아래 줄 그림 카드 4장(크게). 숫자 → 그림(또는 반대) 차례로 누르면 짝 판정.
 * 숫자 카드를 고르면 그 수를 읽고, 그림 카드는 읽지 않는다(아이가 직접 세도록).
 * 그림 카드: 세로 5개씩 줄. 11 이상은 10개 한 묶음(5 × 2, 10칸 판을 세운 모양 테두리) + 낱개 줄.
 * 기록은 쌍마다: correct = 그 쌍의 카드가 들어간 실수 0회. 단계 계산에는 넣지 않는다(3장)
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { MATCH_SHEETS, PAIRS_PER_SHEET } from '../logic/config';
import { makeSheets, pictureColumns, type MatchSheet } from '../logic/match';
import { COUNTING_STRINGS as S } from '../strings';
import { headerEl, picEl } from '../ui';
import { V } from '../voiceIds';

/** 한 장을 끝낸 뒤 다음 장까지 (ms) */
const NEXT_SHEET = 2600;
const WRONG_MS = 700;

type Card = { el: HTMLElement; n: number; side: 'number' | 'picture'; paired: boolean };

export function matchView(e: Engine): View {
  const { ctx, timers } = e;
  const sheets: MatchSheet[] = makeSheets(e.level, MATCH_SHEETS, PAIRS_PER_SHEET);
  const total = MATCH_SHEETS * PAIRS_PER_SHEET;
  let sheetIndex = 0;
  let found = 0;
  let selected: Card | null = null;
  let cards: Card[] = [];
  let mistakes: Record<number, number> = {};
  let shownAt = 0;
  let locked = false;

  const head = headerEl(ctx, timers, () => e.menu(), { confirm: true, progress: true });
  const top = h('div', { class: 'cn-match-top' });
  const bottom = h('div', { class: 'cn-match-bottom' });
  const view = h('div', { class: 'cn-view cn-match' }, head.el, top, bottom);

  function render(): void {
    const sheet = sheets[sheetIndex];
    head.setProgress(found, total, S.sheetOf(sheetIndex + 1, MATCH_SHEETS));
    selected = null;
    mistakes = {};
    locked = false;
    shownAt = Date.now();
    const numberCards = sheet.numbers.map((n) => card(h('button', { class: 'cn-mcard cn-mnum', type: 'button' }, String(n)), n, 'number'));
    const pictureCards = sheet.pictures.map((p) => card(pictureCard(p.n, p.object), p.n, 'picture'));
    cards = numberCards.concat(pictureCards);
    top.replaceChildren(...numberCards.map((c) => c.el));
    bottom.replaceChildren(...pictureCards.map((c) => c.el));
    sizePictures(pictureCards);
  }

  function card(el: HTMLElement, n: number, side: Card['side']): Card {
    const c: Card = { el, n, side, paired: false };
    el.addEventListener('click', () => tap(c));
    return c;
  }

  /** 그림 카드: 세로 5개씩 줄 (11 이상은 앞 두 줄을 10개 한 묶음 테두리로) */
  function pictureCard(n: number, object: string): HTMLElement {
    const column = (count: number) => h('span', { class: 'cn-pcol' }, ...repeat(count, () => picEl(object, 'cn-pobj')));
    const cols = pictureColumns(n);
    const bundle = cols.filter((c) => c.bundle);
    const loose = cols.filter((c) => !c.bundle);
    return h(
      'button',
      { class: 'cn-mcard cn-mpic', type: 'button' },
      h(
        'span',
        { class: 'cn-pgroup' },
        // 10개 한 묶음: 5 × 2를 테두리로 묶는다 (10칸 판과 같은 모양을 세운 것)
        bundle.length ? h('span', { class: 'cn-pbundle' }, ...bundle.map((c) => column(c.count))) : null,
        ...loose.map((c) => column(c.count)),
      ),
    );
  }

  /** 카드 크기를 재서 사물 크기를 정한다 (세로 5개와, 가장 많은 줄 수 중 빠듯한 쪽) */
  function sizePictures(list: Card[]): void {
    let cols = 1;
    for (const c of list) {
      const all = pictureColumns(c.n);
      // 묶음 테두리·간격 몫으로 반 줄 더
      const l = all.length + (all.some((x) => x.bundle) ? 0.5 : 0);
      if (l > cols) cols = l;
    }
    const first = list[0] && list[0].el;
    if (!first) return;
    const size = Math.floor(Math.min((first.clientWidth * 0.84) / cols, (first.clientHeight * 0.84) / 5.4));
    bottom.style.setProperty('--obj', `${size}px`);
  }

  function tap(c: Card): void {
    if (locked || c.paired) return;
    if (!selected || selected.side === c.side) {
      // 고르기 (같은 줄을 다시 누르면 바꾸기)
      if (selected) selected.el.classList.remove('is-selected');
      selected = c;
      c.el.classList.add('is-selected');
      if (c.side === 'number') ctx.audio.say(V.num(c.n));
      else ctx.audio.sfx('tap');
      return;
    }
    const a = selected;
    selected = null;
    a.el.classList.remove('is-selected');
    if (a.n === c.n) return pair(a, c);
    // 틀림: 두 카드 흔들기 후 선택 해제
    mistakes[a.n] = (mistakes[a.n] || 0) + 1;
    mistakes[c.n] = (mistakes[c.n] || 0) + 1;
    ctx.ui.feedback('oops');
    locked = true;
    a.el.classList.add('is-wrong');
    c.el.classList.add('is-wrong');
    timers.set(() => {
      a.el.classList.remove('is-wrong');
      c.el.classList.remove('is-wrong');
      locked = false;
    }, WRONG_MS);
  }

  function pair(a: Card, b: Card): void {
    a.paired = b.paired = true;
    const color = `is-pair-${(found % PAIRS_PER_SHEET) + 1}`;
    a.el.classList.add('is-paired', color);
    b.el.classList.add('is-paired', color);
    found++;
    ctx.ui.feedback('correct');
    ctx.audio.say(V.num(a.n));
    const sheet = sheets[sheetIndex];
    e.record(a.n, !mistakes[a.n], { activity: 'match', level: e.level, sheet: sheetIndex + 1, numbers: sheet.numbers.slice(), mistakes: mistakes[a.n] || 0 }, Date.now() - shownAt, false);
    shownAt = Date.now();
    head.setProgress(found, total, S.sheetOf(sheetIndex + 1, MATCH_SHEETS));
    if (cards.some((c) => !c.paired)) return;
    locked = true;
    if (sheetIndex + 1 >= sheets.length) {
      timers.set(() => e.finish('match'), 1200);
      return;
    }
    timers.set(() => ctx.audio.say(V.praise.sheet), 900);
    timers.set(() => {
      sheetIndex++;
      render();
    }, NEXT_SHEET + 900);
  }

  return {
    el: view,
    start() {
      render();
      ctx.audio.say(V.ask.match);
    },
    destroy() {},
  };
}

function repeat<T>(n: number, make: () => T): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(make());
  return out;
}
