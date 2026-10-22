/**
 * 세어 보기 `count` (5-1) — 한 판 = 주머니에서 꺼낸 수 6개.
 * 왼쪽 약 62% 사물 영역, 오른쪽 숫자 카드(다 센 뒤에만 나타남). 사물을 누르면 ①②③ 표시 + 수 읽기,
 * 이미 센 사물은 다시 세지 않는다(tap 효과음만). 틀리면 정답 카드 강조 + 표시를 1부터 차례로 깜빡이며 “모두 N 개!”.
 */
import { h } from '../../../ui/dom';
import type { Engine, View } from '../index';
import { pickNumberChoices } from '../logic/choices';
import { COUNT_ROUND } from '../logic/config';
import { isAllCounted, startCount, tapObject, type CountState } from '../logic/count';
import { scatter } from '../logic/layout';
import { levelMax } from '../logic/level';
import { answerProblem, countRound, currentProblem, isRoundDone, progressOf, type Problem, type Round } from '../logic/round';
import { COUNTING_STRINGS as S } from '../strings';
import { choicesEl, fill, headerEl, markChoices, picEl, unitPx } from '../ui';
import { V } from '../voiceIds';

/** 다 센 뒤 보기가 나올 때까지 (ms) */
const CHOICES_AFTER = 500;
const NEXT_AFTER_CORRECT = 1900;
/** 틀렸을 때 표시를 하나씩 깜빡이는 간격 (ms). 많으면 모두 합쳐 FLASH_ALL 안에 */
const FLASH_STEP = 260;
const FLASH_ALL = 2400;

export function countView(e: Engine): View {
  const { ctx, timers } = e;
  let round: Round = countRound(e.draw(COUNT_ROUND), e.lastObject);
  const used: string[] = [];
  let state: CountState = startCount(0);
  let objects: HTMLElement[] = [];
  let shownAt = 0;
  let locked = false;
  let retryAnnounced = false;

  const head = headerEl(ctx, timers, () => e.menu(), { confirm: true, progress: true });
  const area = h('div', { class: 'cn-count-area' });
  const side = h('div', { class: 'cn-count-side' });
  const view = h('div', { class: 'cn-view cn-count' }, head.el, h('div', { class: 'cn-count-body' }, area, side));

  const problem = () => currentProblem(round) as Extract<Problem, { kind: 'count' }> | undefined;

  function render(): void {
    const p = problem();
    if (!p) return;
    head.setProgress(progressOf(round), round.main);
    e.setLastObject(p.object);
    state = startCount(p.n);
    const u = unitPx();
    const placed = scatter(p.n, area.clientWidth / u, area.clientHeight / u);
    objects = placed.map((pos, i) => {
      const mark = h('span', { class: 'cn-mark' });
      const b = h('button', { class: 'cn-obj', type: 'button', onClick: () => tap(i) }, picEl(p.object), mark);
      b.style.left = `${pos.x * u}px`;
      b.style.top = `${pos.y * u}px`;
      b.style.width = b.style.height = `${pos.size * u}px`;
      return b;
    });
    area.replaceChildren(...objects);
    fill(side, p.retry ? h('span', { class: 'cn-retry' }, S.retry) : null);
    shownAt = Date.now();
    locked = false;
  }

  function tap(i: number): void {
    if (locked || isAllCounted(state)) return;
    const r = tapObject(state, i);
    state = r.state;
    if (!r.fresh) return ctx.audio.sfx('tap');
    const b = objects[i];
    const mark = b.querySelector('.cn-mark') as HTMLElement;
    mark.textContent = String(state.marks[i]);
    b.classList.add('is-counted');
    b.classList.remove('is-pop');
    void b.offsetWidth;
    b.classList.add('is-pop');
    // 빠르게 연달아 누르면 앞 수 읽기를 끊고 새 수를 읽는다
    ctx.audio.say(V.num(state.counted));
    if (isAllCounted(state)) timers.set(showChoices, CHOICES_AFTER);
  }

  function showChoices(): void {
    const p = problem();
    if (!p) return;
    const nums = pickNumberChoices(p.n, 1, levelMax(e.level), e.choiceCount, used);
    const box = choicesEl(nums, (n) => choose(n, nums, box));
    fill(side, p.retry ? h('span', { class: 'cn-retry' }, S.retry) : null, box);
    ctx.audio.sayNext(V.ask.howMany);
  }

  function choose(n: number, nums: number[], box: HTMLElement): void {
    const p = problem();
    if (locked || !p) return;
    locked = true;
    const correct = n === p.n;
    e.record(
      p.n,
      correct,
      { activity: 'count', level: e.level, chosen: n, choices: nums.slice(), retry: p.retry, tapsBeforeAll: state.taps },
      Date.now() - shownAt,
      !p.retry,
    );
    markChoices(box, p.n, n);
    ctx.ui.feedback(correct ? 'correct' : 'oops');
    let wait = NEXT_AFTER_CORRECT;
    if (!correct) {
      // 표시를 1부터 차례로 깜빡이며 세어 준다
      const order = objects.slice().sort((a, b) => Number(a.textContent) - Number(b.textContent));
      const step = Math.min(FLASH_STEP, FLASH_ALL / order.length);
      order.forEach((b, k) =>
        timers.set(() => {
          b.classList.remove('is-flash');
          void b.offsetWidth;
          b.classList.add('is-flash');
        }, 300 + k * step),
      );
      wait = Math.max(2600, 300 + order.length * step + 1400);
    }
    timers.set(() => ctx.audio.say(V.total(p.n)), 300);
    timers.set(() => advance(correct), wait);
  }

  function advance(correct: boolean): void {
    round = answerProblem(round, correct);
    head.setProgress(progressOf(round), round.main);
    if (isRoundDone(round)) return e.finish('count');
    render();
    const p = problem();
    if (p && p.retry && !retryAnnounced) {
      retryAnnounced = true;
      ctx.audio.say(V.ask.retry);
    }
  }

  return {
    el: view,
    start() {
      // 영역 크기를 재야 하므로 화면에 붙인 뒤 첫 문제를 그린다
      render();
      ctx.audio.say(V.ask.count);
    },
    destroy() {},
  };
}
