/**
 * 부모 모드 > 공통 설정 (명세 8-6): 모든 과목에 똑같이 적용되는 설정. 바꾸는 즉시 저장.
 */
import type { Volume } from '../../core/storage';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { button, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { formatMinutes, parentPage, section, segmented, settingRow, toggleSwitch } from './common';

const VOLUMES: { value: Volume; label: string }[] = [
  { value: 'small', label: '작게' },
  { value: 'normal', label: '보통' },
  { value: 'large', label: '크게' },
];

export function settingsScreen(shell: Shell): Screen {
  const { store, audio, session } = shell;
  const s = store.data.settings;
  const saved = () => {
    store.changed();
    toast('저장했어요', 1000);
  };

  const sound = section(
    '소리',
    settingRow('효과음', toggleSwitch(s.audio.sfxOn, (v) => {
      s.audio.sfxOn = v;
      saved();
      audio.sfx('tap');
    }), '끄면 모든 화면의 효과음이 나지 않아요(연출 애니메이션은 그대로)'),
    settingRow('효과음 크기', segmented(VOLUMES, s.audio.sfxVolume, (v) => {
      s.audio.sfxVolume = v;
      saved();
      audio.sfx('correct');
    })),
    settingRow('음성 읽기', toggleSwitch(s.audio.voiceOn, (v) => {
      s.audio.voiceOn = v;
      saved();
    }), '끄면 지시문·글자 읽기가 모두 꺼지고, 지시문은 글자로 크게 보여 줘요'),
    settingRow('음성 크기', segmented(VOLUMES, s.audio.voiceVolume, (v) => {
      s.audio.voiceVolume = v;
      saved();
      audio.say('shell.start.hello');
    })),
    settingRow('음성 속도', segmented([{ value: 'slow' as const, label: '천천히' }, { value: 'normal' as const, label: '보통' }], s.audio.voiceRate, (v) => {
      s.audio.voiceRate = v;
      saved();
      audio.say('shell.start.hello');
    }), '기기 내장 음성에만 적용돼요(만들어 넣은 음원은 그대로)'),
  );

  const extraLabel = h('span', { class: 'p-help' });
  const renderExtra = () => {
    const limit = session.limitMs();
    extraLabel.textContent = limit === Infinity ? '' : `오늘 쓸 수 있는 시간 ${formatMinutes(limit)} · 공부한 시간 ${formatMinutes(session.usedMs())}`;
  };
  renderExtra();
  const time = section(
    '학습 시간',
    settingRow(
      '하루 학습 시간',
      segmented<number>(
        // 1분은 점검용(기기 정보 > 점검 도구에서만 정함). 지금 1분이면 보이게
        (s.dailyMinutes === 1 ? [1] : []).concat([10, 15, 20, 30, 0]).map((v) => ({ value: v, label: v === 1 ? '1분(점검)' : v ? `${v}분` : '제한 없음' })),
        s.dailyMinutes === null ? 0 : s.dailyMinutes,
        (v) => {
          s.dailyMinutes = v === 0 ? null : v;
          saved();
          renderExtra();
        },
      ),
      '과목 화면을 보는 동안만 재요. 다 되면 진행 중인 한 판이 끝난 뒤 ‘오늘 공부 끝’',
    ),
    settingRow('유예 시간', segmented<number>([0, 3, 5].map((v) => ({ value: v, label: `${v}분` })), s.graceMinutes, (v) => {
      s.graceMinutes = v;
      saved();
    }), '시간이 다 된 뒤 과목이 끝나지 않아도 이만큼 지나면 ‘오늘 공부 끝’으로 가요'),
    settingRow('오늘 10분 더', h('div', { class: 'row' }, button('10분 더하기', () => {
      session.addToday(10);
      toast('오늘 10분을 더했어요');
      renderExtra();
    }), extraLabel)),
  );

  const reward = section(
    '보상',
    settingRow('스티커판 칸 수', segmented<number>([5, 10, 20].map((v) => ({ value: v, label: `${v}칸` })), s.boardSize, (v) => {
      s.boardSize = v as 5 | 10 | 20;
      saved();
    }), '새로 시작하는 판부터 적용돼요'),
  );

  // 부모 잠금: 곱셈 문제 / 4자리 암호
  const pinBox = h('div', { class: 'p-pin' });
  const renderPin = () => {
    if (s.parentLock.type !== 'pin') {
      pinBox.replaceChildren();
      return;
    }
    const input = h('input', { class: 'p-input', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, placeholder: '숫자 4자리', autocomplete: 'off' }) as HTMLInputElement;
    pinBox.replaceChildren(
      h('div', { class: 'p-help' }, s.parentLock.pin ? '암호가 정해져 있어요. 바꾸려면 새 암호를 넣으세요' : '암호를 정해 주세요. 정하기 전까지는 곱셈 문제로 잠가요'),
      h('div', { class: 'row' }, input, button('암호 저장', () => {
        if (!/^\d{4}$/.test(input.value)) {
          toast('숫자 4자리를 넣어 주세요');
          return;
        }
        s.parentLock.pin = input.value;
        input.value = '';
        saved();
        renderPin();
      }, { kind: 'primary' })),
    );
  };
  const lock = section(
    '부모 잠금',
    settingRow('잠금 방식', segmented([{ value: 'math' as const, label: '곱셈 문제' }, { value: 'pin' as const, label: '4자리 암호' }], s.parentLock.type, (v) => {
      s.parentLock.type = v;
      saved();
      renderPin();
    })),
    pinBox,
  );
  renderPin();

  // 펜으로만 쓰기: 펜 입력이 감지된 기기에서만 (명세 2-5)
  const input = store.data.device.penSeen
    ? section('입력', settingRow('펜으로만 쓰기', toggleSwitch(s.penOnly, (v) => {
        s.penOnly = v;
        saved();
      }), '켜면 쓰기 칸에서 펜 입력만 받아요(손바닥·손가락 무시)'))
    : null;

  const nodes: Node[] = [sound, time, reward, lock];
  if (input) nodes.push(input);
  const el = parentPage(shell, '공통 설정', nodes);
  return { el };
}
