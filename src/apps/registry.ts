/**
 * 과목 목록 (명세 4-1). 여기에 한 줄 추가하면 과목이 생긴다.
 * 허브 노출 여부·순서·교환 비율은 부모 모드 설정(settings.subjects)이 정한다.
 */
import type { AppEntry } from './types';
import sampleIcon from './sample/icon.svg';
import sampleVoices from './sample/voices.json';

export const apps: AppEntry[] = [
  { id: 'sample', name: '샘플', icon: sampleIcon, color: '#FFD54F', voices: sampleVoices, load: () => import('./sample/index') },
  // 2단계: { id: 'writing', name: '또박또박 글씨', ..., load: () => import('./writing/index') },
];

export function findApp(id: string): AppEntry | undefined {
  for (const a of apps) if (a.id === id) return a;
  return undefined;
}
