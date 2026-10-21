/**
 * 과목 목록 (명세 4-1). 여기에 한 줄 추가하면 과목이 생긴다.
 * 허브 노출 여부·순서·교환 비율은 부모 모드 설정(settings.subjects)이 정한다.
 */
import type { AppEntry } from './types';
import sampleIcon from './sample/icon.svg';
import sampleVoices from './sample/voices.json';
import writingIcon from './writing/icon.svg';
import writingVoices from './writing/voices.json';

export const apps: AppEntry[] = [
  { id: 'writing', name: '또박또박 글씨', icon: writingIcon, color: '#A8E6A3', voices: writingVoices, load: () => import('./writing/index') },
  // 규약 검증용. 2단계부터 처음에는 꺼 둔다 (부모 모드 > 과목 관리에서 켤 수 있음)
  { id: 'sample', name: '샘플', icon: sampleIcon, color: '#FFD54F', voices: sampleVoices, load: () => import('./sample/index') },
];

export function findApp(id: string): AppEntry | undefined {
  for (const a of apps) if (a.id === id) return a;
  return undefined;
}
