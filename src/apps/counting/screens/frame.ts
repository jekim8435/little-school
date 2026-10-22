/**
 * 10칸 판 `frame` (5-2) — 한 판 6문제. (가) 수만큼 놓기 + 2단계부터 (나) ‘10이 되려면 몇 개 더?’ 2문제.
 * (가) 왼쪽 큰 숫자, 오른쪽 10칸 판(3단계는 판 2개 위아래) + ‘다 했어요’(구슬 1개 이상일 때만 켜짐).
 *      빈 칸을 누르면 다음 순서 칸에 구슬, 구슬을 누르면 마지막 하나가 빠진다. 놓고 뺄 때마다 개수를 읽는다
 * (나) 왼쪽 10칸 판(구슬 N개), 오른쪽 숫자 카드. 고른 뒤 빈 칸을 ‘더 채우기’ 구슬로 하나씩 채우며 이어 센다
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { pickNumberChoices } from '../logic/choices';
import { FRAME_ROUND } from '../logic/config';
import { canSubmit, capacityFor, FRAME_CELLS, framesFor, placeBead, removeBead } from '../logic/frame';
import { answerOf, answerProblem, currentProblem, frameDraws, frameRound, isRoundDone, progressOf, type Round } from '../logic/round';
import { COUNTING_STRINGS as S } from '../strings';
import { beadsOf, choicesEl, fill, frameEl, headerEl, markChoices } from '../ui';
import { V } from '../voiceIds';

const NEXT_AFTER_CORRECT = 1900;
const NEXT_AFTER_WRONG = 2800;
/** ‘더 채우기’ 구슬을 하나씩 놓는 간격 (ms) */
const FILL_STEP = 650;

