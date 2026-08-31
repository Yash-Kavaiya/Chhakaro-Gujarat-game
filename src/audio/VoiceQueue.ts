/**
 * Non-overlapping Gujarati voice queue for Kanji Kaka.
 *
 * Every spoken Kaka line — chat replies, proactive narration, nav cues — goes through the
 * one `voiceQueue` singleton so utterances play strictly one after another instead of the
 * old "last call wins, `speechSynthesis.cancel()` every time" behaviour.
 *
 * The queue itself is transport-agnostic and pure enough to unit-test with a fake transport
 * (see `VoiceQueue.test.ts`). The production transport (bottom of this file) tries the
 * Gemini TTS endpoint first and falls back to the browser Web Speech API.
 */

import { soundManager } from './SoundManager';

export interface VoiceTransport {
  /** Resolves when the utterance has finished (or immediately if it cannot be spoken). */
  speak(text: string): Promise<void>;
}

export type VoicePriority = 'low' | 'normal' | 'high';

export interface VoiceQueue {
  /**
   * Queue a line to be spoken.
   * - `high`  wipes everything still pending, then speaks after the current utterance.
   * - `normal` appends to the queue (FIFO).
   * - `low`   is dropped entirely if anything is speaking or already queued.
   * `dedupeKey` suppresses a repeat of the same key while an earlier one is still queued
   *   or speaking (used so re-entering a zone doesn't stack identical narration).
   */
  enqueue(text: string, opts?: { priority?: VoicePriority; dedupeKey?: string }): void;
  /** Drop everything pending. Does not stop the utterance already in progress. */
  clear(): void;
  readonly isSpeaking: boolean;
}

interface QueueItem {
  text: string;
  dedupeKey?: string;
}

export function createVoiceQueue(transport: VoiceTransport, isMuted: () => boolean): VoiceQueue {
  let queue: QueueItem[] = [];
  let speaking = false;
  const activeKeys = new Set<string>();

  function drainPending(): void {
    for (const it of queue) if (it.dedupeKey) activeKeys.delete(it.dedupeKey);
    queue = [];
  }

  function pump(): void {
    if (speaking) return;
    if (isMuted()) {
      drainPending();
      return;
    }
    const item = queue.shift();
    if (!item) return;
    speaking = true;
    Promise.resolve(transport.speak(item.text))
      .catch(() => {})
      .finally(() => {
        if (item.dedupeKey) activeKeys.delete(item.dedupeKey);
        speaking = false;
        pump();
      });
  }

  return {
    enqueue(text, opts = {}) {
      if (isMuted()) return;
      const { priority = 'normal', dedupeKey } = opts;
      if (dedupeKey && activeKeys.has(dedupeKey)) return;
      if (priority === 'low' && (speaking || queue.length > 0)) return;
      if (priority === 'high') drainPending();
      queue.push({ text, dedupeKey });
      if (dedupeKey) activeKeys.add(dedupeKey);
      pump();
    },
    clear() {
      drainPending();
    },
    get isSpeaking() {
      return speaking;
    },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Production singleton                                                                        */
/* ------------------------------------------------------------------------------------------ */

/** Speak via the browser Web Speech API, resolving on `onend`. */
function speakViaWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'gu-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/**
 * Try Gemini TTS (`/api/gemini/tts` → base64 audio), else fall back to Web Speech.
 * Resolves once playback has been handed off; on any failure it degrades to Web Speech.
 */
async function productionSpeak(text: string): Promise<void> {
  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = (await res.json()) as { audio?: string | null; useFallback?: boolean };
      if (data.audio && !data.useFallback) {
        await soundManager.playBase64Audio(data.audio);
        return;
      }
    }
  } catch {
    // network / parse failure — fall through to Web Speech
  }
  await speakViaWebSpeech(text);
}

const productionTransport: VoiceTransport = { speak: productionSpeak };

// App installs the live "કાકા શાંત" check here once it has mounted; until then Kaka is
// only gated by the global sound mute.
let kakaMutedGetter: () => boolean = () => false;
export function setKakaMutedGetter(fn: () => boolean): void {
  kakaMutedGetter = fn;
}

/** The single Kaka voice channel for the whole app. */
export const voiceQueue = createVoiceQueue(
  productionTransport,
  () => soundManager.getMuted() || kakaMutedGetter(),
);
