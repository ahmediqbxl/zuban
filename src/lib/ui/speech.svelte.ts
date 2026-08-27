/**
 * Voice: hearing the language, and hearing yourself.
 *
 * A speaking course needs a model to imitate, so there are three layers
 * and they degrade in this order:
 *
 *   1. A recorded clip we ship. Always best, and the only one that is
 *      reliably bn-BD rather than bn-IN.
 *   2. The device's own speech synthesiser. Free and instant, but Bengali
 *      voice coverage is entirely down to the OS — common on Android,
 *      frequently absent on iOS. When it is missing we say so rather than
 *      failing silently, because a learner who hears nothing will assume
 *      the app is broken rather than that their phone lacks a voice.
 *   3. Nothing — in which case speaking exercises still work as recall
 *      practice against the romanization, just without a model.
 *
 * Recording is separate and works everywhere MediaRecorder does. Hearing
 * yourself immediately after the model is the single most useful thing a
 * solo learner can do about pronunciation, and it needs no server, no
 * recognition engine, and no per-language support.
 */

import { browser } from '$app/environment';
import { play as playClip, canPlay } from './audio';

export type VoiceStatus = 'unknown' | 'clip' | 'synth' | 'none';

/** Bengali locales in preference order — Bangladesh first, this is bn-BD. */
const BN_LOCALES = ['bn-BD', 'bn-IN', 'bn'];

/** Persisted sound preference; 'on' is the only value that unmutes. */
const SOUND_KEY = 'zuban:sound';

class Speech {
  status = $state<VoiceStatus>('unknown');
  voiceName = $state<string | null>(null);
  speaking = $state(false);
  // Sound is opt-in: the app speaking up unprompted in a quiet room is the
  // kind of surprise that gets it closed. Muting silences the model voice
  // and stops listen-only exercises being planned; playing back the
  // learner's own recording stays available — that only ever follows an
  // explicit tap on Record.
  muted = $state(true);

  // --- recording ---------------------------------------------------------
  recording = $state(false);
  hasRecording = $state(false);
  recordError = $state<string | null>(null);

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private lastUrl: string | null = null;
  private voice: SpeechSynthesisVoice | null = null;

  async init() {
    if (!browser) return;
    try {
      this.muted = localStorage.getItem(SOUND_KEY) !== 'on';
    } catch {
      // Storage unavailable: stay muted, the safe default.
    }
    if (!('speechSynthesis' in window)) {
      this.status = 'none';
      return;
    }
    // Voices load asynchronously in most browsers and synchronously in a
    // few; handle both rather than assuming.
    await new Promise<void>((resolve) => {
      if (speechSynthesis.getVoices().length > 0) return resolve();
      const done = () => resolve();
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });

    const voices = speechSynthesis.getVoices();
    for (const locale of BN_LOCALES) {
      const hit = voices.find((v) => v.lang.toLowerCase().startsWith(locale.toLowerCase()));
      if (hit) {
        this.voice = hit;
        this.voiceName = `${hit.name} (${hit.lang})`;
        this.status = 'synth';
        return;
      }
    }
    this.status = 'none';
  }

  /**
   * Say a phrase.
   *
   * `text` must be the Bangla script even when the learner never sees it —
   * a synthesiser fed romanization will read it as English and produce
   * something actively misleading.
   */
  async say(text: string, clip?: string, base = ''): Promise<void> {
    if (this.muted) return;
    if (canPlay(clip)) {
      this.speaking = true;
      try {
        await playClip(clip, base);
      } finally {
        this.speaking = false;
      }
      return;
    }
    if (!browser || !('speechSynthesis' in window) || !this.voice) return;

    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = this.voice;
    utter.lang = this.voice.lang;
    // Slightly under natural pace: learners are imitating, not listening.
    utter.rate = 0.85;
    this.speaking = true;
    await new Promise<void>((resolve) => {
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      speechSynthesis.speak(utter);
    });
    this.speaking = false;
  }

  // --- record and compare ------------------------------------------------

  async startRecording(): Promise<void> {
    this.recordError = null;
    if (!browser || typeof MediaRecorder === 'undefined') {
      this.recordError = 'Recording is not supported in this browser.';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.recorder = new MediaRecorder(stream);
      this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
      this.recorder.onstop = () => {
        // Release the mic promptly — a live indicator that never goes away
        // is alarming, and on mobile it drains battery.
        stream.getTracks().forEach((t) => t.stop());
        if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
        this.lastUrl = URL.createObjectURL(new Blob(this.chunks, { type: 'audio/webm' }));
        this.hasRecording = true;
      };
      this.recorder.start();
      this.recording = true;
    } catch {
      this.recordError = 'Microphone access was denied.';
      this.recording = false;
    }
  }

  stopRecording(): void {
    if (this.recorder && this.recording) {
      this.recorder.stop();
      this.recording = false;
    }
  }

  /** Play back what the learner just said. */
  async playRecording(): Promise<void> {
    if (!this.lastUrl) return;
    const el = new Audio(this.lastUrl);
    await el.play().catch(() => {});
    await new Promise<void>((resolve) => {
      el.addEventListener('ended', () => resolve(), { once: true });
      el.addEventListener('error', () => resolve(), { once: true });
    });
  }

  /** Drop the recording when moving to the next card. */
  clearRecording(): void {
    if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
    this.lastUrl = null;
    this.hasRecording = false;
    this.chunks = [];
  }

  toggleMute(): void {
    this.muted = !this.muted;
    try {
      localStorage.setItem(SOUND_KEY, this.muted ? 'off' : 'on');
    } catch {
      // Preference just won't survive a reload.
    }
  }

  get canRecord(): boolean {
    return browser && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices);
  }
}

export const speech = new Speech();
