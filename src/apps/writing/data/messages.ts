import type { FailReason } from '../../../shared/judge/matchStroke';

/*
 * 문구는 선생님 말투가 아니라 또래 형·누나가 옆에서 신나게 말해 주는 반말로 쓴다.
 * "~"는 화면에만 보이고 읽을 때는 빼고 읽는다 (speaker.ts)
 */

/** 칭찬 문구 (무작위로 고른다) */
export const PRAISE = ['우와~ 정말 잘한다~!', '대박! 완전 멋지다!', '오~ 진짜 잘 썼다!', '최고야 최고! 짱이다!', '와아~ 글씨 천재다!'];

/** 재시도 문구 */
export const RETRY = ['괜찮아~ 다시 해 보자!', '아깝다! 한 번만 더!', '천천히 다시 써 볼까?'];

/** 혼자 쓰기에서 틀렸을 때 */
export const FREE_FAIL = '아깝다~! 바른 순서 같이 볼까?';

/** 그룹의 모든 글자를 클리어했을 때 크게 보여 주는 말 */
export const ENDING_MESSAGE = '우와~ 다 했다!';

/** 엔딩에서 읽어 주는 말 (모든 그룹이 같은 말이라 녹음 파일 하나로 쓴다) */
export const ENDING_SPEECH = `${ENDING_MESSAGE} 진짜 대단하다!`;

/** 설정 화면에서 바꾼 것을 바로 들려줄 때 */
export const VOICE_ON = '음성을 켰어요';
export const NUMBER_SINO = '일, 이, 삼';
export const NUMBER_NATIVE = '하나, 둘, 셋';

/** 틀린 이유에 따라 붙이는 보조 문구. strokeNo는 써야 할 획 번호(1부터) */
export function hintFor(reason: FailReason | 'count' | undefined, strokeNo: number): string {
  switch (reason) {
    case 'order':
      return `${strokeNo}번 획부터 써 봐`;
    case 'direction':
      return '화살표 방향으로 그어 봐';
    case 'shape':
    case 'position':
    default:
      return '점선을 따라 그어 봐';
  }
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
