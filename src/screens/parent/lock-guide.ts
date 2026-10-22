/**
 * 부모 모드 > 아이 전용 잠금 안내 (명세 2-3, 2-4, 8-7).
 * 기기에 맞는 안내를 먼저 보여 주고 다른 기기 안내는 접어 둔다.
 * User-Agent는 기능을 나누는 데 쓰지 않고 이런 안내 문구를 고를 때만 쓴다(명세 2-5). 판단은 src/platform이 한다.
 */
import { platform } from '../../platform';
import type { Screen } from '../../router';
import type { Shell } from '../../shell';
import { h } from '../../ui/dom';
import { parentPage, section } from './common';

type Device = 'ipad' | 'galaxy';

const GUIDES: Record<Device, { title: string; lock: string[]; install: string[] }> = {
  ipad: {
    title: '아이패드',
    lock: [
      '설정 > 일반 > 손쉬운 사용 > 사용법 유도를 켜고 암호를 정해요',
      '꼬마학교를 연 상태에서 홈 버튼을 3번 누르고 → 시작',
      '끝낼 때: 홈 버튼 3번 → 암호 → 종료',
      '(선택) 사용법 유도의 ‘시간 제한’과 함께 쓰면 좋아요',
      '아이패드를 가로로 둔 상태에서 제어 센터 > ‘화면 회전 잠금’을 켜요',
    ],
    install: ['Safari로 꼬마학교 주소를 열어요', '공유 버튼 > 홈 화면에 추가', '아이는 꼭 홈 화면 아이콘으로만 열어요(브라우저 탭과 기록이 따로 저장될 수 있어요)'],
  },
  galaxy: {
    title: '갤럭시 탭',
    lock: [
      '설정 > 보안 및 개인정보 보호 > 기타 보안 설정 > 앱 고정을 켜고, ‘고정 해제 전 PIN 요청’도 켜요',
      '꼬마학교를 연 상태에서 최근 앱 버튼 → 꼬마학교 아이콘 → ‘이 앱 고정’',
      '끝낼 때: 뒤로 + 최근 앱 버튼을 함께 길게 누르고 → PIN 입력',
      '메뉴 이름은 One UI 버전에 따라 조금 다를 수 있어요',
    ],
    install: ['Chrome으로 꼬마학교 주소를 열어요', 'Chrome 메뉴(⋮) > 앱 설치(또는 홈 화면에 추가)', '아이는 꼭 홈 화면 아이콘으로만 열어요'],
  },
};

function guide(d: Device): Node[] {
  const g = GUIDES[d];
  return [
    h('h3', { class: 'p-guide-sub' }, '아이 전용으로 잠그기'),
    h('ol', { class: 'p-guide-list' }, ...g.lock.map((t) => h('li', {}, t))),
    h('h3', { class: 'p-guide-sub' }, '홈 화면에 설치하기'),
    h('ol', { class: 'p-guide-list' }, ...g.install.map((t) => h('li', {}, t))),
  ];
}

export function lockGuideScreen(shell: Shell): Screen {
  const mine = platform.guideDevice();
  const other: Device = mine === 'ipad' ? 'galaxy' : 'ipad';
  const el = parentPage(shell, '아이 전용 잠금 안내', [
    section(`${GUIDES[mine].title} (이 기기)`, ...guide(mine)),
    section(null, h('details', { class: 'p-details' }, h('summary', {}, `${GUIDES[other].title} 안내 보기`), ...guide(other))),
  ]);
  return { el };
}
