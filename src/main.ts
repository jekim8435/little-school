import { applyViewportVars, isLandscape, lockPageGestures, onViewportChange } from './ui/compat'; // 옛 Safari용 기능 채우기 (가장 먼저)
import './ui/styles.css';
import { apps, findApp } from './apps/registry';
import { AudioService } from './core/audio';
import { watchInput } from './core/device';
import { browserStorage, requestPersist, Store } from './core/storage';
import { syncSubjects, visibleSubjects } from './core/subjects';
import { Router, type Route, type Screen } from './router';
import { appHostScreen } from './screens/app-host';
import { hubScreen } from './screens/hub';
import { deviceScreen } from './screens/parent/device';
import { placeholderScreen } from './screens/placeholder';
import { startScreen } from './screens/start';
import { stickerHistoryScreen, stickersScreen } from './screens/stickers';
import type { Shell } from './shell';
import { closeDialogs, orientationOverlay } from './ui/components';
import { setupPwa } from './pwa';
import voices from './voices.json';

// ── 저장소 ──
const store = new Store(browserStorage());
store.load();
// 1단계 2~3번 확인용 화면이 남긴 값 정리
if (store.data.apps._check) {
  delete store.data.apps._check;
  store.changed();
}
// registry에 새로 생긴 과목을 과목 설정에 붙인다 (명세 4-1)
if (syncSubjects(store.data.settings.subjects, apps.map((a) => a.id))) store.changed();
// 앱이 가려지거나 닫힐 때는 기다리지 않고 저장한다 (iOS는 pagehide, 그 밖은 visibilitychange)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});
window.addEventListener('pagehide', () => store.flush());
// 갤럭시 탭(Chrome): 저장소가 지워지지 않게 요청 (명세 11-4). iOS 12는 기능이 없어 넘어간다
void requestPersist();

// ── 소리 ──
const audio = new AudioService(() => store.data.settings.audio);
audio.register(voices, `${import.meta.env.BASE_URL}voice/`);
for (const a of apps) if (a.voices) audio.register(a.voices, `${import.meta.env.BASE_URL}apps/${a.id}/voice/`);
// iOS는 사용자 터치 안에서 AudioContext를 깨워야 소리가 난다 (iOS 12는 touchend·click에서만 인정)
for (const type of ['pointerdown', 'touchend', 'click']) {
  document.addEventListener(type, audio.unlock, { capture: true });
}

// ── 입력 ──
const input = watchInput(() => {
  if (!store.data.device.penSeen) {
    store.data.device.penSeen = true;
    store.changed();
  }
});
lockPageGestures();
applyViewportVars();

// ── 화면 ──
function createScreen(route: Route): Screen {
  closeDialogs();
  if (route.name === 'start') return startScreen(shell);
  if (route.name === 'hub') return hubScreen(shell);
  if (route.name === 'app') return appHostScreen(shell, route.id);
  if (route.name === 'stickers') return stickersScreen(shell);
  if (route.name === 'sticker-history') return stickerHistoryScreen(shell);
  // 부모 모드 틀(잠금)은 8번에서. 그전까지 기기 정보만 바로 연다
  if (route.name === 'parent' && route.page === 'device') return deviceScreen(shell);
  return placeholderScreen(route, shell);
}

const router = new Router(document.getElementById('app')!, createScreen);
const shell: Shell = { store, audio, input, router };
// 없거나 꺼진 과목 주소는 허브로
router.setGuard((to) => {
  if (to.name === 'app' && (!findApp(to.id) || visibleSubjects(store.data.settings.subjects, [to.id]).length === 0)) return { name: 'hub' };
  return to;
});

// 세로 방향 안내 (명세 2-4). 과목 pause()·학습 시간 멈춤은 5·7번에서 연결
const rotate = orientationOverlay();
document.body.append(rotate.el);
let landscape = isLandscape();
rotate.set(landscape);
onViewportChange((now) => {
  if (now === landscape) return;
  landscape = now;
  rotate.set(now);
  if (!now) audio.say('shell.rotate.turn');
});

// 앱을 다시 열 때마다(새로고침 포함) 시작 화면부터 (명세 5-1)
router.start({ name: 'start' });

setupPwa();
