/**
 * 부모 모드 > 기기 정보 (명세 2-5). 아이패드는 PC 원격 디버깅이 어려워 문제를 확인하는 주된 수단.
 */
import type { SfxName } from '../../core/audio';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { PRESS_START_EVENTS } from '../../ui/input';
import { parentPage, section } from './common';
import { platform } from '../../platform';
import { pwa } from '../../platform/pwa';

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
    const savedBytes = store.savedBytes();
    const a = store.data.settings.audio;
    const rows: [string, string][] = [
      ['화면 크기', `${window.innerWidth} × ${window.innerHeight}`],
      ['기기 배율', `${window.devicePixelRatio} (크기 단위 --u ${u})`],
      ['실행 방식', platform.displayMode()],
      ['입력 방식', 'PointerEvent' in window ? 'Pointer Events' : 'Touch Events'],
      ['마지막 입력', input.last],
      ['펜 압력', input.pressure === null ? '펜 입력 없음' : input.pressure.toFixed(2)],
      ['펜 사용 기기', store.data.device.penSeen ? '예' : '아니요'],
      ['사용 중인 음성', audio.voiceName],
      ['하루 학습 시간', store.data.settings.dailyMinutes === null ? '제한 없음' : `${store.data.settings.dailyMinutes}분`],
      ['소리 설정', `효과음 ${a.sfxOn ? '켜짐' : '꺼짐'} · 음성 ${a.voiceOn ? '켜짐' : '꺼짐'} · 속도 ${a.voiceRate === 'slow' ? '천천히' : '보통'}`],
      ['저장 공간', `${(savedBytes / 1024).toFixed(1)} KB${store.saveFailed ? ' · 마지막 저장 실패' : ''}`],
      ['앱 버전', `${__APP_VERSION__} (빌드 ${__BUILD_TIME__})${pwa.needRefresh ? ' · 새 버전 있음' : ''}`],
      ['오프라인', !pwa.enabled ? '쓰지 않음 (개발 서버)' : pwa.offlineReady ? '준비됨 (비행기 모드에서도 열려요)' : '준비 중… 앱을 한 번 닫았다 열어 주세요'],
    ];
    info.replaceChildren(...rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
  };

  // 누를 때마다 마지막 입력·펜 압력이 바뀌므로 다시 그린다 (기록은 core/device.ts가 먼저 한다)
  const later = () => window.setTimeout(render, 0);
  for (const type of PRESS_START_EVENTS) document.addEventListener(type, later, true);
  window.addEventListener('resize', render);
  render();

  const el = parentPage(shell, '기기 정보', [
    section(null, info),
    section(
      '점검 도구 (실기기 점검용, 명세 13장)',
      h('p', { class: 'p-help' }, '하루 학습 시간을 1분으로 줄여 ‘오늘 공부 끝’ 흐름을 빨리 확인해요. 점검이 끝나면 공통 설정에서 원래 시간으로 돌려 주세요.'),
      h(
        'div',
        { class: 'row wrap' },
        button('하루 학습 시간 1분으로', () => {
          store.data.settings.dailyMinutes = 1;
          store.changed();
          toast('하루 학습 시간을 1분으로 바꿨어요');
          render();
        }),
        button('20분으로 되돌리기', () => {
          store.data.settings.dailyMinutes = 20;
          store.changed();
          toast('20분으로 되돌렸어요');
          render();
        }),
      ),
    ),
    section(
      '소리 시험',
      h(
        'div',
        { class: 'row wrap' },
        ...SFX_TEST.map(([name, label]) => button(label, () => audio.sfx(name))),
        button('음성 읽기', () => audio.say('shell.start.hello'), { kind: 'soft' }),
      ),
    ),
  ]);

  return {
    el,
    destroy() {
      for (const type of PRESS_START_EVENTS) document.removeEventListener(type, later, true);
      window.removeEventListener('resize', render);
    },
  };
}
