import { applyViewportVars, lockPageGestures, markFeatures, onViewportChange } from './ui/compat'; // 옛 Safari용 기능 채우기 (가장 먼저)
import './ui/styles.css';
import { unlockAudio } from './core/audio';
import { browserStorage, requestPersist, Store } from './core/storage';
import { Router, type Route, type Screen } from './router';
import { blankScreen } from './screens/blank';
import { placeholderScreen } from './screens/placeholder';
import { closeDialogs, orientationOverlay } from './ui/components';
import { setupPwa } from './pwa';

// ── 저장소 ──
const store = new Store(browserStorage());
store.load();
// 앱이 가려지거나 닫힐 때는 기다리지 않고 저장한다 (iOS는 pagehide, 그 밖은 visibilitychange)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});
window.addEventListener('pagehide', () => store.flush());
// 갤럭시 탭(Chrome): 저장소가 지워지지 않게 요청 (명세 11-4). iOS 12는 기능이 없어 넘어간다
void requestPersist();

// ── 화면 ──
function createScreen(route: Route, router: Router): Screen {
  closeDialogs();
  // 1단계 3번: 시작 화면 자리에 확인용 빈 화면. 나머지 화면은 각 단계에서 채운다
  if (route.name === 'start') return blankScreen(store, router);
  return placeholderScreen(route, router);
}

// iOS는 사용자 터치 안에서 AudioContext를 깨워야 소리가 난다 (iOS 12는 touchend·click에서만 인정)
for (const type of ['pointerdown', 'touchend', 'click']) {
  document.addEventListener(type, unlockAudio, { capture: true });
}
lockPageGestures();
markFeatures();
applyViewportVars();

// 세로 방향 안내 (명세 2-4). 과목 pause()·학습 시간 멈춤은 5·7번에서 연결
const rotate = orientationOverlay();
document.body.append(rotate.el);
onViewportChange((landscape) => rotate.set(landscape));
rotate.set(window.innerWidth > window.innerHeight);

const router = new Router(document.getElementById('app')!, createScreen);
// 앱을 다시 열 때마다(새로고침 포함) 시작 화면부터 (명세 5-1)
router.start({ name: 'start' });

setupPwa();
