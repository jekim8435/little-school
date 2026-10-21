/**
 * 별·스티커 (명세 6장).
 * 1단계 5번: 과목 규약 검증에 필요한 만큼만 — 별을 쌓고 상태를 알려 준다.
 * 교환 비율 도달 시 스티커 교환·하루 1장·판 넘김은 6번에서 이 파일에 채운다.
 */
import type { RewardStatus, StarResult } from '../apps/types';
import type { Store } from './storage';
import { subjectSetting } from './subjects';

/** 이 과목의 교환 비율 (부모 모드 > 과목 관리, 기본 3) */
export function ratioOf(store: Store, appId: string): number {
  const s = subjectSetting(store.data.settings.subjects, appId);
  return s ? s.starsPerSticker : 3;
}

/** 이 과목의 지금 상태: 쌓인 별, 교환 비율, 오늘 스티커를 받았는지 */
export function rewardStatus(store: Store, appId: string): RewardStatus {
  const day = store.data.days[store.today()];
  const sub = day ? day.subjects[appId] : undefined;
  return {
    stars: store.data.rewards.stars[appId] || 0,
    ratio: ratioOf(store, appId),
    doneToday: !!(sub && sub.sticker),
  };
}

/** 별 지급 (5번 임시: 쌓기만 한다. 교환은 6번) */
export function grantStar(store: Store, appId: string, n = 1): StarResult {
  const before = rewardStatus(store, appId);
  if (before.doneToday || n <= 0) return { accepted: false, ...before, stickerGranted: false };
  const stars = before.stars + Math.floor(n);
  store.data.rewards.stars[appId] = stars;
  store.daySubject(appId).stars += Math.floor(n);
  store.changed();
  return { accepted: true, stars, ratio: before.ratio, stickerGranted: false, doneToday: false };
}
