import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { soundManager } from './SoundManager';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith('.ts') || p.endsWith('.tsx') ? [p] : [];
  });
}

describe('SoundManager API covers every call site', () => {
  it('every soundManager.<method>() referenced in src/ exists', () => {
    const files = walk(join(process.cwd(), 'src'));
    const used = new Set<string>();
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/soundManager\.([a-zA-Z_]\w*)\s*\(/g)) {
        used.add(m[1]);
      }
    }
    const missing = [...used].filter(
      (name) => typeof (soundManager as unknown as Record<string, unknown>)[name] !== 'function',
    );
    expect(missing, `missing SoundManager methods: ${missing.join(', ')}`).toEqual([]);
  });
});
