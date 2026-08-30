import { describe, it, expect } from 'vitest';

describe('vitest pipeline', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('has a DOM (jsdom)', () => {
    expect(typeof window).toBe('object');
    expect(typeof localStorage).toBe('object');
  });
});
