/**
 * 10칸 판 `frame` (5-2) — 수만큼 놓기, 한 판 = 주머니에서 꺼낸 수 6개.
 * 왼쪽 큰 숫자 + 그 아래 ‘다 했어요’(구슬 1개 이상일 때만 켜짐), 오른쪽 10칸 판(단계만큼 판 1~3개, 위아래).
 * 빈 칸을 누르면 다음 순서 칸에 구슬, 구슬을 누르면 마지막 하나가 빠진다. 놓고 뺄 때마다 개수를 읽는다.
 * 판 하나가 다 차면 반짝이고, 첫 판(10)은 “열! 한 묶음이에요”
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { FRAME_ROUND } from '../logic/config';
import { canSubmit, capacityFor, frameFilled, framesFor, placeBead, removeBead } from '../logic/frame';
import { answerProblem, currentProblem, frameRound, isRoundDone, progressOf, type Round } from '../logic/round';
import { COUNTING_STRINGS as S } from '../strings';
import { beadsOf, fill, frameEl, headerEl } from '../ui';
import { V } from '../voiceIds';

const NEXT_AFTER_CORRECT = 1900;
const NEXT_AFTER_WRONG = 2800;

export function frameView(e: Engine): View {
  const { ctx, timers } = e;
  const level = e.level;
  let round: Round = frameRound(e.draw(FRAME_ROUND));
  let count = 0;
  let shownAt = 0;
  let locked = false;
  let retryAnnounced = false;

  const head = headerEl(ctx, timers, () => e.menu(), { confirm: true, progress: true });
  const body = h('div', { class: 'cn-frame-body' });
  const view = h('div', { class: `cn-view cn-frameview is-level-${level}` }, head.el, body);

  function render(): void {
    const p = currentProblem(round);
    if (!p || p.kind !== 'make') return;
    const n = p.n;
    head.setProgress(progressOf(round), round.main);
    locked = false;
    shownAt = Date.now();
    count = 0;
    const board = frameEl(framesFor(level), capacityFor(level), (i) => tapCell(i));
    const done = h('button', { class: 'cn-done', type: 'button', disabled: true, onClick: () => submit() }, S.done);
    const update = () => {
      board.set(beadsOf(count));
      done.disabled = !canSubmit(count) || locked;
      done.classList.toggle('is-off', !canSubmit(count));
    };
    function tapCell(i: number): void {
      if (locked) return;
      const before = count;
      count = i < count ? removeBead(count) : placeBead(count, level);
      if (count === before) return ctx.audio.sfx('tap');
      update();
      if (count === 0) return ctx.audio.sfx('tap');
      // 판 하나가 다 차면 반짝. 첫 판(10)은 “열! 한 묶음이에요”
      const filled = frameFilled(before, count);
      if (filled >= 0) board.flash(filled);
      ctx.audio.say(filled === 0 ? V.ten : V.num(count));
    }
    function submit(): void {
      const cur = currentProblem(round);
      if (locked || !canSubmit(count) || !cur) return;
      locked = true;
      const correct = count === n;
      e.record(n, correct, { activity: 'frame', level, chosen: count, retry: cur.retry }, Date.now() - shownAt, !cur.retry);
      ctx.ui.feedback(correct ? 'correct' : 'oops');
      done.disabled = true;
      if (!correct) {
        // 구슬이 정답 개수로 맞춰지는 연출
        timers.set(() => {
          count = n;
          update();
        }, 500);
      }
      timers.set(() => ctx.audio.say(V.total(n)), correct ? 300 : 700);
      timers.set(() => advance(correct), correct ? NEXT_AFTER_CORRECT : NEXT_AFTER_WRONG);
    }
    fill(
      body,
      h('div', { class: 'cn-frame-left' }, p.retry ? h('span', { class: 'cn-retry' }, S.retry) : null, h('span', { class: 'cn-bignum' }, String(n)), done),
      h('div', { class: 'cn-frame-right' }, board.el),
    );
    update();
  }

  function advance(correct: boolean): void {
    round = answerProblem(round, correct);
    head.setProgress(progressOf(round), round.main);
    if (isRoundDone(round)) return e.finish('frame');
    render();
    const p = currentProblem(round);
    if (!p || p.kind !== 'make') return;
    if (p.retry && !retryAnnounced) {
      retryAnnounced = true;
      ctx.audio.say(V.ask.retry);
    }
    // 정답 소리·다시 내기 안내가 끝난 뒤에 숫자
    ctx.audio.sayNext(V.num(p.n));
  }

  return {
    el: view,
    start() {
      render();
      const p = currentProblem(round);
      // 판 시작: 안내 → 이어서 첫 숫자
      ctx.audio.say(V.ask.make);
      if (p && p.kind === 'make') ctx.audio.sayNext(V.num(p.n));
    },
    destroy() {},
  };
}
