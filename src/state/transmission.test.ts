import { describe, it, expect } from 'vitest';
import {
  autoGear, accelMultiplier, gearMaxSpeed, shiftUp, shiftDown, canStartEngine, GEAR_BANDS,
} from './transmission';

describe('autoGear', () => {
  it('starts in 1 from rest', () => {
    expect(autoGear(0, 'N')).toBe('1');
    expect(autoGear(5, '1')).toBe('1');
  });
  it('climbs the ladder as speed rises', () => {
    expect(autoGear(20, '1')).toBe('2');
    expect(autoGear(40, '2')).toBe('3');
    expect(autoGear(60, '3')).toBe('4');
  });
  it('drops down as speed falls', () => {
    expect(autoGear(30, '4')).toBe('3');
    expect(autoGear(15, '3')).toBe('2');
    expect(autoGear(6, '2')).toBe('1');
  });
  it('has hysteresis — does not flip-flop at a band edge', () => {
    // 18 km/h is the 1↔2 boundary; whichever gear you are in, you keep it here
    expect(autoGear(18, '1')).toBe('1');
    expect(autoGear(18, '2')).toBe('2');
  });
  it('reports R only from a negative speed, never from auto upshift', () => {
    expect(autoGear(-5, 'N')).toBe('R');
    expect(autoGear(-5, '2')).toBe('R');
  });
});

describe('accelMultiplier', () => {
  it('lower gears pull harder than higher ones at the same speed', () => {
    expect(accelMultiplier('1', 10, 'manual')).toBeGreaterThan(accelMultiplier('3', 10, 'manual'));
  });
  it('auto mode never bogs', () => {
    expect(accelMultiplier('4', 5, 'auto')).toBeGreaterThan(0.5);
  });
  it('manual mode bogs in far-too-high a gear at low speed', () => {
    expect(accelMultiplier('4', 5, 'manual')).toBeLessThan(0.35);
  });
  it('N and R do not drive forward', () => {
    expect(accelMultiplier('N', 0, 'manual')).toBe(0);
  });
});

describe('gearMaxSpeed', () => {
  it('matches the top of each band', () => {
    expect(gearMaxSpeed('2')).toBe(GEAR_BANDS['2'].max);
    expect(gearMaxSpeed('4')).toBe(GEAR_BANDS['4'].max);
  });
  it('R and N are capped low', () => {
    expect(gearMaxSpeed('N')).toBe(0);
    expect(gearMaxSpeed('R')).toBeLessThanOrEqual(18);
  });
});

describe('shiftUp / shiftDown', () => {
  it('walks the R,N,1,2,3,4 ladder', () => {
    expect(shiftUp('R')).toBe('N');
    expect(shiftUp('N')).toBe('1');
    expect(shiftUp('3')).toBe('4');
  });
  it('clamps at the ends', () => {
    expect(shiftUp('4')).toBe('4');
    expect(shiftDown('R')).toBe('R');
  });
});

describe('canStartEngine', () => {
  it('auto: always startable at rest', () => {
    expect(canStartEngine('auto', '2', 0)).toBe(true);
  });
  it('manual: only from a standstill in N or R', () => {
    expect(canStartEngine('manual', 'N', 0)).toBe(true);
    expect(canStartEngine('manual', 'R', 0)).toBe(true);
    expect(canStartEngine('manual', '1', 0)).toBe(false);
    expect(canStartEngine('manual', 'N', 12)).toBe(false);
  });
});
