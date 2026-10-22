/**
 * 한자똑똑 시리즈 화면 문구 (06 문서 4장 4). 아이에게 들려주는 문장은 voices.json.
 */
import type { HanjaStrings } from '../../shared/hanja/config';

export const HANJA_STRINGS: HanjaStrings = {
  activities: {
    cards: '한자 카드',
    listen: '한자 찾기',
    picture: '그림 고르기',
    read: '음뜻 고르기',
    match: '짝 맞추기',
    board: '내 한자판',
  },
  title: '무엇을 할까요?',
  locked: '🔒',
  back: '뒤로',
  leaveConfirm: '한 번 더 누르면 나가요',
  replay: '다시 듣기',
  next: '다음',
  flip: '누르면 뒤집혀요',
  soon: '곧 배워요',
  retry: '한 번 더!',
  boardOf: (n, total) => `${n}판 / ${total}판`,
  roundDone: '다 했어요!',
  roundDoneSub: '한자 열 개를 모두 했어요',
  boardDone: '한 판 끝! 다음 판으로 가요',
};

/** 부모 모드 > 과목 설정 문구 */
export const HANJA_SETTINGS_STRINGS = {
  learned: '배운 한자',
  learnedHelp: '학습지에서 배운 한자를 눌러 고르세요. 고른 한자만 문제와 한자 카드에 나와요. 4자보다 적으면 고르기·짝 맞추기가 잠겨요',
  addNext: '다음 2자 추가',
  clearAll: '모두 해제',
  preview: '다음 한자 미리 보기',
  previewHelp: '한자 카드에서 다음에 배울 두 자를 ‘곧 배워요’로 보여 줘요 (문제에는 안 나와요)',
  choiceCount: '고르기 보기 개수',
  choiceCountHelp: '한자 찾기·그림 고르기·음뜻 고르기의 보기 수예요',
  choiceOption: (n: number) => `${n}개`,
  activitiesGroup: '활동',
  activityHelp: '끈 활동은 아이 화면에서 숨겨요',
  learnGroup: '배운 한자',
  quizGroup: '문제',
};
