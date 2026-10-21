/** Web Audio로 합성하는 효과음 (음원 파일 없음) */

let ctx: AudioContext | null = null;

/** 효과음과 녹음 음성(speaker.ts)이 함께 쓰는 AudioContext */
export function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

let unlocked = false;

/** iOS는 사용자 터치 안에서 resume해야 소리가 난다. 터치할 때마다 불러도 된다 */
export function unlockAudio(): void {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  if (!unlocked) {
    // iOS 12: 터치 안에서 아주 짧은 무음을 한 번 재생해야 이후 소리가 난다
    unlocked = true;
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch {
      unlocked = false;
    }
  }
}

interface Tone {
  freq: number;
  /** 끝 주파수 (있으면 미끄러지듯 바뀐다) */
  to?: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

function play(tones: Tone[]): void {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + 0.01;
  for (const t of tones) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, t0 + t.start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, t0 + t.start + t.dur);
    const peak = t.gain ?? 0.25;
    g.gain.setValueAtTime(0.0001, t0 + t.start);
    g.gain.exponentialRampToValueAtTime(peak, t0 + t.start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.start + t.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0 + t.start);
    osc.stop(t0 + t.start + t.dur + 0.05);
  }
}

export const sfx = {
  enabled: true,

  /** 성공 "띵" */
  success(): void {
    if (!sfx.enabled) return;
    play([
      { freq: 1046.5, start: 0, dur: 0.35, gain: 0.22 },
      { freq: 2093, start: 0, dur: 0.2, gain: 0.06 },
    ]);
  },

  /** 실패 "뿅" */
  fail(): void {
    if (!sfx.enabled) return;
    play([{ freq: 520, to: 180, start: 0, dur: 0.28, type: 'triangle', gain: 0.25 }]);
  },

  /** 완성 팡파레 */
  fanfare(): void {
    if (!sfx.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    play([
      ...notes.map((f, i) => ({ freq: f, start: i * 0.12, dur: 0.18, type: 'triangle' as const, gain: 0.2 })),
      { freq: 1046.5, start: 0.48, dur: 0.6, type: 'triangle', gain: 0.22 },
      { freq: 1318.5, start: 0.48, dur: 0.6, gain: 0.1 },
    ]);
  },
};
