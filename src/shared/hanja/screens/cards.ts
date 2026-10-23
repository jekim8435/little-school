/**
 * 한자 카드: 배운 한자만 무작위 순서로. 한자를 보고 소리 내어 읽은 뒤 ‘다음’을 누르면
 * 카드가 뒤집혀 그림 + 훈음과 음성으로 확인하고(그동안 ‘다음’ 버튼은 숨김), 잠시 뒤 저절로 다음 한자로 넘어간다.
 * 고른 한자를 한 바퀴(모두 한 번씩) 보면 칭찬 화면 뒤 활동 고르기로 돌아간다(별 없음). 머리줄에 본 장 수 / 전체.
 * ‘다음 한자 미리 보기’가 켜져 있으면 다음 두 자도 ‘곧 배워요’ 표시와 함께 섞는다(한 바퀴에 포함).
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
  const head = headerEl(ctx, cfg, timers, () => e.menu(), { confirm: false, progress: true });
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
        timers.set(nextOrFinish, SHOW_BACK_MS);
      },
    );
  }

  function advance(): void {
    index++;
    head.setProgress(index, deck.length);
    // 한 바퀴를 다 보면 칭찬 화면 → 활동 고르기 (별 없음)
    if (index >= deck.length) return e.finish('cards');
    flipped = false;
  }

  /** 다음 한자 앞면으로. 마지막 장이었으면 다시 접지 않고 바로 끝낸다 */
  function nextOrFinish(): void {
    if (index + 1 >= deck.length) advance();
    else turn(advance, () => nextBtn.classList.remove('is-hidden'));
  }

  deck = shuffle(pool);
  index = 0;
  head.setProgress(0, deck.length);
  render();
  return {
    el: h('div', { class: 'hj-view hj-cards' }, head.el, h('div', { class: 'hj-cards-body' }, card, nextBtn)),
    start: () => ctx.audio.say(cfg.voices.ask.cards),
    destroy() {},
  };
}
