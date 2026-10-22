/**
 * 구슬 세기 화면 문구 (06 문서 4장 4). 아이에게 들려주는 문장은 voices.json.
 */
import type { ActivityId } from './logic/config';

export const COUNTING_STRINGS = {
  activities: {
    count: '세어 보기',
    frame: '10칸 판',
    match: '숫자 짝짓기',
    board: '숫자판',
  } as Record<ActivityId, string>,
  title: '무엇을 할까요?',
  back: '뒤로',
  leaveConfirm: '한 번 더 누르면 나가요',
  retry: '한 번 더!',
  done: '다 했어요',
  roundDone: '모두 끝!',
  roundDoneSub: '정말 잘했어요',
  sheetDone: '한 장 끝!',
  sheetOf: (n: number, total: number) => `${n}장 / ${total}장`,
};

/** 부모 모드 > 과목 설정 문구 */
export const COUNTING_SETTINGS_STRINGS = {
  maxNumber: '최대 수',
  maxNumberHelp: '이 수를 넘는 단계로는 오르지 않아요. 숫자판은 늘 20까지 보여요',
  numberOption: (n: number) => `${n}까지`,
  autoLevel: '자동 단계 조절',
  autoLevelHelp: '켜면 1~5 → 1~10 → 11~20으로 아이에 맞춰 오르내려요. 끄면 최대 수 범위에서 내요',
  choices: '숫자 카드 보기 개수',
  choicesHelp: '세어 보기와 ‘10이 되려면 몇 개 더?’의 보기 수예요 (4개면 2 × 2)',
  choiceOption: (n: number) => `${n}개`,
  numberGroup: '수 범위',
  quizGroup: '문제',
  activitiesGroup: '활동',
};
