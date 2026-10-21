/**
 * 소리 한 곳 (명세 4-3 ctx.audio, 8-6, 15장).
 * - 효과음: Web Audio로 즉석 합성 (음원 파일 없음)
 * - 대사: voices.json의 대사 ID → 제작 음원(mp3)이 있으면 그것을, 없으면 기기 내장 음성(TTS)으로 읽는다
 * - 공통 설정(효과음·음성 켜기/끄기, 크기, 음성 속도)은 여기서만 적용한다. 과목·화면은 신경 쓰지 않는다
 */

import type { Settings, Volume } from './storage';

export type SfxName = 'star' | 'correct' | 'oops' | 'cheer' | 'tap';
/** 공통 소리 설정 (명세 8-6, 저장 위치 settings.audio) */
export type AudioSettings = Settings['audio'];

/** voices.json 한 줄 (명세 15-2) */
export interface VoiceLine {
  text: string;
  tone?: string;
  where?: string;
  /** 파일 이름이 `<ID>.mp3`와 다를 때만 */
  file?: string;
  /** 음원을 만들 때의 문장. text와 같아야 음원을 쓴다 */
  producedText?: string;
  /** true면 음원을 만들지 않고 내장 음성으로 둔다 */
  tts?: boolean;
  /** 기본 'ko-KR'. 영어 대사는 'en-US' */
  lang?: string;
}
export type VoiceTable = Record<string, VoiceLine>;

// ── 소리 크기·속도 ─────────────────────────────────────────

/** Web Audio(효과음·음원)에 곱하는 배율 */
export const GAIN: Record<Volume, number> = { small: 0.5, normal: 1, large: 1.5 };
/** 내장 음성의 volume (0~1) */
export const TTS_VOLUME: Record<Volume, number> = { small: 0.5, normal: 0.8, large: 1 };
/** 내장 음성 빠르기. 아이에게 말하듯 천천히가 기본. 제작 음원은 빠르기를 바꾸지 않는다(높낮이가 같이 변해서) */
export const TTS_RATE = { slow: 0.85, normal: 1 } as const;
/** 아이에게 말하듯 조금 높은 목소리 (0~2, 1이 보통. 너무 높이면 기계음처럼 들림) */
const TTS_PITCH = 1.3;

// ── 효과음 합성 ────────────────────────────────────────────

export interface Tone {
  freq: number;
  /** 끝 주파수 (있으면 미끄러지듯 바뀐다) */
  to?: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

/** 공통 효과음 5종 (명세 4-3) */
export const SFX: Record<SfxName, Tone[]> = {
  /** 톡: 버튼·동그라미 누를 때 */
  tap: [{ freq: 880, to: 660, start: 0, dur: 0.08, type: 'sine', gain: 0.18 }],
  /** 띵: 정답 */
  correct: [
    { freq: 1046.5, start: 0, dur: 0.35, gain: 0.22 },
    { freq: 2093, start: 0, dur: 0.2, gain: 0.06 },
  ],
  /** 뿅: 오답 (벌점 느낌 없이 가볍게) */
  oops: [{ freq: 520, to: 180, start: 0, dur: 0.28, type: 'triangle', gain: 0.22 }],
  /** 반짝: 별 받기 */
  star: [1318.5, 1568, 2093, 2637].map((f, i) => ({ freq: f, start: i * 0.07, dur: 0.22, type: 'sine' as const, gain: 0.14 })),
  /** 팡파레: 스티커·판 완성 */
  cheer: [
    ...[523.25, 659.25, 783.99, 1046.5].map((f, i) => ({ freq: f, start: i * 0.12, dur: 0.18, type: 'triangle' as const, gain: 0.2 })),
    { freq: 1046.5, start: 0.48, dur: 0.6, type: 'triangle', gain: 0.22 },
    { freq: 1318.5, start: 0.48, dur: 0.6, gain: 0.1 },
  ],
};

// ── 대사 고르기 (순수 함수, 테스트 대상) ──────────────────────

/**
 * 대사의 제작 음원 주소. 음원이 없거나 문장이 바뀌어 다시 만들어야 하면 null → 내장 음성으로 읽는다.
 * dir: 음원 폴더 주소 (껍데기 `<base>voice/`, 과목 `<base>apps/<id>/voice/`)
 */
export function clipUrl(id: string, line: VoiceLine, dir: string): string | null {
  if (line.tts || !line.producedText || line.producedText !== line.text) return null;
  return dir + (line.file ?? `${id}.mp3`);
}

/** 밝고 부드러운 목소리를 먼저 (iPad 내장 Yuna, 갤럭시 Google·삼성 한국어 등) */
const PREFERRED_VOICES = ['yuna', 'sora', 'heami', 'google', 'samsung', 'samantha', 'karen'];

/** 해당 언어의 내장 음성 하나를 고른다. 없으면 undefined(브라우저 기본값) */
export function pickVoice<V extends { lang: string; name: string }>(voices: V[], lang: string): V | undefined {
  const want = lang.toLowerCase().slice(0, 2);
  const forLang = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().slice(0, 2) === want);
  for (const name of PREFERRED_VOICES) {
    for (const v of forLang) if (v.name.toLowerCase().indexOf(name) !== -1) return v;
  }
  return forLang[0];
}

