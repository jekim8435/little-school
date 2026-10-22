/**
 * 한자 카드: 배운 한자만 무작위 순서로. 한자를 보고 소리 내어 읽은 뒤 ‘다음’을 누르면
 * 카드가 뒤집혀 그림 + 훈음과 음성으로 확인하고(그동안 ‘다음’ 버튼은 숨김), 잠시 뒤 저절로 다음 한자로 넘어간다.
 * 정해진 판 없이 넘기며 본다(별 없음). ‘다음 한자 미리 보기’가 켜져 있으면 다음 두 자도 ‘곧 배워요’ 표시와 함께 섞는다.
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../module';
import { nextUnlearned, shuffle } from '../types';
import { charEl, fill, headerEl, pictureEl, readingOf } from '../ui';

/** 뒤집는 연출 절반 시간 (ms) */
const FLIP_MS = 140;
/** 뒤집어 읽어 준 뒤 다음 카드로 넘어가기까지 (ms) — 훈음 음성(약 1초)을 듣고 한 번 따라 읽을 시간 */
const SHOW_BACK_MS = 2800;

export function cardsView(e: Engine): View {
  const { ctx, cfg, timers } = e;
  const preview = e.settings.preview ? nextUnlearned(cfg.set.items, e.learned, 2) : [];
  const pool = e.learned.concat(preview);
  let deck: string[] = [];
  let index = -1;
  let flipped = false;
  let busy = false;

  const card = h('div', { class: 'hj-card' });
  const head = headerEl(ctx, cfg, timers, () => e.menu(), { confirm: false, progress: false });
  const nextBtn = h('button', { class: 'hj-next', type: 'button', onClick: () => next() }, `${cfg.strings.next} ▶`);

  function render(): void {
    const char = deck[index];
    const item = e.itemOf(char);
    const soon = preview.indexOf(char) >= 0 ? h('span', { class: 'hj-soon' }, cfg.strings.soon) : null;
    if (!flipped) {
      fill(card, charEl(char, 'hj-card-char'), soon);
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

  /** 가로로 접혔다 펴지는 연출 사이에 change를 한다 */
  function turn(change: () => void, after?: () => void): void {
    busy = true;
    card.classList.add('is-turning');
    timers.set(() => {
      change();
      render();
      card.classList.remove('is-turning');
      if (after) after();
      timers.set(() => (busy = false), FLIP_MS);
    }, FLIP_MS);
  }

  /** 뒤집어 읽어 주고, 잠시 뒤 저절로 다음 한자 앞면으로 (그동안 ‘다음’ 버튼은 숨김) */
  function next(): void {
    if (busy || flipped) return;
    ctx.audio.sfx('tap');
    nextBtn.classList.add('is-hidden');
    turn(
      () => (flipped = true),
      () => {
        ctx.audio.say(cfg.voices.char(deck[index]));
        timers.set(() => {
          turn(advance, () => nextBtn.classList.remove('is-hidden'));
        }, SHOW_BACK_MS);
      },
    );
  }

  function advance(): void {
    index++;
    if (index >= deck.length) {
      const last = deck[deck.length - 1];
      deck = shuffle(pool);
      // 바퀴가 바뀔 때 방금 본 한자가 바로 다시 나오지 않게
      if (deck.length > 1 && deck[0] === last) deck = deck.slice(1).concat(deck.slice(0, 1));
      index = 0;
    }
    flipped = false;
  }

  advance();
  render();
  return {
    el: h('div', { class: 'hj-view hj-cards' }, head.el, h('div', { class: 'hj-cards-body' }, card, nextBtn)),
    start: () => ctx.audio.say(cfg.voices.ask.cards),
    destroy() {},
  };
}
