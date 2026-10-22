/**
 * 과목 목록 (명세 4-1). 여기에 한 줄 추가하면 과목이 생긴다.
 * 허브 노출 여부·순서·교환 비율은 부모 모드 설정(settings.subjects)이 정한다.
 */
import type { AppEntry } from './types';
import sampleIcon from './sample/icon.svg';
import sampleVoices from './sample/voices.json';
import writingIcon from './writing/icon.svg';
import writingVoices from './writing/voices.json';
import hanjaIcon from './hanja/icon.svg';
import hanjaVoices from './hanja/voices.json';

export const apps: AppEntry[] = [
  { id: 'writing', name: '또박또박 글씨', icon: writingIcon, color: '#A8E6A3', voices: writingVoices, load: () => import('./writing/index') },
  // 한자똑똑 시리즈 (가족용 전용): 코드·대사·음원은 hanja 폴더를 함께 쓴다 (03 문서 4-1 folder)
  { id: 'hanja-1', name: '한자똑똑(1)', icon: hanjaIcon, color: '#9FC5F8', voices: hanjaVoices, folder: 'hanja', load: () => import('./hanja/index').then((m) => ({ default: m.hanjaApp('hanja-1') })) },
  // 규약 검증용. 2단계부터 처음에는 꺼 둔다 (부모 모드 > 과목 관리에서 켤 수 있음)
  { id: 'sample', name: '샘플', icon: sampleIcon, color: '#FFD54F', voices: sampleVoices, load: () => import('./sample/index') },
];

export function findApp(id: string): AppEntry | undefined {
  for (const a of apps) if (a.id === id) return a;
  return undefined;
}
