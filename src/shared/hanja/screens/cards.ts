/**
 * 한자 카드: 배운 한자만 무작위 순서로. 한자를 보고 소리 내어 읽은 뒤 카드를 눌러 뒤집으면 그림 + 훈음 음성.
 * 정해진 판 없이 넘기며 본다(별 없음). ‘다음 한자 미리 보기’가 켜져 있으면 다음 두 자도 ‘곧 배워요’ 표시와 함께 섞는다.
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../module';
import { nextUnlearned, shuffle } from '../types';
import { charEl, fill, headerEl, pictureEl, readingOf } from '../ui';

/** 뒤집는 연출 절반 시간 (ms) */
const FLIP_MS = 140;

export function cardsView(e: Engine): View {
  const { ctx, cfg, timers } = e;
  const preview = e.settings.preview ? nextUnlearned(cfg.set.items, e.learned, 2) : [];
  const pool = e.learned.concat(preview);
  let deck: string[] = [];
  let index = -1;
  let flipped = false;
  let busy = false;

  const card = h('button', { class: 'hj-card', type: 'button', onClick: () => flip() });
  const head = headerEl(ctx, cfg, timers, () => e.menu(), { confirm: false, progress: false });
  const nextBtn = h('button', { class: 'hj-next', type: 'button', onClick: () => next() }, `${cfg.strings.next} ▶`);

  function render(): void {
    const char = deck[index];
    const item = e.itemOf(char);
    const soon = preview.indexOf(char) >= 0 ? h('span', { class: 'hj-soon' }, cfg.strings.soon) : null;
    if (!flipped) {
      fill(card, charEl(char, 'hj-card-char'), soon, h('span', { class: 'hj-card-hint' }, cfg.strings.flip));
    } else {
      fill(
        card,
        pictureEl(item, 'hj-card-pic'),
        h('span', { class: 'hj-card-back-row' }, charEl(char, 'hj-card-small'), h('span', { class: 'hj-card-reading' }, readingOf(item))),
        soon,
      );
    }
    card.classList.toggle('is-back', flipped);
  }

  function flip(): void {
    if (busy) return;
    busy = true;
    ctx.audio.sfx('tap');
    card.classList.add('is-turning');
    timers.set(() => {
      flipped = !flipped;
      render();
      card.classList.remove('is-turning');
      if (flipped) ctx.audio.say(cfg.voices.char(deck[index]));
      timers.set(() => (busy = false), FLIP_MS);
    }, FLIP_MS);
  }

  function next(): void {
    if (busy) return;
    ctx.audio.sfx('tap');
    ctx.audio.stop();
    index++;
    if (index >= deck.length) {
      const last = deck[deck.length - 1];
      deck = shuffle(pool);
      // 바퀴가 바뀔 때 방금 본 한자가 바로 다시 나오지 않게
      if (deck.length > 1 && deck[0] === last) deck = deck.slice(1).concat(deck.slice(0, 1));
      index = 0;
    }
    flipped = false;
    render();
  }

  next();
  return {
    el: h('div', { class: 'hj-view hj-cards' }, head.el, h('div', { class: 'hj-cards-body' }, card, nextBtn)),
    start: () => ctx.audio.say(cfg.voices.ask.cards),
    destroy() {},
  };
}
