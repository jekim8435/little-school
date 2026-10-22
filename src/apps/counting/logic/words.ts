/**
 * 고유어 수 읽기 (2장). 이 과목은 고유어 수만 쓴다: 하나 … 스물 / 한 개 … 스무 개.
 * voices.json 문장과 테스트가 이것을 기준으로 맞는지 확인한다.
 */

const ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
/** 개수 말로 쓸 때 바뀌는 꼴: 하나→한, 둘→두, 셋→세, 넷→네 */
const ONES_COUNTER = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];

/** 수 읽기: 7 → 일곱, 13 → 열셋, 20 → 스물 */
export function numberWord(n: number): string {
  if (n === 20) return '스물';
  if (n === 10) return '열';
  return n > 10 ? `열${ONES[n - 10]}` : ONES[n];
}

/** 개수 말: 1 → 한, 13 → 열세, 20 → 스무 */
export function counterWord(n: number): string {
  if (n === 20) return '스무';
  if (n === 10) return '열';
  return n > 10 ? `열${ONES_COUNTER[n - 10]}` : ONES_COUNTER[n];
}

/** “모두 다섯 개!” */
export function totalSentence(n: number): string {
  return `모두 ${counterWord(n)} 개!`;
}
