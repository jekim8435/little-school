/**
 * 고유어 수 읽기 (2장). 이 과목은 고유어 수만 쓴다: 하나 … 서른 / 한 개 … 서른 개.
 * voices.json 문장과 테스트가 이것을 기준으로 맞는지 확인한다.
 */

const ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
/** 개수 말로 쓸 때 바뀌는 꼴: 하나→한, 둘→두, 셋→세, 넷→네 */
const ONES_COUNTER = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];

/** 십의 자리 말 (열, 스물, 서른) */
const TENS = ['', '열', '스물', '서른'];

/** 수 읽기: 7 → 일곱, 13 → 열셋, 20 → 스물, 24 → 스물넷 (1~30) */
export function numberWord(n: number): string {
  return TENS[Math.floor(n / 10)] + ONES[n % 10];
}

/** 개수 말: 1 → 한, 13 → 열세, 20 → 스무, 21 → 스물한 (뒤가 붙으면 ‘스물’ 그대로) */
export function counterWord(n: number): string {
  if (n === 20) return '스무';
  return TENS[Math.floor(n / 10)] + ONES_COUNTER[n % 10];
}

/** “모두 다섯 개!” */
export function totalSentence(n: number): string {
  return `모두 ${counterWord(n)} 개!`;
}
