/**
 * 과목 화면 (명세 5-3): 상단 바(집 버튼·과목 이름·진행) + 과목 모듈 영역.
 * - 집 버튼은 실수 방지로 한 번 누르면 확인 말풍선, 한 번 더 누르면 나간다
 * - 화면을 떠날 때 반드시 unmount() 후 DOM을 비운다
 * - 세로 방향 안내·백그라운드 전환 때 pause(), 돌아오면 resume() (명세 2-4, 4-2)
 */
import { findApp } from '../apps/registry';
import type { AppModule } from '../apps/types';
import { createContext } from '../core/ctx';
import { rewardStatus, type StarOutcome } from '../core/rewards';
import { stickerSvg } from '../core/stickers';
import type { Screen } from '../router';
import type { Shell } from '../shell';
import { isLandscape, onViewportChange } from '../ui/compat';
import { h } from '../ui/dom';
import { PRESS_START_EVENTS } from '../ui/input';

/** 확인 말풍선이 떠 있는 시간 */
const CONFIRM_MS = 3000;

export function appHostScreen(shell: Shell, appId: string): Screen {
  const { store, audio, router, session } = shell;
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

  /** 별·스티커 연출이 끝나는 시각. 과목이 그 전에 나가려 하면 연출이 끝난 뒤 나간다 */
  let celebrateUntil = 0;
  let leaveTimer = 0;
  function leave(): void {
    const wait = celebrateUntil - Date.now();
    if (wait > 0) {
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(leave, wait);
      return;
    }
    // 하루 학습 시간에 닿았으면 허브 대신 ‘오늘 공부 끝’ (명세 5-5)
    router.go(session.isTimeUp() ? { name: 'done' } : { name: 'hub' });
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

  /**
   * 별 연출 (명세 6-2): 화면 가운데에서 별이 튀어나와 상단 바의 ★ n/비율로 날아간다(0.8초, transform만).
   * 스티커로 교환되면 스티커가 크게 나타났다가 날아가고 팡파레(6-3), 판이 다 차면 판 완성 축하(6-4).
   * 오늘 스티커를 이미 받아 별을 받지 못하면 아무것도 하지 않는다(과목의 칭찬 연출만 남음).
   */
  function onStar(r: StarOutcome): void {
    if (!r.accepted) return;
    const fly = flyTo(starEl(), 800);
    let t = 800;
    window.setTimeout(() => {
      fly.remove();
      renderProgress();
      progress.classList.remove('is-bump');
      void progress.offsetWidth;
      progress.classList.add('is-bump');
    }, t);
    if (r.sticker) {
      const art = r.sticker.art;
      window.setTimeout(() => {
        audio.sfx('cheer');
        audio.say('shell.sticker.got');
        const card = h('div', { class: 'fx-sticker' }, h('div', { class: 'fx-sticker-art' }), h('div', { class: 'fx-sticker-text' }, '스티커를 받았어요!'));
        (card.firstChild as HTMLElement).innerHTML = stickerSvg(art);
        fx.append(card);
        window.setTimeout(() => card.remove(), 2000);
      }, t);
      t += 2000;
    }
    if (r.boardCompleted) {
      window.setTimeout(() => {
        audio.say('shell.sticker.board-complete');
        const card = h('div', { class: 'fx-board' }, h('div', { class: 'fx-board-text' }, '스티커판 완성!'), h('div', { class: 'fx-board-sub' }, '엄마 아빠에게 보여 주세요'));
        fx.append(card);
        window.setTimeout(() => card.remove(), 3000);
      }, t);
      t += 3000;
    }
    celebrateUntil = Math.max(celebrateUntil, Date.now() + t);
  }

  function starEl(): HTMLElement {
    const s = h('div', { class: 'fx-star' });
    s.innerHTML = stickerSvg('star');
    return s;
  }

  /** el을 과목 영역 가운데에 띄웠다가 상단 바의 진행 표시 쪽으로 날려 보낸다 */
  function flyTo(node: HTMLElement, ms: number): HTMLElement {
    const host = node;
    el.append(host);
    const from = host.getBoundingClientRect();
    const to = progress.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    host.classList.add('is-pop');
    void host.offsetWidth;
    window.setTimeout(() => {
      host.style.transition = `transform ${ms * 0.6}ms ease-in, opacity ${ms * 0.6}ms ease-in`;
      host.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
      host.style.opacity = '0.4';
    }, ms * 0.4);
    return host;
  }

  function setPaused(p: boolean): void {
    session.setPaused(p); // 세로·백그라운드 동안 학습 시간도 멈춘다 (명세 7장)
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

  // ── 학습 시간 (명세 7장) ──
  const onPress = () => session.touch();
  for (const type of PRESS_START_EVENTS) document.addEventListener(type, onPress, true);
  // 1초마다 잰 시간을 기록하고, 시간에 닿은 뒤 유예가 지나면 과목이 확인하지 않아도 ‘오늘 공부 끝’으로
  const tick = window.setInterval(() => {
    session.flush();
    if (mounted && session.shouldForceDone()) router.go({ name: 'done' });
  }, 1000);

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
        isTimeUp: () => session.isTimeUp(),
        feedback,
        onStar,
        baseUrl: import.meta.env.BASE_URL,
      });
      dispose = c.dispose;
      body.replaceChildren();
      try {
        mod.mount(body, c.ctx);
        mounted = true;
        session.start(appId);
      } catch (e) {
        showError(e);
        return;
      }
      // 오늘 스티커를 받은 과목: 들어올 때 한 번 안내 (명세 6-3)
      if (rewardStatus(store, appId).doneToday) audio.say('shell.app.sticker-done');
      if (!isLandscape() || document.visibilityState === 'hidden') setPaused(true);
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
      window.clearTimeout(leaveTimer);
      offViewport();
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(tick);
      for (const type of PRESS_START_EVENTS) document.removeEventListener(type, onPress, true);
      session.stop();
      session.setPaused(false);
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
