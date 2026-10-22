import { applyViewportVars, isLandscape, lockPageGestures, onViewportChange } from './ui/compat'; // 옛 Safari용 기능 채우기 (가장 먼저)
import './ui/styles.css';
import { apps, findApp } from './apps/registry';
import { AudioService } from './core/audio';
import { watchInput } from './core/device';
import { ParentLock } from './core/parentLock';
import { StudySession } from './core/session';
import { browserStorage, Store } from './core/storage';
import { platform } from './platform';
import { syncSubjects, visibleSubjects } from './core/subjects';
import { migrateWritingFromLegacy } from './core/migrateWriting';
import { Router, type Route, type Screen } from './router';
import { appHostScreen } from './screens/app-host';
import { doneScreen } from './screens/done';
import { hubScreen } from './screens/hub';
import { aboutScreen } from './screens/parent/about';
import { backupScreen } from './screens/parent/backup';
import { deviceScreen } from './screens/parent/device';
import { gateScreen } from './screens/parent/gate';
import { parentHomeScreen } from './screens/parent/home';
import { lockGuideScreen } from './screens/parent/lock-guide';
import { recordsScreen } from './screens/parent/records';
import { rewardHistoryScreen, rewardsScreen } from './screens/parent/rewards';
import { settingsScreen } from './screens/parent/settings';
import { subjectSettingsScreen } from './screens/parent/subject-settings';
import { subjectsScreen } from './screens/parent/subjects';
import { startScreen } from './screens/start';
import { stickerHistoryScreen, stickersScreen } from './screens/stickers';
import type { Shell } from './shell';
import { closeDialogs, orientationOverlay } from './ui/components';
import { installDevInfo } from './ui/devInfo';
import { installPenOnlyFilter } from './ui/penOnly';
import { PRESS_START_EVENTS } from './ui/input';
import { setupPwa } from './platform/pwa';
import voices from './voices.json';

// ── 저장소 ──
const kv = browserStorage();
const store = new Store(kv);
store.load();
// 한글쓰기 앱 설정 1회 이전 (명세 14-4)
migrateWritingFromLegacy(store, kv);
// 1단계 2~3번 확인용 화면이 남긴 값 정리
if (store.data.apps._check) {
  delete store.data.apps._check;
  store.changed();
}
// registry에 새로 생긴 과목을 과목 설정에 붙인다 (명세 4-1)
const hadWriting = store.data.settings.subjects.some((s) => s.id === 'writing');
if (syncSubjects(store.data.settings.subjects, apps.map((a) => a.id))) store.changed();
// 또박또박 글씨가 처음 들어올 때 한 번: 맨 앞에 두고 샘플 과목은 숨긴다 (명세 14-2 10번)
if (!hadWriting) {
  for (const s of store.data.settings.subjects) {
    if (s.id === 'writing') s.order = -1;
    if (s.id === 'sample') s.enabled = false;
  }
  store.data.settings.subjects.sort((a, b) => a.order - b.order).forEach((s, i) => (s.order = i));
  store.changed();
}
// 앱이 가려지거나 닫힐 때는 기다리지 않고 저장한다 (iOS는 pagehide, 그 밖은 visibilitychange)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});
window.addEventListener('pagehide', () => store.flush());
// 갤럭시 탭(Chrome): 저장소가 지워지지 않게 요청 (명세 11-4). iOS 12는 기능이 없어 넘어간다
void platform.requestPersist();

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
  if (route.name === 'done') return doneScreen(shell);
  if (route.name === 'stickers') return stickersScreen(shell);
  if (route.name === 'sticker-history') return stickerHistoryScreen(shell);
  // 부모 모드 (명세 8장)
  switch (route.page) {
    case 'gate':
      return gateScreen(shell);
    case 'home':
      return parentHomeScreen(shell);
    case 'records':
      return recordsScreen(shell);
    case 'subjects':
      return subjectsScreen(shell);
    case 'subject-settings':
      return subjectSettingsScreen(shell, route.id || '');
    case 'settings':
      return settingsScreen(shell);
    case 'rewards':
      return rewardsScreen(shell);
    case 'reward-history':
      return rewardHistoryScreen(shell);
    case 'backup':
      return backupScreen(shell);
    case 'lock-guide':
      return lockGuideScreen(shell);
    case 'device':
      return deviceScreen(shell);
    case 'about':
      return aboutScreen(shell);
  }
}

const router = new Router(document.getElementById('app')!, createScreen);
const shell: Shell = { store, audio, input, router, session: new StudySession(store), parent: new ParentLock() };
router.setGuard((to) => {
  // 부모 모드는 잠금을 푼 뒤에만. 부모 모드를 떠나면 다시 잠근다 (명세 8-1)
  if (to.name === 'parent') {
    if (to.page !== 'gate' && !shell.parent.unlocked) return { name: 'parent', page: 'gate' };
    if (to.page === 'gate' && shell.parent.unlocked) return { name: 'parent', page: 'home' };
    shell.parent.active();
    return to;
  }
  shell.parent.lock();
  // 없거나 꺼진 과목 주소는 허브로
  if (to.name === 'app' && (!findApp(to.id) || visibleSubjects(store.data.settings.subjects, [to.id]).length === 0)) return { name: 'hub' };
  // 오늘 시간이 다 됐으면 과목 대신 ‘오늘 공부 끝’ (명세 5-2, 5-5)
  if (to.name === 'app' && shell.session.isTimeUp()) return { name: 'done' };
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
// 개발 기간: 아이 화면 새 버전 배너 + 하단 버전 표시 (src/config.ts)
installDevInfo();

// ‘펜으로만 사용하기’: 아이 화면의 모든 손가락 입력을 버린다. 부모 모드·부모 잠금 자리는 손가락 허용
installPenOnlyFilter({
  enabled: () => store.data.settings.penOnly,
  isParentArea: (target) => {
    const cur = router.current;
    if (cur && cur.name === 'parent') return true;
    let el = target instanceof Element ? target : null;
    while (el) {
      if (el.classList.contains('hub-corner')) return true;
      el = el.parentElement;
    }
    return false;
  },
});

// 부모 모드에서 5분 동안 조작이 없으면 잠그고 아이 화면으로 (명세 8-1)
const markParentActive = () => {
  if (shell.parent.unlocked) shell.parent.active();
};
for (const type of PRESS_START_EVENTS.concat(['keydown'])) document.addEventListener(type, markParentActive, true);
window.setInterval(() => {
  if (shell.parent.idle()) {
    shell.parent.lock();
    router.go({ name: 'hub' });
  }
}, 10000);
