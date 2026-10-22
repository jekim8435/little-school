/**
 * 고르기 활동 3가지 — 한 판 = 출제 주머니에서 꺼낸 한자 10개.
 * - 듣고 고르기(listen): 훈음을 듣고 한자 고르기
 * - 그림 고르기(picture): 한자를 보고 뜻에 맞는 그림 고르기
 * - 음뜻 고르기(read): 한자를 보고 ‘바다 해’ 같은 한글 카드 고르기
 * 배치: 왼쪽 절반 문제, 오른쪽 절반 보기 3~4개를 세로로.
 * 틀리면 정답을 그림과 함께 잠깐 보여 주고 다음 문제로. 틀린 한자는 판 끝에 한 번씩 다시(익힘에는 첫 시도만).
 * 중간에 나가면 그 판은 처음부터 (이어하기 없음).
 */
import { h } from '../../../ui/dom';
import { pickChoices } from '../choices';
import type { ActivityId } from '../config';
import type { Engine, View } from '../module';
import { answerProblem, createQuizRound, currentProblem, isRoundDone, progressOf, ROUND_SIZE, type QuizRound } from '../round';
import { charEl, fill, headerEl, pictureEl, readingOf } from '../ui';

/** 맞힌 뒤 다음 문제까지 (ms) */
const NEXT_AFTER_CORRECT = 1400;
/** 틀린 뒤 정답을 보여 주는 시간 (ms) */
const NEXT_AFTER_WRONG = 2600;

export function quizView(e: Engine, activity: ActivityId): View {
  const { ctx, cfg, timers } = e;
  const count = Math.min(Number(e.settings.choiceCount) || 3, 4);
  let round: QuizRound = createQuizRound(e.draw(ROUND_SIZE));
  const used: string[] = [];
  let choices: string[] = [];
  let shownAt = 0;
  let locked = false;
  let retryAnnounced = false;

  const head = headerEl(ctx, cfg, timers, () => e.menu(), { confirm: true, progress: true });
  const prompt = h('div', { class: 'hj-prompt' });
  const options = h('div', { class: `hj-options hj-options-${activity} is-${count}` });
  const view = h('div', { class: `hj-view hj-quiz hj-quiz-${activity}` }, head.el, h('div', { class: 'hj-quiz-body' }, prompt, options));

  /** 문제 소리: 듣고 고르기는 훈음, 나머지는 활동 안내 (훈음을 들려주면 답이 되므로) */
  const sayPrompt = () => {
    const p = currentProblem(round);
    if (!p) return;
    if (activity === 'listen') ctx.audio.say(cfg.voices.char(p.char));
    else ctx.audio.say(activity === 'picture' ? cfg.voices.ask.picture : cfg.voices.ask.read);
  };

  function render(): void {
    const p = currentProblem(round);
    if (!p) return;
    head.setProgress(progressOf(round), round.main);
    const item = e.itemOf(p.char);
    choices = pickChoices(p.char, e.learned, count, cfg.set.confusables, used);
    const replay = h(
      'button',
      {
        class: 'hj-replay',
        type: 'button',
        onClick: () => {
          ctx.audio.sfx('tap');
          sayPrompt();
        },
      },
      `🔊 ${cfg.strings.replay}`,
    );
    fill(
      prompt,
      activity === 'listen' ? h('span', { class: 'hj-prompt-ear' }, '👂') : charEl(item.char, 'hj-prompt-char'),
      p.retry ? h('span', { class: 'hj-retry' }, cfg.strings.retry) : null,
      replay,
    );
    options.replaceChildren(
      ...choices.map((c) =>
        h('button', { class: 'hj-option', type: 'button', 'data-char': c, onClick: () => choose(c) }, optionContent(c)),
      ),
    );
    shownAt = Date.now();
    locked = false;
  }

  function optionContent(c: string): HTMLElement {
    const it = e.itemOf(c);
    if (activity === 'listen') return charEl(c, 'hj-option-char');
    if (activity === 'picture') return pictureEl(it, 'hj-option-pic');
    return h('span', { class: 'hj-option-text' }, readingOf(it));
  }

  function choose(c: string): void {
    if (locked) return;
    locked = true;
    const p = currentProblem(round);
    if (!p) return;
    const correct = c === p.char;
    const item = e.itemOf(p.char);
    e.record(p.char, correct, { activity, chosen: c, choices: choices.slice(), retry: p.retry }, Date.now() - shownAt, !p.retry);
    const buttons = options.querySelectorAll<HTMLElement>('.hj-option');
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const bc = b.getAttribute('data-char');
      if (bc === p.char) b.classList.add('is-answer');
      else if (bc === c) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    }
    // 정답 보여 주기: 왼쪽 문제 자리에 그림 + 한자 + 훈음
    prompt.replaceChildren(
      h(
        'div',
        { class: `hj-reveal${correct ? ' is-correct' : ''}` },
        pictureEl(item, 'hj-reveal-pic'),
        h('span', { class: 'hj-reveal-row' }, charEl(item.char, 'hj-reveal-char'), h('span', { class: 'hj-reveal-reading' }, readingOf(item))),
      ),
    );
    ctx.ui.feedback(correct ? 'correct' : 'oops');
    // 그림 고르기는 뜻만(“바다”), 나머지는 훈음(“바다 해”)
    timers.set(() => ctx.audio.say(activity === 'picture' ? cfg.voices.meaning(p.char) : cfg.voices.char(p.char)), 350);
    timers.set(() => advance(correct), correct ? NEXT_AFTER_CORRECT : NEXT_AFTER_WRONG);
  }

  function advance(correct: boolean): void {
    round = answerProblem(round, correct);
    head.setProgress(progressOf(round), round.main);
    if (isRoundDone(round)) return e.finish(activity);
    const p = currentProblem(round);
    render();
    if (p && p.retry && !retryAnnounced) {
      retryAnnounced = true;
      ctx.audio.say(cfg.voices.ask.retry);
      // 다시 내는 문제 안내 뒤에 문제 소리
      timers.set(sayPrompt, 2600);
    } else if (activity === 'listen') {
      sayPrompt();
    }
  }

  render();
  return {
    el: view,
    start() {
      // 판 시작: 활동 안내 한 번 → (듣고 고르기면) 첫 문제 훈음
      ctx.audio.say(activity === 'listen' ? cfg.voices.ask.listen : activity === 'picture' ? cfg.voices.ask.picture : cfg.voices.ask.read);
      if (activity === 'listen') timers.set(sayPrompt, 2600);
    },
    destroy() {},
  };
}
