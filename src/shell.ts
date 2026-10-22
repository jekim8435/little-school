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
  /** 앱 종료하기 (부모 모드): 저장·정리 후 닫기, 못 닫으면 ‘종료됨’ 화면 */
  exitApp(): void;
}
