import { useCallback, useRef, useState } from 'react';
import { KakaContext } from './kakaContext';
import { TripPlan, buildLocalTrip } from './tripPlanner';
import { voiceQueue } from '../audio/VoiceQueue';

/** Personality mode for a question — shapes the tone of Kaka's reply server-side. */
export type KakaMode = 'ask' | 'story' | 'duha' | 'food' | 'directions';

export interface KakaChatMessage {
  id: string;
  sender: 'user' | 'kaka';
  text: string;
  mood?: string;
  food?: string;
  ts: string;
}

export interface UseKakaCompanion {
  messages: KakaChatMessage[];
  isThinking: boolean;
  /** The last thing Kaka said — chat reply only (proactive lines live in App). */
  lastReply: string;
  askKaka: (prompt: string, mode?: KakaMode) => Promise<void>;
  generateTrip: (request: string) => Promise<TripPlan>;
}

let seq = 0;
const nextId = (): string => `kaka-${Date.now()}-${(seq += 1)}`;
const stamp = (): string =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const FALLBACK_REPLY = 'કાં ભાઈ, મોજમાં રહો અને છકડો ચલાવતા રહો! કંઈ પૂછવું હોય તો કહો.';

/**
 * The Kanji Kaka chat/companion controller. `App` owns it and feeds it a `getContext`
 * accessor so every request carries the live `KakaContext`. History is session-only.
 */
export function useKakaCompanion(getContext: () => KakaContext): UseKakaCompanion {
  const [messages, setMessages] = useState<KakaChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastReply, setLastReply] = useState('');
  const inFlight = useRef(false);

  const append = useCallback((m: KakaChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const askKaka = useCallback(
    async (prompt: string, mode?: KakaMode) => {
      const text = prompt.trim();
      if (!text || inFlight.current) return;
      inFlight.current = true;
      setIsThinking(true);
      append({ id: nextId(), sender: 'user', text, ts: stamp() });

      let reply = FALLBACK_REPLY;
      let mood: string | undefined;
      let food: string | undefined;
      try {
        const res = await fetch('/api/gemini/guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text, mode, context: getContext() }),
        });
        const data = await res.json();
        reply = data.reply || FALLBACK_REPLY;
        mood = data.kakaMood;
        food = data.recommendedFood;
      } catch {
        // keep FALLBACK_REPLY
      }

      append({ id: nextId(), sender: 'kaka', text: reply, mood, food, ts: stamp() });
      setLastReply(reply);
      voiceQueue.enqueue(reply);
      inFlight.current = false;
      setIsThinking(false);
    },
    [append, getContext],
  );

  const generateTrip = useCallback(
    async (request: string): Promise<TripPlan> => {
      const ctx = getContext();
      try {
        const res = await fetch('/api/gemini/trip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request, context: ctx }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.stops) && data.stops.length > 0) {
            return {
              introGujarati: typeof data.introGujarati === 'string' ? data.introGujarati : '',
              stops: data.stops,
            };
          }
        }
      } catch {
        // fall through to the local planner
      }
      return buildLocalTrip(request, ctx.zone.id);
    },
    [getContext],
  );

  return { messages, isThinking, lastReply, askKaka, generateTrip };
}
