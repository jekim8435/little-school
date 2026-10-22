/**
 * 화면에 보이는 문구 (09 문서 4장 4).
 * 점진 이전: 3단계부터 새로 만드는 화면·과목은 처음부터 여기를 쓰고, 기존 화면은 고칠 때 함께 옮긴다.
 * 아이에게 들려주는 문장(음원 대사)은 여기가 아니라 voices.json에서 관리한다.
 */

export const STRINGS = {
  about: {
    title: '앱 정보',
    appName: '꼬마학교',
    version: '버전',
    build: '빌드',
    voiceTitle: '음성',
    /** 6장 ①④: AI 합성 음성(Typecast) 사용 고지·출처 표기. README에도 같은 문구 */
    voiceNotice: '이 앱의 음성은 AI 음성 합성 서비스 타입캐스트(Typecast)로 만들었습니다.',
    voiceNote: 'AI 합성 음성(Typecast) 사용',
    fontTitle: '글꼴',
    fontNotice: '기기에 들어 있는 기본 글꼴을 씁니다. 따로 넣은 글꼴은 없습니다.',
    artTitle: '그림',
    artNotice: '아이콘·스티커·그림은 직접 만들었습니다.',
    ossTitle: '오픈소스',
    ossNotice: '앱에 들어 있는 오픈소스 소프트웨어와 라이선스입니다.',
    privacyTitle: '개인정보',
    privacyNotice: '이 앱은 어떤 정보도 수집하거나 보내지 않습니다. 학습 기록은 이 기기 안에만 저장됩니다.',
  },
  exit: {
    menu: '⏻ 앱 종료하기',
    confirmTitle: '꼬마학교를 종료할까요?',
    confirmMessage: '학습 기록은 저장돼요. 다시 열면 시작 화면부터 시작해요.',
    confirmOk: '종료하기',
    closedTitle: '꼬마학교를 종료했어요',
    howTo: '이 화면을 닫으려면',
    /** 기기마다 마저 닫는 방법 (웹앱은 스스로 창을 닫지 못할 때가 많다) */
    howIpad: ['홈 버튼을 눌러 나가세요', '사용법 유도 중이면: 홈 버튼 3번 → 암호 → 종료'],
    howGalaxy: ['아래쪽 홈 버튼을 누르거나, 최근 앱에서 꼬마학교를 위로 밀어 닫으세요', '앱 고정 중이면: 뒤로 + 최근 앱 버튼을 함께 길게 누르기 → PIN'],
    reopen: '다시 열기 (3초 누르기)',
  },
} as const;

/** 앱에 실제로 들어가는 오픈소스 (docs/licenses.md와 같게 유지) */
export const OPEN_SOURCE: { name: string; license: string; use: string }[] = [
  { name: 'Workbox (workbox-window, workbox-sw)', license: 'MIT', use: '오프라인 저장·새 버전 확인' },
  { name: 'vite-plugin-pwa', license: 'MIT', use: '서비스 워커 등록 코드' },
  { name: 'Vite', license: 'MIT', use: '빌드 도구가 넣는 모듈 불러오기 코드' },
];
