import type { Glyph } from '../types';
import { pathLength } from '../judge/resample';
import { drawGuide, initialGuideState, type GuideState } from './guide';
import { drawPracticeGrid, type WritingStage } from './stage';

/** 획순 애니메이션 시간 (ms) */
const DEMO = {
  /** 획 하나의 기본 시간 */
  base: 350,
  /** 길이 1(0~100 좌표)당 추가 시간 */
  perUnit: 11,
  /** 획 사이 쉬는 시간 */
  gap: 280,
  /** 마지막 획 뒤에 완성된 모습을 보여주는 시간 */
  hold: 600,
};

/**
 * 쓰기 영역의 가이드 레이어를 관리한다.
 * 현재 획 번호 원의 깜빡임과 획순 애니메이션을 위해 필요할 때만 매 프레임 다시 그린다.
 */
export class GuideView {
  readonly state: GuideState;
  private frame = 0;
  private demoCancel: (() => void) | null = null;

  constructor(
    private stage: WritingStage,
    private glyph: Glyph,
    style: GuideState['style'] = 'guide',
  ) {
    this.state = initialGuideState(glyph, style);
    stage.setGuideRenderer((ctx, size) => {
      drawPracticeGrid(ctx, size);
      drawGuide(ctx, size, this.glyph, this.state, performance.now());
    });
    this.loop();
  }

  destroy(): void {
    this.stopDemo();
    cancelAnimationFrame(this.frame);
    this.frame = -1;
  }

  /** 편집기에서 글자 데이터를 바꿨을 때. 진행 상태는 처음으로 돌린다 */
  setGlyph(glyph: Glyph): void {
    this.stopDemo();
    this.glyph = glyph;
    this.state.done = glyph.strokes.map(() => false);
    if (this.state.current >= 0) this.state.current = 0;
    this.refresh();
  }

  setStyle(style: GuideState['style']): void {
    this.state.style = style;
    this.refresh();
  }

  /** 획 완료 표시하고 다음 획을 강조 */
  completeStroke(i: number): void {
    this.state.done[i] = true;
    this.state.current = this.state.done.indexOf(false);
    if (this.state.current < 0) this.state.current = this.glyph.strokes.length;
    this.refresh();
  }

  /** 강조 없이 정답 가이드를 모두 같은 색으로 보여준다 (혼자 쓰기 오답 검토) */
  showAnswer(): void {
    this.stopDemo();
    this.state.style = 'guide';
    this.state.current = -1;
    this.state.done = this.glyph.strokes.map(() => false);
    this.refresh();
  }

  reset(): void {
    this.stopDemo();
    this.state.done = this.glyph.strokes.map(() => false);
    this.state.current = 0;
    this.refresh();
  }

  get playing(): boolean {
    return this.state.demo !== null;
  }

  /**
   * 획순 애니메이션을 재생한다. strokes를 주면 그 획만 보여준다.
   * 끝나거나 중단되면 resolve된다 (중단되면 false).
   */
  playDemo(strokes: number[] = this.glyph.strokes.map((_, i) => i)): Promise<boolean> {
    this.stopDemo();
    const durations = strokes.map((i) => DEMO.base + pathLength(this.glyph.strokes[i].points) * DEMO.perUnit);
    const prevStyle = this.state.style;
    const prevEnabled = this.stage.enabled;
    this.state.style = 'guide';
    this.stage.enabled = false;

    return new Promise((resolve) => {
      const start = performance.now();
      let timer = 0;
      const finish = (completed: boolean) => {
        cancelAnimationFrame(timer);
        this.state.demo = null;
        this.state.style = prevStyle;
        this.stage.enabled = prevEnabled;
        this.demoCancel = null;
        this.refresh();
        resolve(completed);
      };
      this.demoCancel = () => finish(false);

      const tick = () => {
        let t = performance.now() - start;
        let active = 0;
        while (active < strokes.length && t > durations[active] + DEMO.gap) {
          t -= durations[active] + DEMO.gap;
          active++;
        }
        if (active >= strokes.length) {
          // 다 그린 모습을 잠깐 보여준 뒤 끝낸다
          this.state.demo = { queue: strokes, active: strokes.length - 1, fraction: 1 };
          this.refresh();
          if (t > DEMO.hold - DEMO.gap) return finish(true);
        } else {
          const fraction = Math.min(1, t / durations[active]);
          this.state.demo = { queue: strokes, active, fraction: easeInOut(fraction) };
          this.refresh();
        }
        timer = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  stopDemo(): void {
    this.demoCancel?.();
  }

  refresh(): void {
    this.stage.renderGuide();
  }

  /** 현재 획 번호 원 깜빡임 (따라 쓰기에서만 필요) */
  private loop = (): void => {
    if (this.frame === -1) return;
    const s = this.state;
    if (s.style === 'guide' && !s.demo && s.current >= 0 && s.current < this.glyph.strokes.length) {
      this.refresh();
    }
    this.frame = requestAnimationFrame(this.loop);
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
