import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVoiceQueue, VoiceTransport } from './VoiceQueue';

/** A transport whose every utterance takes 10ms of fake time and records what it spoke. */
function fakeTransport() {
  const spoken: string[] = [];
  const transport: VoiceTransport = {
    speak: (text) =>
      new Promise((resolve) => {
        spoken.push(text);
        setTimeout(resolve, 10);
      }),
  };
  return { transport, spoken };
}

describe('createVoiceQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('speaks FIFO, one at a time', async () => {
    const { transport, spoken } = fakeTransport();
    const q = createVoiceQueue(transport, () => false);
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    expect(spoken).toEqual(['a']);
    expect(q.isSpeaking).toBe(true);
    await vi.advanceTimersByTimeAsync(35);
    expect(spoken).toEqual(['a', 'b', 'c']);
    expect(q.isSpeaking).toBe(false);
  });

  it('high priority wipes the pending queue', async () => {
    const { transport, spoken } = fakeTransport();
    const q = createVoiceQueue(transport, () => false);
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c', { priority: 'high' });
    await vi.advanceTimersByTimeAsync(35);
    expect(spoken).toEqual(['a', 'c']); // b dropped
  });

  it('drops low priority while busy', async () => {
    const { transport, spoken } = fakeTransport();
    const q = createVoiceQueue(transport, () => false);
    q.enqueue('a');
    q.enqueue('b', { priority: 'low' });
    await vi.advanceTimersByTimeAsync(35);
    expect(spoken).toEqual(['a']);
  });

  it('dedupeKey suppresses a repeat still in the queue', async () => {
    const { transport, spoken } = fakeTransport();
    const q = createVoiceQueue(transport, () => false);
    q.enqueue('first', { dedupeKey: 'zone:dwarka' });
    q.enqueue('second', { dedupeKey: 'zone:dwarka' });
    await vi.advanceTimersByTimeAsync(35);
    expect(spoken).toEqual(['first']);
  });

  it('re-allows a dedupeKey once its utterance has finished', async () => {
    const { transport, spoken } = fakeTransport();
    const q = createVoiceQueue(transport, () => false);
    q.enqueue('first', { dedupeKey: 'k' });
    await vi.advanceTimersByTimeAsync(35);
    q.enqueue('again', { dedupeKey: 'k' });
    await vi.advanceTimersByTimeAsync(35);
    expect(spoken).toEqual(['first', 'again']);
  });

  it('muted: nothing is spoken and the queue is drained', async () => {
    const { transport, spoken } = fakeTransport();
    const q = createVoiceQueue(transport, () => true);
    q.enqueue('a');
    q.enqueue('b');
    await vi.advanceTimersByTimeAsync(35);
    expect(spoken).toEqual([]);
    expect(q.isSpeaking).toBe(false);
  });
});
