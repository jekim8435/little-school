import { applyViewportVars, isLandscape, lockPageGestures, onViewportChange } from './ui/compat'; // 옛 Safari용 기능 채우기 (가장 먼저)
import './ui/styles.css';
import { AudioService } from './core/audio';
import { watchInput } from './core/device';
import { browserStorage, requestPersist, Store } from './core/storage';
import { Router, type Route, type Screen } from './router';
import { deviceScreen } from './screens/parent/device';
import { placeholderScreen } from './screens/placeholder';
import { startScreen } from './screens/start';
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
  // 부모 모드 틀(잠금)은 8번에서. 그전까지 기기 정보만 바로 연다
  if (route.name === 'parent' && route.page === 'device') return deviceScreen(shell);
  return placeholderScreen(route, shell);
}

const router = new Router(document.getElementById('app')!, createScreen);
const shell: Shell = { store, audio, input, router };

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
