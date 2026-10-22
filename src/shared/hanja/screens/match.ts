/**
 * 짝 맞추기: 한자 카드와 음뜻 카드(‘바다 해’)를 뒤집어 짝 찾기. 한자 10개를 5쌍씩 두 판(카드 10장 = 가로 5 × 2줄 고정).
 * 기록은 짝마다(correct = 그 짝을 찾기 전 실수 0회), 익힘 단계에는 넣지 않는다.
 * 같은 한자가 두 번 들어가면(배운 한자 5자 미만) 같은 한자 카드는 어느 같은 음뜻 카드와 맞춰도 정답.
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../module';
import { boardCards, isPair, ROUND_SIZE, splitBoards, type MatchCard } from '../round';
import { charEl, headerEl, readingOf } from '../ui';

/** 짝이 아닐 때 다시 덮기까지 (ms) */
const UNFLIP_MS = 1100;
/** 첫 판이 끝나고 둘째 판까지 (ms) */
const NEXT_BOARD_MS = 2200;

export function matchView(e: Engine): View {
  const { ctx, cfg, timers } = e;
  const boards = splitBoards(e.draw(ROUND_SIZE));
  let boardIndex = 0;
  let found = 0;
  let cards: MatchCard[] = [];
  let open: number[] = [];
  let matched: number[] = [];
  let mistakes = 0;
  let pairStart = 0;
  let busy = false;
  const cardEls: HTMLElement[] = [];

  const head = headerEl(ctx, cfg, timers, () => e.menu(), { confirm: true, progress: true });
  const grid = h('div', { class: 'hj-match-grid' });
  const note = h('div', { class: 'hj-match-note' });
  const view = h('div', { class: 'hj-view hj-match' }, head.el, note, grid);

  function startBoard(): void {
    cards = boardCards(boards[boardIndex]);
    open = [];
    matched = [];
    mistakes = 0;
    pairStart = Date.now();
    busy = false;
    note.textContent = boards.length > 1 ? cfg.strings.boardOf(boardIndex + 1, boards.length) : '';
    cardEls.length = 0;
    const els = cards.map((c) => {
      const el = h('button', { class: 'hj-mcard', type: 'button', onClick: () => tap(c.key) });
      cardEls[c.key] = el;
      return el;
    });
    // 화면 폭과 상관없이 5장씩 2줄 (줄을 따로 만들어 넓은 화면에서 한 줄에 6장이 되지 않게)
    const half = Math.ceil(els.length / 2);
    grid.replaceChildren(h('div', { class: 'hj-match-row' }, ...els.slice(0, half)), h('div', { class: 'hj-match-row' }, ...els.slice(half)));
    for (const c of cards) paint(c);
  }

  function paint(c: MatchCard): void {
    const el = cardEls[c.key];
    const faceUp = open.indexOf(c.key) >= 0 || matched.indexOf(c.key) >= 0;
    el.classList.toggle('is-open', faceUp);
    el.classList.toggle('is-matched', matched.indexOf(c.key) >= 0);
    if (!faceUp) el.replaceChildren(h('span', { class: 'hj-mcard-back' }, '?'));
    else if (c.kind === 'hanja') el.replaceChildren(charEl(c.char, 'hj-mcard-char'));
    else el.replaceChildren(h('span', { class: 'hj-mcard-reading' }, readingOf(e.itemOf(c.char))));
  }

  function tap(key: number): void {
    if (busy || open.indexOf(key) >= 0 || matched.indexOf(key) >= 0) return;
    ctx.audio.sfx('tap');
    open.push(key);
    paint(cards[key]);
    if (open.length < 2) return;
    const a = cards[open[0]];
    const b = cards[open[1]];
    if (isPair(a, b)) {
      matched.push(a.key, b.key);
      open = [];
      paint(a);
      paint(b);
      e.record(a.char, mistakes === 0, { activity: 'match', mistakes }, Date.now() - pairStart, false);
      mistakes = 0;
      pairStart = Date.now();
      found++;
      head.setProgress(found, ROUND_SIZE);
      ctx.ui.feedback('correct');
      timers.set(() => ctx.audio.say(cfg.voices.char(a.char)), 300);
      if (matched.length === cards.length) boardDone();
    } else {
      mistakes++;
      busy = true;
      timers.set(() => {
        open = [];
        paint(a);
        paint(b);
        busy = false;
      }, UNFLIP_MS);
    }
  }

  function boardDone(): void {
    busy = true;
    boardIndex++;
    if (boardIndex >= boards.length) {
      timers.set(() => e.finish('match'), 1500);
      return;
    }
    timers.set(() => {
      note.textContent = cfg.strings.boardDone;
      ctx.audio.say(cfg.voices.praise.board);
    }, 1400);
    timers.set(startBoard, 1400 + NEXT_BOARD_MS);
  }

  head.setProgress(0, ROUND_SIZE);
  startBoard();
  return { el: view, start: () => ctx.audio.say(cfg.voices.ask.match), destroy() {} };
}
