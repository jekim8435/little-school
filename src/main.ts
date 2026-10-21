import { lockPageGestures } from './ui/compat'; // 옛 Safari용 기능 채우기 (가장 먼저)
import './ui/styles.css';
import { unlockAudio } from './core/audio';
import { Router, type Screen } from './router';
import { blankScreen } from './screens/blank';
import { setupPwa } from './pwa';

// 1단계 2번: 배포·설치 확인용 빈 화면. 3번부터 시작 화면·허브로 바꾼다
type Route = { name: 'blank' };

function createScreen(_route: Route): Screen {
  return blankScreen();
}

// iOS는 사용자 터치 안에서 AudioContext를 깨워야 소리가 난다 (iOS 12는 touchend·click에서만 인정)
for (const type of ['pointerdown', 'touchend', 'click']) {
  document.addEventListener(type, unlockAudio, { capture: true });
}
lockPageGestures();

const router = new Router<Route>(document.getElementById('app')!, createScreen);
router.go({ name: 'blank' });

setupPwa();
