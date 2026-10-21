/**
 * 과목 화면 (명세 5-3): 상단 바(집 버튼·과목 이름·진행) + 과목 모듈 영역.
 * - 집 버튼은 실수 방지로 한 번 누르면 확인 말풍선, 한 번 더 누르면 나간다
 * - 화면을 떠날 때 반드시 unmount() 후 DOM을 비운다
 * - 세로 방향 안내·백그라운드 전환 때 pause(), 돌아오면 resume() (명세 2-4, 4-2)
 */
import { findApp } from '../apps/registry';
import type { AppModule, StarResult } from '../apps/types';
import { createContext } from '../core/ctx';
import { rewardStatus } from '../core/rewards';
import type { Screen } from '../router';
import type { Shell } from '../shell';
import { isLandscape, onViewportChange } from '../ui/compat';
import { h } from '../ui/dom';

/** 확인 말풍선이 떠 있는 시간 */
const CONFIRM_MS = 3000;

export function appHostScreen(shell: Shell, appId: string): Screen {
  const { store, audio, router } = shell;
  const entry = findApp(appId)!; // 없는 과목은 라우터 가드가 허브로 돌린다
  let mod: AppModule | null = null;
  let mounted = false;
  let destroyed = false;
  let paused = false;
  let dispose = () => {};

  // ── 상단 바 ──
  const bubble = h('div', { class: 'home-bubble', role: 'status' }, '한 번 더 누르면 집으로 가요');
  let confirmTimer = 0;
  const homeButton = h('button', { class: 'btn btn-plain home-button', type: 'button', 'aria-label': '집으로' }, h('span', { class: 'home-icon' }, '🏠'));
  homeButton.addEventListener('click', () => {
    if (bubble.classList.contains('is-visible')) {
      leave();
      return;
    }
    bubble.classList.add('is-visible');
    audio.say('shell.app.home-confirm');
    window.clearTimeout(confirmTimer);
    confirmTimer = window.setTimeout(() => bubble.classList.remove('is-visible'), CONFIRM_MS);
  });

  const progress = h('div', { class: 'app-progress' });
  const renderProgress = () => {
    const st = rewardStatus(store, appId);
    progress.textContent = st.doneToday ? '오늘 스티커 ✓' : `★ ${Math.min(st.stars, st.ratio)}/${st.ratio}`;
    progress.classList.toggle('is-done', st.doneToday);
  };
  renderProgress();

  const bar = h(
    'div',
    { class: 'app-bar' },
    h('div', { class: 'app-bar-side' }, homeButton, bubble),
    h('div', { class: 'app-bar-title' }, entry.name),
    h('div', { class: 'app-bar-side is-right' }, progress),
  );

  // ── 과목 영역 ──
  const body = h('div', { class: `app-body app-${appId}` }, h('p', { class: 'app-loading' }, '불러오는 중…'));
  const fx = h('div', { class: 'app-fx', 'aria-hidden': 'true' });
  const el = h('div', { class: 'screen app-host', style: `--subject:${entry.color}` }, bar, h('div', { class: 'app-main' }, body, fx));

  function leave(): void {
    router.go({ name: 'hub' });
  }

  function feedback(kind: 'correct' | 'oops'): void {
    if (kind === 'correct') {
      audio.sfx('correct');
      fx.replaceChildren(h('div', { class: 'fx-correct' }));
    } else {
      audio.sfx('oops');
      body.classList.remove('is-shaking');
      void body.offsetWidth; // 애니메이션 다시 시작
      body.classList.add('is-shaking');
    }
  }

  function onStar(_r: StarResult): void {
    renderProgress(); // 별이 날아가는 연출은 6번에서
  }

  function setPaused(p: boolean): void {
    if (!mounted || !mod || p === paused) return;
    paused = p;
    try {
      if (p) mod.pause?.();
      else mod.resume?.();
    } catch (e) {
      console.error(e);
    }
  }
  const offViewport = onViewportChange((landscape) => setPaused(!landscape || document.visibilityState === 'hidden'));
  const onVisibility = () => setPaused(document.visibilityState === 'hidden' || !isLandscape());
  document.addEventListener('visibilitychange', onVisibility);

  entry.load().then(
    (m) => {
      if (destroyed) return; // 불러오는 사이에 나갔다
      mod = m.default;
      const c = createContext({
        entry,
        schema: mod.settingsSchema,
        store,
        audio,
        exit: leave,
        isTimeUp: () => false, // 7번(학습 시간)에서 연결
        feedback,
        onStar,
        baseUrl: import.meta.env.BASE_URL,
      });
      dispose = c.dispose;
      body.replaceChildren();
      try {
        mod.mount(body, c.ctx);
        mounted = true;
      } catch (e) {
        showError(e);
        return;
      }
      // 오늘 스티커를 받은 과목: 들어올 때 한 번 안내 (명세 6-3)
      if (rewardStatus(store, appId).doneToday) audio.say('shell.app.sticker-done');
      if (!isLandscape()) setPaused(true);
    },
    (e) => {
      if (!destroyed) showError(e);
    },
  );

  function showError(e: unknown): void {
    console.error(e);
    body.replaceChildren(
      h(
        'div',
        { class: 'app-error' },
        h('p', { class: 'text-big' }, '과목을 열지 못했어요'),
        h('p', { class: 'text-muted' }, String(e instanceof Error ? e.message : e)),
      ),
    );
  }

  return {
    el,
    destroy() {
      destroyed = true;
      window.clearTimeout(confirmTimer);
      offViewport();
      document.removeEventListener('visibilitychange', onVisibility);
      if (mounted && mod) {
        try {
          mod.unmount();
        } catch (e) {
          console.error(e);
        }
      }
      mounted = false;
      dispose();
      audio.stop();
      body.replaceChildren();
    },
  };
}
