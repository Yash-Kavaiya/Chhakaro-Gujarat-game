/**
 * One channel for every reward / event message in the game. App binds `notify(opts)`
 * (it owns the `notice` state + timer); every path that used to pair an ad-hoc
 * `setFloatingBanner(...)` with a loose `soundManager.*` call goes through it instead,
 * so a stamp, a souvenir, a quiz win and a mission payout all feel the same.
 */

export type NotifyTone = 'reward' | 'info' | 'warn';

export interface NotifyMessage {
  id: number;
  text: string;
  tone: NotifyTone;
}

export interface NotifyOptions {
  text: string;
  tone?: NotifyTone; // default 'info'
  speak?: boolean; // default true — speak via soundManager.speakGujaratiTextFallback
  ttlMs?: number; // default 6000
}

/** The sound a tone plays through the notifier, or null for a silent tone. */
export function toneSound(tone: NotifyTone): 'chime' | 'horn' | null {
  return tone === 'reward' ? 'chime' : tone === 'warn' ? 'horn' : null;
}
