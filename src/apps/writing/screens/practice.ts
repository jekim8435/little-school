/**
 * 쓰기 연습 화면 (한글쓰기 앱 screens/practice.ts를 과목 모듈로 옮김, 명세 14-2).
 * 가로 전용 배치: 위 글자 띠 / 왼쪽 글자 정보 · 가운데 정사각형 쓰기 칸 · 오른쪽 버튼.
 * - 따라 쓰기(§5.2): 획마다 바로 판정. 한 획이라도 틀렸으면 그 글자는 ‘나중에’(회차 끝에 다시)
 * - 혼자 쓰기(§6.2): 다 쓰고 [확인]으로 전체 판정. 틀리면 ‘나중에’, [순서 보기]로 바른 순서
 * - 글자마다 ctx.log.record (부모 모드 ‘자주 틀린 글자’와 틀린 이유)
 */
import type { AppContext } from '../../types';
import { GuideView } from '../../../shared/canvas/guideView';
import { ERROR_COLOR, WritingStage } from '../../../shared/canvas/stage';
import { TOLERANCES } from '../../../shared/judge/config';
import { judgeGlyph } from '../../../shared/judge/judgeGlyph';
import { isAccidental, judgeStroke } from '../../../shared/judge/matchStroke';
import { observeResize } from '../../../ui/compat';
import { h } from '../../../ui/dom';
import { PRESS_START_EVENTS } from '../../../ui/input';
import { glyphsOf, type Category } from '../categories';
import { FREE_FAIL, hintFor, PRAISE, RETRY } from '../data/messages';
import type { Glyph, ModeId, Point } from '../data/types';
import type { Round } from '../round';
import type { WritingSettings } from '../settings';
import { showPraise } from '../ui/praise';
import { Toast } from '../ui/toast';
import { glyphVoiceId, praiseVoiceId, retryVoiceId } from '../voice';

/** 같은 획을 이만큼 연속으로 틀리면 그 획 애니메이션을 다시 보여 준다 */
const DEMO_AFTER_FAILS = 3;

export interface PracticeParams {
  ctx: AppContext;
  settings: WritingSettings;
  category: Category;
  mode: ModeId;
  index: number;
  round: Round;
  /** 한 글자를 끝까지 쓴 결과 → 회차에 반영하고 다음 글자(또는 엔딩)로 */
  onAttempt(glyph: Glyph, clean: boolean): void;
  /** 칭찬이 끝난 뒤 다음으로 */
  onNext(): void;
  goTo(index: number): void;
  switchMode(): void;
  back(): void;
}

export interface PracticeView {
  el: HTMLElement;
  pause(): void;
  destroy(): void;
}

const rand = (n: number) => Math.floor(Math.random() * n);

