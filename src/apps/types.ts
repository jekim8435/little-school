/**
 * 과목 모듈 규약 (명세 4장). 이후 모든 과목은 이 규약만 지키면 허브에 붙는다.
 */
import type { SfxName, VoiceTable } from '../core/audio';
import type { InputHandlers } from '../ui/input';

/** 허브에 등록하는 과목 한 줄 (src/apps/registry.ts) */
export interface AppEntry {
  /** 영문 소문자·숫자·하이픈. 저장 데이터 키로도 쓰므로 한 번 정하면 바꾸지 않는다 */
  id: string;
  name: string;
  /** 아이콘 그림 주소 (import한 svg) */
  icon: string;
  /** 과목 고유 색 */
  color: string;
  /** 과목 대사 목록. 허브에서 과목을 열기 전에도 과목 이름을 읽어야 해서 여기서 함께 등록한다 */
  voices?: VoiceTable;
  /** 과목을 열 때만 코드를 내려받는다(동적 import) */
  load: () => Promise<{ default: AppModule }>;
}

export interface AppModule {
  id: string;
  /** 모듈 데이터 구조 버전 (마이그레이션 판단용) */
  version: number;
  /** 과목 화면을 그린다. el은 상단 바 아래 전체 영역 */
  mount(el: HTMLElement, ctx: AppContext): void;
  /** 허브로 나갈 때 반드시 호출. 이벤트·타이머·오디오 정리 */
  unmount(): void;
  /** 오늘 끝 화면, 백그라운드 전환, 세로 방향 안내 화면이 뜰 때 */
  pause?(): void;
  resume?(): void;
  /** 부모 모드 > 과목별 설정 페이지에 자동으로 그려진다 (명세 8-5) */
  settingsSchema?: SettingField[];
  /** 모듈 데이터 버전이 오를 때 */
  migrate?(oldVersion: number, data: unknown): unknown;
}

interface FieldBase {
  key: string;
  label: string;
  /** 항목 아래 설명 한 줄 */
  help?: string;
  /** 화면 묶음 제목 */
  group?: string;
}
export type SettingValue = string | number | boolean | string[];
export type SettingField =
  | (FieldBase & { type: 'select'; options: { value: string | number; label: string }[]; default: string | number })
  | (FieldBase & { type: 'toggle'; default: boolean })
  | (FieldBase & {
      type: 'multi';
      options: { value: string; label: string }[];
      /** 판 모양으로 표시할 열 수 */
      columns?: number;
      default: string[];
      /** 편의 버튼 (예: ‘다음 2자 추가’) */
      actions?: { label: string; run(current: string[]): string[] }[];
    });

export interface StarResult {
  /** 별을 받았는지 (오늘 이 과목 스티커를 이미 받았으면 false) */
  accepted: boolean;
  stars: number;
  ratio: number;
  stickerGranted: boolean;
  doneToday: boolean;
}

export interface RewardStatus {
  stars: number;
  ratio: number;
  doneToday: boolean;
}

export interface LogRecord {
  item: string;
  correct: boolean;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

/** 껍데기가 과목에 제공하는 기능 (명세 4-3) */
export interface AppContext {
  reward: {
    star(n?: number, reason?: string): StarResult;
    status(): RewardStatus;
  };
  log: {
    /** 문제 하나 풀 때마다 기록. 부모 모드 ‘자주 틀린 문제’에 쓴다 */
    record(r: LogRecord): void;
  };
  /** 과목 전용 저장 공간 (apps.<id>.data) */
  store: {
    get<T = unknown>(key: string): T | undefined;
    set(key: string, value: unknown): void;
  };
  /** 부모 모드 과목별 설정 값 (읽기 전용). 저장값이 없으면 settingsSchema의 default */
  readonly settings: Readonly<Record<string, SettingValue>>;
  audio: {
    sfx(name: SfxName): void;
    say(id: string): void;
    /** 개발 중 임시용. 마무리 전에 say(id)로 바꾼다 */
    speak(text: string): void;
    play(url: string): void;
    stop(): void;
    readonly voiceOn: boolean;
    readonly sfxOn: boolean;
  };
  input: {
    /** Touch/Pointer 차이를 감춘 입력 등록. 돌려받은 함수로 해제 */
    attach(el: HTMLElement, handlers: InputHandlers): () => void;
  };
  ui: {
    /** 공통 정답·오답 연출 (오답은 흔들림만, 벌점 없음) */
    feedback(kind: 'correct' | 'oops'): void;
  };
  /** 과목 스스로 허브로 돌아가기 */
  exit(): void;
  /** 하루 학습 시간 도달 여부. 과목은 한 판이 끝날 때 확인 */
  isTimeUp(): boolean;
  /** import.meta.env.BASE_URL (과목 리소스 경로 계산용) */
  readonly baseUrl: string;
}
