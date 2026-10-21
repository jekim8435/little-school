/** 껍데기 공통 서비스 묶음. main.ts가 만들어 화면에 넘긴다 */
import type { AudioService } from './core/audio';
import type { InputInfo } from './core/device';
import type { ParentLock } from './core/parentLock';
import type { StudySession } from './core/session';
import type { Store } from './core/storage';
import type { Router } from './router';

export interface Shell {
  store: Store;
  audio: AudioService;
  input: InputInfo;
  router: Router;
  session: StudySession;
  /** 부모 모드 잠금 상태 */
  parent: ParentLock;
}
