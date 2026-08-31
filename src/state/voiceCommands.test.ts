import { describe, it, expect } from 'vitest';
import { matchVoiceIntent } from './voiceCommands';
import { GUJARAT_LOCATIONS } from '../data/locations';

const L = GUJARAT_LOCATIONS;

describe('matchVoiceIntent', () => {
  it('navigates on a Gujarati command with a place name', () => {
    expect(matchVoiceIntent('કાકા દ્વારકા લઈ જાવ', L)).toEqual({ kind: 'navigate', locationId: 'dwarka' });
  });

  it('navigates on an English command', () => {
    expect(matchVoiceIntent('take me to somnath', L)).toEqual({ kind: 'navigate', locationId: 'somnath' });
  });

  it('navigates with "ચાલો" + place', () => {
    expect(matchVoiceIntent('ચાલો સાસણ ગીર', L)).toEqual({ kind: 'navigate', locationId: 'gir' });
  });

  it('opens the map', () => {
    expect(matchVoiceIntent('નકશો બતાવો', L)).toEqual({ kind: 'open', target: 'map' });
  });

  it('opens the passport', () => {
    expect(matchVoiceIntent('પાસપોર્ટ ખોલો', L)).toEqual({ kind: 'open', target: 'passport' });
  });

  it('toggles music', () => {
    expect(matchVoiceIntent('મ્યુઝિક બંધ કરો', L)).toEqual({ kind: 'toggle', target: 'music' });
  });

  it('toggles the headlight', () => {
    expect(matchVoiceIntent('હેડલાઇટ ચાલુ કરો', L)).toEqual({ kind: 'toggle', target: 'headlight' });
  });

  it('takes a photo', () => {
    expect(matchVoiceIntent('ફોટો પાડો', L)).toEqual({ kind: 'photo' });
  });

  it('repeats the last line', () => {
    expect(matchVoiceIntent('ફરી કહો', L)).toEqual({ kind: 'repeat' });
  });

  it('a "tell me about X" question is not a command', () => {
    expect(matchVoiceIntent('દ્વારકા વિશે કહો', L)).toEqual({ kind: 'unknown' });
  });

  it('a bare place name is not a command', () => {
    expect(matchVoiceIntent('દ્વારકા', L)).toEqual({ kind: 'unknown' });
  });

  it('empty transcript → unknown', () => {
    expect(matchVoiceIntent('', L)).toEqual({ kind: 'unknown' });
  });

  it('a nav verb with no known place → unknown (routes to Kaka)', () => {
    expect(matchVoiceIntent('મને ચંદ્ર પર લઈ જાવ', L)).toEqual({ kind: 'unknown' });
  });
});
