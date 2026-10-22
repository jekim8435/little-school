/**
 * 10 만들기 `ten` (5-5) — 한 판 6문제. 단계와 상관없이 미리 놓인 구슬 1~9개(서로 다르게).
 * 왼쪽 10칸 판, 오른쪽 숫자 카드. 고른 뒤 빈 칸을 ‘더 채우기’ 구슬로 하나씩 채우며 이어 센다(“여덟, 아홉, 열”).
 * 단계 계산에는 넣지 않는다(3장).
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { pickNumberChoices } from '../logic/choices';
import { TEN_ROUND } from '../logic/config';
import { FRAME_CELLS } from '../logic/frame';
import { answerOf, answerProblem, currentProblem, isRoundDone, progressOf, tenRound, type Round } from '../logic/round';
import { COUNTING_STRINGS as S } from '../strings';
import { beadsOf, choicesEl, fill, frameEl, headerEl, markChoices } from '../ui';
import { V } from '../voiceIds';

/** ‘더 채우기’ 구슬을 하나씩 놓는 간격 (ms) */
const FILL_STEP = 650;

export function tenView(e: Engine): View {
  const { ctx, timers } = e;
  let round: Round = tenRound(TEN_ROUND);
  const used: string[] = [];
  let shownAt = 0;
  let locked = false;
  let retryAnnounced = false;

  const head = headerEl(ctx, timers, () => e.menu(), { confirm: true, progress: true });
  const body = h('div', { class: 'cn-frame-body' });
  const view = h('div', { class: 'cn-view cn-tenview' }, head.el, body);

  function render(): void {
    const p = currentProblem(round);
    if (!p || p.kind !== 'more') return;
    const placed = p.placed;
    const answer = answerOf(p);
    head.setProgress(progressOf(round), round.main);
    locked = false;
    shownAt = Date.now();
    const board = frameEl(1, FRAME_CELLS);
    board.set(beadsOf(placed));
    const nums = pickNumberChoices(answer, 1, 9, e.choiceCount, used);
    const box = choicesEl(nums, (c) => choose(c));
    function choose(c: number): void {
      const cur = currentProblem(round);
      if (locked || !cur) return;
      locked = true;
      const correct = c === answer;
      e.record(answer, correct, { activity: 'ten', placed, chosen: c, choices: nums.slice(), retry: cur.retry }, Date.now() - shownAt, false);
      markChoices(box, answer, c);
      ctx.ui.feedback(correct ? 'correct' : 'oops');
      // 빈 칸을 ‘더 채우기’ 구슬로 하나씩: “여덟, 아홉, 열”
      for (let k = 1; k <= answer; k++) {
        timers.set(() => {
          board.set(beadsOf(placed, k));
          ctx.audio.say(V.num(placed + k));
        }, 500 + (k - 1) * FILL_STEP);
      }
      timers.set(() => advance(correct), 500 + answer * FILL_STEP + (correct ? 900 : 1400));
    }
    fill(
      body,
      h('div', { class: 'cn-more-left' }, p.retry ? h('span', { class: 'cn-retry' }, S.retry) : null, board.el),
      h('div', { class: 'cn-more-right' }, box),
    );
  }

  function advance(correct: boolean): void {
    round = answerProblem(round, correct);
    head.setProgress(progressOf(round), round.main);
    if (isRoundDone(round)) return e.finish('ten');
    render();
    const p = currentProblem(round);
    if (p && p.retry && !retryAnnounced) {
      retryAnnounced = true;
      ctx.audio.say(V.ask.retry);
      ctx.audio.sayNext(V.ask.moreToTen);
    } else ctx.audio.say(V.ask.moreToTen);
  }

  return {
    el: view,
    start() {
      render();
      // 판 시작: “열을 만들어 봐요” → 이어서 질문
      ctx.audio.say(V.ask.ten);
      ctx.audio.sayNext(V.ask.moreToTen);
    },
    destroy() {},
  };
}
