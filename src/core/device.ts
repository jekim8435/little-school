/**
 * 기기 정보 (명세 2-5 ‘부모 모드 > 기기 정보’): 마지막 입력 종류·펜 압력을 모아 둔다.
 * 펜 입력이 한 번이라도 들어오면 저장해 두고(device.penSeen) ‘펜으로만 사용하기’ 항목을 보여 준다.
 */
import { PRESS_START_EVENTS } from '../ui/input';

export type InputKind = 'touch' | 'pen' | 'mouse' | '-';

export interface InputInfo {
  last: InputKind;
  /** 마지막 펜 입력의 압력 (0~1). 펜을 쓴 적 없으면 null */
  pressure: number | null;
}

/** 누를 때마다 입력 종류를 기록한다. 펜이 처음 들어오면 onPen을 부른다 */
export function watchInput(onPen: () => void): InputInfo {
  const info: InputInfo = { last: '-', pressure: null };
  const onPress = (e: Event) => {
    const p = e as PointerEvent;
    if (p.pointerType) {
      info.last = p.pointerType === 'pen' || p.pointerType === 'mouse' ? p.pointerType : 'touch';
      if (p.pointerType === 'pen') {
        info.pressure = p.pressure;
        onPen();
      }
    } else {
      info.last = e.type === 'touchstart' ? 'touch' : 'mouse';
    }
  };
  for (const type of PRESS_START_EVENTS) document.addEventListener(type, onPress, true);
  return info;
}
