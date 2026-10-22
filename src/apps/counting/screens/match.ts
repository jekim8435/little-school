/**
 * 숫자 짝짓기 `match` (5-3) — 1·2단계 4쌍 × 3장, 3단계 3쌍 × 4장. 뒤집기 없이 모두 보이는 카드.
 * 위 줄 숫자 카드(낮게), 아래 줄 그림 카드(크게). 숫자 → 그림(또는 반대) 차례로 누르면 짝 판정.
 * 숫자 카드를 고르면 그 수를 읽고, 그림 카드는 읽지 않는다(아이가 직접 세도록).
 * 그림 카드: 5개씩 줄. 11 이상은 10개마다 한 묶음(5 × 2, 10칸 판 모양 테두리) + 낱개 줄. 줄 방향은 사물이 커지는 쪽.
 * 기록은 쌍마다: correct = 그 쌍의 카드가 들어간 실수 0회. 단계 계산에는 넣지 않는다(3장)
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { MATCH_LAYOUT } from '../logic/config';
import { makeSheets, pictureColumns, pictureFit, type MatchSheet } from '../logic/match';
import { COUNTING_STRINGS as S } from '../strings';
import { headerEl, picEl } from '../ui';
import { V } from '../voiceIds';

/** 한 장을 끝낸 뒤 다음 장까지 (ms) */
const NEXT_SHEET = 2600;
const WRONG_MS = 700;

type Card = { el: HTMLElement; n: number; side: 'number' | 'picture'; paired: boolean };

export function matchView(e: Engine): View {
  const { ctx, timers } = e;
  const layout = MATCH_LAYOUT[e.level];
  const sheets: MatchSheet[] = makeSheets(e.level, layout.sheets, layout.pairs);
  const total = layout.sheets * layout.pairs;
  let sheetIndex = 0;
  let found = 0;
  let selected: Card | null = null;
  let cards: Card[] = [];
  let mistakes: Record<number, number> = {};
  let shownAt = 0;
  let locked = false;

  const head = headerEl(ctx, timers, () => e.menu(), { confirm: true, progress: true });
  const top = h('div', { class: `cn-match-top is-${layout.pairs}` });
  const bottom = h('div', { class: `cn-match-bottom is-${layout.pairs}` });
  const view = h('div', { class: 'cn-view cn-match' }, head.el, top, bottom);

  function render(): void {
    const sheet = sheets[sheetIndex];
    head.setProgress(found, total, S.sheetOf(sheetIndex + 1, layout.sheets));
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

  /** 그림 카드: 5개씩 줄 (11 이상은 10개마다 두 줄을 한 묶음 테두리로). 줄 방향은 sizePictures가 정한다 */
  function pictureCard(n: number, object: string): HTMLElement {
    const line = (count: number) => h('span', { class: 'cn-pline' }, ...repeat(count, () => picEl(object, 'cn-pobj')));
    const parts: HTMLElement[] = [];
    const cols = pictureColumns(n);
    for (let i = 0; i < cols.length; i++) {
      // 10개 한 묶음: 5 × 2를 테두리로 묶는다 (10칸 판 모양)
      if (cols[i].bundle) {
        parts.push(h('span', { class: 'cn-pbundle' }, line(cols[i].count), line(cols[i + 1].count)));
        i++;
      } else parts.push(line(cols[i].count));
    }
    return h('button', { class: 'cn-mcard cn-mpic', type: 'button' }, h('span', { class: 'cn-pgroup' }, ...parts));
  }

  /** 카드 크기를 재서 사물 크기와 줄 방향을 정한다 (한 장의 가장 큰 수에 맞춰 모든 카드가 같은 크기) */
  function sizePictures(list: Card[]): void {
    let lines = 1;
    let bundles = 0;
    for (const c of list) {
      const all = pictureColumns(c.n);
      if (all.length > lines) lines = all.length;
      const b = all.filter((x) => x.bundle).length / 2;
      if (b > bundles) bundles = b;
    }
    const first = list[0] && list[0].el;
    if (!first) return;
    const fit = pictureFit(first.clientWidth * 0.84, first.clientHeight * 0.84, lines, bundles);
    bottom.style.setProperty('--obj', `${fit.size}px`);
    bottom.classList.toggle('is-row', fit.dir === 'row');
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
    const color = `is-pair-${(found % layout.pairs) + 1}`;
    a.el.classList.add('is-paired', color);
    b.el.classList.add('is-paired', color);
    found++;
    ctx.ui.feedback('correct');
    ctx.audio.say(V.num(a.n));
    const sheet = sheets[sheetIndex];
    e.record(a.n, !mistakes[a.n], { activity: 'match', level: e.level, sheet: sheetIndex + 1, numbers: sheet.numbers.slice(), mistakes: mistakes[a.n] || 0 }, Date.now() - shownAt, false);
    shownAt = Date.now();
    head.setProgress(found, total, S.sheetOf(sheetIndex + 1, layout.sheets));
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