export function frameView(e: Engine): View {
  const { ctx, timers } = e;
  const level = e.level;
  let round: Round = frameRound(e.draw(frameDraws(level, FRAME_ROUND)), level);
  const used: string[] = [];
  let count = 0;
  let shownAt = 0;
  let locked = false;
  let retryAnnounced = false;
  let lastKind = '';

  const head = headerEl(ctx, timers, () => e.menu(), { confirm: true, progress: true });
  const body = h('div', { class: 'cn-frame-body' });
  const view = h('div', { class: `cn-view cn-frameview is-level-${level}` }, head.el, body);

  function render(): void {
    const p = currentProblem(round);
    if (!p) return;
    head.setProgress(progressOf(round), round.main);
    locked = false;
    shownAt = Date.now();
    const retry = p.retry ? h('span', { class: 'cn-retry' }, S.retry) : null;
    if (p.kind === 'make') renderMake(p.n, retry);
    else if (p.kind === 'more') renderMore(p.placed, retry);
  }

  // ── (가) 수만큼 놓기 ──
  function renderMake(n: number, retry: HTMLElement | null): void {
    count = 0;
    const frames = framesFor(level);
    const board = frameEl(frames, capacityFor(level), (i) => tapCell(i));
    const done = h('button', { class: 'cn-done', type: 'button', disabled: true, onClick: () => submit() }, S.done);
    const update = () => {
      board.set(beadsOf(count));
      done.disabled = !canSubmit(count);
      done.classList.toggle('is-off', !canSubmit(count));
    };
    function tapCell(i: number): void {
      if (locked) return;
      const before = count;
      count = i < count ? removeBead(count) : placeBead(count, level);
      if (count === before) return ctx.audio.sfx('tap');
      update();
      if (count === 0) return ctx.audio.sfx('tap');
      // 3단계에서 첫 판이 다 차면 “열! 한 묶음이에요” + 판 반짝 (1·2단계는 그냥 “열”)
      if (level === 3 && count === FRAME_CELLS && before < count) {
        board.flash(0);
        ctx.audio.say(V.ten);
      } else ctx.audio.say(V.num(count));
    }
    function submit(): void {
      if (locked || !canSubmit(count)) return;
      locked = true;
      const p = currentProblem(round);
      if (!p || p.kind !== 'make') return;
      const correct = count === n;
      e.record(n, correct, { activity: 'frame', kind: 'make', level, chosen: count, retry: p.retry }, Date.now() - shownAt, !p.retry);
      ctx.ui.feedback(correct ? 'correct' : 'oops');
      done.disabled = true;
      if (!correct) {
        // 구슬이 정답 개수로 맞춰지는 연출
        timers.set(() => {
          count = n;
          update();
          done.disabled = true;
          view.classList.add('is-fixed');
        }, 500);
      }
      timers.set(() => ctx.audio.say(V.total(n)), correct ? 300 : 700);
      timers.set(() => advance(correct), correct ? NEXT_AFTER_CORRECT : NEXT_AFTER_WRONG);
    }
    fill(
      body,
      h('div', { class: 'cn-frame-left' }, retry, h('span', { class: 'cn-bignum' }, String(n))),
      h('div', { class: 'cn-frame-right' }, board.el, done),
    );
    update();
    view.classList.remove('is-fixed');
  }

  // ── (나) 10이 되려면 몇 개 더? ──
  function renderMore(placed: number, retry: HTMLElement | null): void {
    const answer = 10 - placed;
    const board = frameEl(1, FRAME_CELLS);
    board.set(beadsOf(placed));
    const nums = pickNumberChoices(answer, 1, 9, e.choiceCount, used);
    const box = choicesEl(nums, (c) => choose(c));
    function choose(c: number): void {
      if (locked) return;
      locked = true;
      const p = currentProblem(round);
      if (!p || p.kind !== 'more') return;
      const correct = c === answer;
      e.record(answer, correct, { activity: 'frame', kind: 'more', level, chosen: c, choices: nums.slice(), retry: p.retry }, Date.now() - shownAt, !p.retry);
      markChoices(box, answer, c);
      ctx.ui.feedback(correct ? 'correct' : 'oops');
      // 빈 칸을 ‘더 채우기’ 구슬로 하나씩: “여섯, 일곱 … 열”
      for (let k = 1; k <= answer; k++) {
        timers.set(() => {
          board.set(beadsOf(placed, k));
          ctx.audio.say(V.num(placed + k));
        }, 500 + (k - 1) * FILL_STEP);
      }
      const filled = 500 + answer * FILL_STEP;
      timers.set(() => advance(correct), filled + (correct ? 900 : 1400));
    }
    fill(body, h('div', { class: 'cn-more-left' }, retry, board.el), h('div', { class: 'cn-more-right' }, box));
  }

  /**
   * 문제 소리. (나)는 늘 질문, (가)는 종류가 바뀔 때만 “숫자만큼 구슬을 놓아 봐요” → 이어서 숫자.
   * lead(다시 내는 문제 안내)가 있으면 그것 다음에 바로 문제 소리. 이어 말하기는 한 개만 예약되므로 두 단계까지만 잇는다
   */
  function sayPrompt(lead?: string): void {
    const p = currentProblem(round);
    if (!p) return;
    const first = p.kind === 'more' ? V.ask.moreToTen : V.num(answerOf(p));
    if (lead) {
      ctx.audio.say(lead);
      ctx.audio.sayNext(first);
    } else if (p.kind === 'make' && lastKind !== 'make') {
      ctx.audio.say(V.ask.make);
      ctx.audio.sayNext(first);
    } else if (p.kind === 'make') ctx.audio.sayNext(first);
    else ctx.audio.say(first);
    lastKind = p.kind;
  }

  function advance(correct: boolean): void {
    round = answerProblem(round, correct);
    head.setProgress(progressOf(round), round.main);
    if (isRoundDone(round)) return e.finish('frame');
    render();
    const p = currentProblem(round);
    if (p && p.retry && !retryAnnounced) {
      retryAnnounced = true;
      sayPrompt(V.ask.retry);
    } else sayPrompt();
  }

  return {
    el: view,
    start() {
      render();
      sayPrompt();
    },
    destroy() {},
  };
}