/** 내장 음성으로 읽을 때 소리 나지 않게 다듬는다 ("우와~"의 물결표가 "물결"로 읽히지 않게) */
export function ttsText(text: string): string {
  return text.replace(/~/g, '');
}

// ── 소리 서비스 ───────────────────────────────────────────

type AudioCtor = typeof AudioContext;

export class AudioService {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private lines: Record<string, { line: VoiceLine; dir: string }> = {};
  private buffers: Record<string, Promise<AudioBuffer>> = {};
  private playing: AudioBufferSourceNode | null = null;
  /** 파일을 받는 사이에 다른 말을 시작하면 늦게 도착한 앞의 말은 버린다 */
  private seq = 0;
  private voice: SpeechSynthesisVoice | null | undefined;

  constructor(private readonly settings: () => AudioSettings) {
    // 갤럭시 탭 Chrome은 목소리 목록이 늦게 채워진다 (명세 2-5)
    const synth = speech();
    if (synth && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', () => (this.voice = undefined));
    }
  }

  get sfxOn(): boolean {
    return this.settings().sfxOn;
  }
  get voiceOn(): boolean {
    return this.settings().voiceOn;
  }

  /** 지금 쓰는 내장 음성 이름 (기기 정보 화면용) */
  get voiceName(): string {
    const v = this.ttsVoice('ko-KR');
    return v ? `${v.name} (${v.lang})` : speech() ? '기본 음성' : '내장 음성 없음';
  }

