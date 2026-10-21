/**
 * 부모 모드 > 기기 정보 (명세 2-5). 아이패드는 PC 원격 디버깅이 어려워 문제를 확인하는 주된 수단.
 * 부모 모드 틀(잠금·메뉴)은 1단계 8번에서 씌운다. 그전까지는 허브 자리의 임시 버튼으로 들어온다.
 */
import type { SfxName } from '../../core/audio';
import { displayMode } from '../../core/device';
import { STORAGE_KEY } from '../../core/storage';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button } from '../../ui/components';
import { h } from '../../ui/dom';
import { PRESS_START_EVENTS } from '../../ui/input';

const SFX_TEST: [SfxName, string][] = [
  ['tap', '톡'],
  ['correct', '정답'],
  ['oops', '오답'],
  ['star', '별'],
  ['cheer', '팡파레'],
];

export function deviceScreen(shell: Shell): Screen {
  const { store, audio, input } = shell;
  const info = h('dl', { class: 'info-list' });

  const render = () => {
    const u = getComputedStyle(document.documentElement).getPropertyValue('--u').trim();
    const savedBytes = (() => {
      try {
        const s = localStorage.getItem(STORAGE_KEY);
        return s ? s.length * 2 : 0; // UTF-16 기준 대략
      } catch {
        return 0;
      }
    })();
    const a = store.data.settings.audio;
    const rows: [string, string][] = [
      ['화면 크기', `${window.innerWidth} × ${window.innerHeight}`],
      ['기기 배율', `${window.devicePixelRatio} (크기 단위 --u ${u})`],
      ['실행 방식', displayMode()],
      ['입력 방식', 'PointerEvent' in window ? 'Pointer Events' : 'Touch Events'],
      ['마지막 입력', input.last],
      ['펜 압력', input.pressure === null ? '펜 입력 없음' : input.pressure.toFixed(2)],
      ['펜 사용 기기', store.data.device.penSeen ? '예' : '아니요'],
      ['사용 중인 음성', audio.voiceName],
      ['소리 설정', `효과음 ${a.sfxOn ? '켜짐' : '꺼짐'} · 음성 ${a.voiceOn ? '켜짐' : '꺼짐'} · 속도 ${a.voiceRate === 'slow' ? '천천히' : '보통'}`],
      ['저장 공간', `${(savedBytes / 1024).toFixed(1)} KB${store.saveFailed ? ' · 마지막 저장 실패' : ''}`],
      ['앱 버전', `${__APP_VERSION__} (빌드 ${__BUILD_TIME__})`],
    ];
    info.replaceChildren(...rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
  };

  // 누를 때마다 마지막 입력·펜 압력이 바뀌므로 다시 그린다 (기록은 core/device.ts가 먼저 한다)
  const later = () => window.setTimeout(render, 0);
  for (const type of PRESS_START_EVENTS) document.addEventListener(type, later, true);
  window.addEventListener('resize', render);
  render();

  const el = h(
    'div',
    { class: 'screen parent scroll' },
    h('div', { class: 'parent-head row' }, button('◀ 돌아가기', () => shell.router.go({ name: 'hub' })), h('h1', { class: 'parent-title' }, '기기 정보')),
    info,
    h('h2', { class: 'parent-sub' }, '소리 시험'),
    h(
      'div',
      { class: 'row wrap' },
      ...SFX_TEST.map(([name, label]) => button(label, () => audio.sfx(name))),
      button('음성 읽기', () => audio.say('shell.start.hello'), { kind: 'soft' }),
    ),
  );

  return {
    el,
    destroy() {
      for (const type of PRESS_START_EVENTS) document.removeEventListener(type, later, true);
      window.removeEventListener('resize', render);
    },
  };
}