export function practiceView(p: PracticeParams): PracticeView {
  const { ctx, settings, category, mode, index } = p;
  const glyphs = glyphsOf(category);
  const glyph = glyphs[index];
  const say = (id: string) => ctx.audio.say(id);
  const sayGlyph = () => say(glyphVoiceId(glyph, settings.numberReading));

  const stage = new WritingStage((el, handlers, opts) => ctx.input.attach(el, handlers, opts));
  const guide = new GuideView(stage, glyph, mode === 'guided' ? 'guide' : settings.freeHint === 'outline' ? 'outline' : 'none');
  const toast = new Toast();

  // 쓰기 칸: 남은 영역의 짧은 변에 맞춘 정사각형 (cq 단위가 없는 Safari 12라 JS로 맞춘다)
  const area = h('div', { class: 'w-stage-area' }, stage.el, toast.el);
  const stopFit = observeResize(area, () => {
    const side = Math.floor(Math.min(area.clientWidth, area.clientHeight));
    stage.el.style.width = stage.el.style.height = `${side}px`;
  });

  const el = h('div', { class: `w-view w-practice is-${mode}` });

  // ── 위쪽 글자 띠: 이번 회차 클리어 ✓, 나중에 다시 쓸 글자 ●, 지금 글자 강조. 눌러서 옮겨 간다 ──
  const strip = h(
    'nav',
    { class: `w-strip${glyphs.length > 14 ? ' is-two-rows' : ''}`, 'aria-label': '글자 고르기' },
    ...glyphs.map((g, i) => {
      const cleared = p.round.cleared.indexOf(g.id) >= 0;
      const later = !cleared && p.round.later.indexOf(g.id) >= 0;
      return h(
        'button',
        {
          class: `w-tile${i === index ? ' is-current' : ''}${cleared ? ' is-cleared' : ''}${later ? ' is-later' : ''}`,
          type: 'button',
          'aria-label': `${g.name}${cleared ? ' (완료)' : ''}`,
          onClick: () => i !== index && p.goTo(i),
        },
        g.id,
      );
    }),
  );

  const caption = h('div', { class: 'w-caption' });
  const left = h(
    'div',
    { class: 'w-side w-left' },
    h('button', { class: 'btn btn-plain w-back', type: 'button', onClick: p.back }, '◀ 글자 고르기'),
    h('div', { class: 'w-glyph-name' }, glyph.name),
    h('button', { class: 'btn btn-soft w-listen', type: 'button', 'aria-label': '읽어 주기', onClick: sayGlyph }, '🔊 듣기'),
    h('div', { class: 'w-progress' }, `${category.name} ${p.round.cleared.length} / ${glyphs.length}`),
    caption,
  );

  let closePraise: (() => void) | null = null;
  const started = Date.now();
  /** 이번 시도에서 틀린 이유들 (기록용) */
  let errors: string[] = [];

  /** 한 글자를 끝까지 썼을 때: 회차에 반영하고 칭찬한 뒤 다음으로 */
  const finish = (clean: boolean) => {
    stage.enabled = false;
    ctx.log.record({ item: glyph.id, correct: clean, durationMs: Date.now() - started, meta: { category: category.id, mode, errors } });
    p.onAttempt(glyph, clean);
    let message: string;
    if (clean) {
      ctx.audio.sfx('cheer');
      const i = rand(PRAISE.length);
      message = PRAISE[i];
      say(praiseVoiceId(i));
    } else {
      // 따라 쓰기에서 틀린 획이 있었던 글자: 끝까지 쓴 것은 칭찬하고, 회차 끝에 다시
      ctx.audio.sfx('correct');
      message = '끝까지 잘 썼어!';
      say('writing.round.later');
    }
    closePraise = showPraise(el, {
      message,
      sub: clean ? undefined : '이 글자는 나중에 한 번 더 써 보자',
      onDone: () => p.onNext(),
    });
  };

  const tol = TOLERANCES[settings.difficulty];
  const buttons = mode === 'guided' ? setupGuided() : setupFree();

  /** 따라 쓰기: 획마다 바로 판정한다 */
  function setupGuided(): HTMLElement[] {
    let fails = 0;
    let hadError = false;
    // 애니메이션 중에 캔버스를 만지면 애니메이션을 멈추고 바로 쓰게 한다
    const stopOnPress = () => {
      if (guide.playing) guide.stopDemo();
    };
    for (const type of PRESS_START_EVENTS) stage.el.addEventListener(type, stopOnPress, { capture: true });

    stage.onStrokeEnd = (points: Point[]) => {
      const cur = guide.state.current;
      if (cur < 0 || cur >= glyph.strokes.length) return;
      if (isAccidental(points, glyph.strokes[cur].type === 'dot')) return; // 실수 터치

      const r = judgeStroke(points, glyph.strokes, cur, tol);
      stage.el.setAttribute('data-last-result', r.ok ? 'ok' : String(r.reason));
      if (r.ok) {
        fails = 0;
        stage.addStroke(points);
        guide.completeStroke(cur);
        toast.hide();
        if (guide.state.current >= glyph.strokes.length) finish(!hadError);
        else ctx.audio.sfx('correct');
        return;
      }
      // 틀리면 방금 그은 획만 빨갛게 보여 주고 지운다
      hadError = true;
      if (r.reason && errors.indexOf(r.reason) < 0) errors.push(r.reason);
      fails++;
      stage.flashStroke(points, ERROR_COLOR, 400);
      ctx.audio.sfx('oops');
      const i = rand(RETRY.length);
      toast.show(RETRY[i], hintFor(r.reason, cur + 1));
      say(retryVoiceId(i));
      if (fails >= DEMO_AFTER_FAILS) {
        fails = 0;
        window.setTimeout(() => void guide.playDemo([cur]), 600);
      }
    };

    /** 처음부터 다시: 새 시도 (틀린 획 기록도 새로) */
    const restart = () => {
      fails = 0;
      hadError = false;
      errors = [];
      toast.hide();
      stage.clear();
      guide.reset();
      stage.enabled = true;
    };
    return [
      h('button', { class: 'btn btn-big w-btn', type: 'button', onClick: () => void guide.playDemo() }, '▶ 다시 보기'),
      h('button', { class: 'btn btn-big w-btn', type: 'button', onClick: restart }, '↺ 처음부터'),
    ];
  }

  /** 혼자 쓰기: 다 쓴 뒤 [확인]을 누르면 전체를 판정한다 */
  function setupFree(): HTMLElement[] {
    const hintStyle = settings.freeHint === 'outline' ? 'outline' : 'none';
    // 상태마다 버튼을 통째로 바꿔 끼운다 (iOS 12 display:contents 버그로 숨김 속성은 쓰지 않음)
    const row = h('div', { class: 'w-btn-col' });
    const writeButtons = () => [
      h('button', { class: 'btn btn-big w-btn', type: 'button', onClick: retry }, '↺ 다시 쓰기'),
      h('button', { class: 'btn btn-big btn-primary w-btn', type: 'button', onClick: check }, '✔ 확인'),
    ];
    const reviewButtons = () => [
      h('button', { class: 'btn btn-big btn-primary w-btn', type: 'button', onClick: showOrder }, '▶ 순서 보기'),
      h('button', { class: 'btn btn-big w-btn', type: 'button', onClick: retry }, '↺ 다시 쓰기'),
    ];
    row.replaceChildren(...writeButtons());

    function showOrder(): void {
      stage.setGuideOnTop(true);
      guide.showAnswer();
      void guide.playDemo();
    }

    function check(): void {
      const strokes = stage.getStrokes().map((s) => s.points);
      if (strokes.length === 0) {
        toast.show('글자를 먼저 써 봐요');
        return;
      }
      const r = judgeGlyph(strokes, glyph, tol);
      stage.el.setAttribute('data-last-result', r.ok ? 'ok' : `${r.reason}@${r.failedIndex}`);
      if (r.ok) {
        finish(true);
        return;
      }
      // 틀림: 기록하고 ‘나중에’로. 아이가 쓴 획은 남기고 처음 틀린 획을 빨갛게
      stage.enabled = false;
      errors = r.reason ? [r.reason] : [];
      ctx.log.record({ item: glyph.id, correct: false, durationMs: Date.now() - started, meta: { category: category.id, mode, errors } });
      p.onAttempt(glyph, false);
      if (r.failedIndex !== undefined) stage.setStrokeColor(r.failedIndex, ERROR_COLOR);
      ctx.audio.sfx('oops');
      caption.textContent = FREE_FAIL;
      caption.classList.add('is-alert');
      say('writing.free.fail');
      row.replaceChildren(...reviewButtons());
    }

    /** 다시 쓰기: 새 시도. 틀린 뒤 다시 써서 맞히면 그 글자는 클리어 */
    function retry(): void {
      errors = [];
      toast.hide();
      caption.textContent = '';
      caption.classList.remove('is-alert');
      stage.clear();
      stage.setGuideOnTop(false);
      guide.reset();
      guide.setStyle(hintStyle);
      stage.enabled = true;
      row.replaceChildren(...writeButtons());
    }
    return [row];
  }

  const right = h(
    'div',
    { class: 'w-side w-right' },
    h('div', { class: 'w-mode-label' }, mode === 'guided' ? '✏️ 따라 쓰기' : '🌟 혼자 쓰기'),
    ...buttons,
    h('button', { class: 'btn btn-plain w-switch', type: 'button', onClick: p.switchMode }, mode === 'guided' ? '혼자 써 볼래' : '따라 쓸래'),
  );

  el.append(strip, h('div', { class: 'w-main' }, left, area, right));

  sayGlyph();
  let demoTimer = 0;
  if (mode === 'guided' && settings.autoDemo) {
    // 글자 읽기를 듣고 난 뒤 획순을 보여 준다
    demoTimer = window.setTimeout(() => void guide.playDemo(), 400);
  }

  return {
    el,
    pause() {
      if (guide.playing) guide.stopDemo();
    },
    destroy() {
      window.clearTimeout(demoTimer);
      if (closePraise) closePraise();
      stopFit();
      toast.hide();
      guide.destroy();
      stage.destroy();
    },
  };
}