  /** 효과음·음원에 쓰는 AudioContext. 만들 수 없으면 null */
  context(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor: AudioCtor | undefined =
          window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * 오디오 깨우기. iOS는 사용자 터치(touchend·click) 안에서 불러야 이후 소리가 난다. 터치할 때마다 불러도 된다.
   * 시작 화면의 ‘시작!’ 버튼이 반드시 부른다 (명세 5-1)
   */
  unlock = (): void => {
    const c = this.context();
    if (c && c.state === 'suspended') void c.resume().catch(() => {});
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      // iOS 12: 터치 안에서 아주 짧은 무음을 한 번 재생해야 이후 소리가 난다
      if (c) {
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, 22050);
        src.connect(c.destination);
        src.start(0);
      }
      // 내장 음성도 터치 안에서 한 번 말해 두어야 나중에 터치 없이 읽을 수 있다
      const synth = speech();
      if (synth) synth.speak(new SpeechSynthesisUtterance(''));
    } catch {
      this.unlocked = false;
    }
  };

  /** 공통 효과음. 효과음이 꺼져 있으면 아무 소리도 내지 않는다 */
  sfx(name: SfxName): void {
    const s = this.settings();
    if (!s.sfxOn) return;
    const c = this.context();
    if (!c) return;
    const vol = GAIN[s.sfxVolume];
    const t0 = c.currentTime + 0.01;
    for (const t of SFX[name]) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = t.type || 'sine';
      osc.frequency.setValueAtTime(t.freq, t0 + t.start);
      if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, t0 + t.start + t.dur);
      const peak = (t.gain || 0.25) * vol;
      g.gain.setValueAtTime(0.0001, t0 + t.start);
      g.gain.exponentialRampToValueAtTime(peak, t0 + t.start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.start + t.dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t0 + t.start);
      osc.stop(t0 + t.start + t.dur + 0.05);
    }
  }

  /** 대사 목록을 등록한다. dir: 음원 폴더 주소 */
  register(table: VoiceTable, dir: string): void {
    for (const id of Object.keys(table)) this.lines[id] = { line: table[id], dir };
  }

  hasLine(id: string): boolean {
    return id in this.lines;
  }

  /** 대사 ID의 문장 (음성이 꺼져 있을 때 글자로 보여 줄 때 등) */
  textOf(id: string): string {
    const entry = this.lines[id];
    return entry ? entry.line.text : '';
  }

  /**
   * 대사 재생의 기본 방법. 음원이 있으면 mp3를, 없으면 그 문장을 내장 음성으로 읽는다.
   * 음성 읽기가 꺼져 있으면 읽지 않는다. 등록하지 않은 ID는 개발 중 실수이므로 콘솔에 알린다
   */
  say(id: string): void {
    const entry = this.lines[id];
    if (!entry) {
      console.warn(`[audio] voices.json에 없는 대사 ID: ${id}`);
      return;
    }
    if (!this.voiceOn) return;
    const url = clipUrl(id, entry.line, entry.dir);
    if (url) this.playUrl(url, entry.line.text, entry.line.lang);
    else this.speakNow(entry.line.text, entry.line.lang);
  }

  /** 등록하지 않은 문장을 내장 음성으로 바로 읽기. 개발 중 임시용 — 마무리 전에 say(id)로 바꾼다 */
  speak(text: string, lang = 'ko-KR'): void {
    if (!this.voiceOn) return;
    this.speakNow(text, lang);
  }

  /** 대사 목록 밖의 mp3 재생 (동화책 부모 녹음 등). 음성 설정을 따른다 */
  play(url: string): void {
    if (!this.voiceOn) return;
    this.playUrl(url, null);
  }

  /** 읽고 있던 말을 멈춘다 */
  stop(): void {
    this.seq++;
    if (this.playing) {
      try {
        this.playing.stop();
      } catch {
        /* 이미 끝난 소리 */
      }
      this.playing = null;
    }
    try {
      const synth = speech();
      if (synth) synth.cancel();
    } catch {
      /* 내장 음성이 없는 환경 */
    }
  }

  private speakNow(text: string, lang = 'ko-KR'): void {
    this.stop();
    const synth = speech();
    if (!synth) return;
    const s = this.settings();
    try {
      const u = new SpeechSynthesisUtterance(ttsText(text));
      u.lang = lang;
      u.rate = TTS_RATE[s.voiceRate];
      u.pitch = TTS_PITCH;
      u.volume = TTS_VOLUME[s.voiceVolume];
      const v = this.ttsVoice(lang);
      if (v) u.voice = v;
      synth.speak(u);
    } catch {
      /* 일부 iOS 홈 화면 앱에서 내장 음성이 동작하지 않음 → 소리 없이 계속 */
    }
  }

  /** 음원을 Web Audio로 튼다. 못 틀면 fallbackText를 내장 음성으로 */
  private playUrl(url: string, fallbackText: string | null, lang?: string): void {
    this.stop();
    const seq = this.seq;
    const c = this.context();
    const fallback = () => {
      if (fallbackText !== null && seq === this.seq) this.speakNow(fallbackText, lang);
    };
    if (!c) return fallback();
    this.load(c, url).then((buffer) => {
      if (seq !== this.seq) return;
      const src = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = GAIN[this.settings().voiceVolume];
      src.buffer = buffer;
      src.connect(g);
      g.connect(c.destination);
      src.start(0);
      this.playing = src;
    }, fallback);
  }

  private load(c: AudioContext, url: string): Promise<AudioBuffer> {
    let p = this.buffers[url];
    if (!p) {
      p = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.arrayBuffer();
        })
        // Safari 12는 decodeAudioData의 Promise 형태를 몰라 콜백 형태로 부른다
        .then((data) => new Promise<AudioBuffer>((resolve, reject) => c.decodeAudioData(data, resolve, reject)));
      p.catch(() => delete this.buffers[url]);
      this.buffers[url] = p;
    }
    return p;
  }

  private ttsVoice(lang: string): SpeechSynthesisVoice | null {
    if (lang.slice(0, 2) !== 'ko') {
      const synth = speech();
      return (synth && pickVoice(synth.getVoices(), lang)) || null;
    }
    if (this.voice === undefined) {
      const synth = speech();
      const list = synth ? synth.getVoices() : [];
      // 목록이 아직 비어 있으면 다음에 다시 찾는다
      this.voice = list.length ? pickVoice(list, lang) || null : undefined;
    }
    return this.voice || null;
  }
}

function speech(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}
