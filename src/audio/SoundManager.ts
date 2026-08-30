/**
 * Web Audio API Sound Synthesizer & Manager for Chhakaro Gujarat
 * Generates procedural diesel engine thrum, dual-tone horn, ambient nature, temple bells, rain, and TTS playback.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isEngineRunning: boolean = false;

  // Engine audio nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private pulseGain: GainNode | null = null;

  // Ambient nodes
  private ambientGain: GainNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private currentAmbientType: string = '';

  // Horn nodes
  private isHornPlaying: boolean = false;
  private hornGain: GainNode | null = null;

  constructor() {
    // Lazy initialize on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      if (this.isMuted) {
        if (this.engineGain) this.engineGain.gain.value = 0;
        if (this.ambientGain) this.ambientGain.gain.value = 0;
      }
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Start procedural Chhakaro Diesel Engine
   */
  public startEngine() {
    this.initContext();
    if (!this.ctx || this.isEngineRunning) return;

    this.isEngineRunning = true;

    // Create engine sound synthesis
    const now = this.ctx.currentTime;

    // Filter to simulate metallic engine block vibration
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, now);
    this.engineFilter.Q.setValueAtTime(4.0, now);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, now);

    // Primary low thumping pulse (single cylinder stroke ~24 Hz base)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(26, now);

    // Secondary harmonic (gear whine & exhaust vibration)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(52, now);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start(now);
    this.engineOsc2.start(now);

    // Play initial ignition choke sound
    this.playIgnitionSound();
  }

  private playIgnitionSound() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const ignOsc = this.ctx.createOscillator();
    const ignGain = this.ctx.createGain();

    ignOsc.type = 'square';
    ignOsc.frequency.setValueAtTime(80, now);
    ignOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    ignGain.gain.setValueAtTime(0.3, now);
    ignGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    ignOsc.connect(ignGain);
    ignGain.connect(this.ctx.destination);
    ignOsc.start(now);
    ignOsc.stop(now + 0.4);
  }

  /**
   * Modulate engine RPM & pitch based on current vehicle speed & acceleration
   */
  public updateEngineRPM(speed: number, isAccelerating: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const absSpeed = Math.abs(speed);
    const rpmFactor = Math.min(absSpeed / 70, 1.0);
    const now = this.ctx.currentTime;

    // Diesel Chhakaro RPM: Idle (25Hz) to High RPM (95Hz)
    const baseFreq = 26 + rpmFactor * 65 + (isAccelerating ? 12 : 0);
    const harmonicFreq = baseFreq * 2.1;
    const filterFreq = 300 + rpmFactor * 700 + (isAccelerating ? 250 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(harmonicFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.1);

    if (this.engineGain && !this.isMuted) {
      const volume = 0.18 + rpmFactor * 0.15 + (isAccelerating ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(volume, now, 0.05);
    }
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    this.isEngineRunning = false;
    try {
      if (this.engineOsc1) this.engineOsc1.stop();
      if (this.engineOsc2) this.engineOsc2.stop();
    } catch {}
    this.engineOsc1 = null;
    this.engineOsc2 = null;
  }

  /**
   * Authentic Gujarati Chhakaro Horn (Dual tone loud brass bulb / air horn)
   */
  public startHorn(hornType: string = 'classic_bulb') {
    this.initContext();
    if (!this.ctx || this.isHornPlaying || this.isMuted) return;

    this.isHornPlaying = true;
    const now = this.ctx.currentTime;

    const f1 = hornType === 'diesel_air' ? 380 : hornType === 'musical_saurashtra' ? 440 : 340;
    const f2 = hornType === 'diesel_air' ? 480 : hornType === 'musical_saurashtra' ? 554 : 425;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    this.hornGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(f1, now);
    osc2.frequency.setValueAtTime(f2, now);

    this.hornGain.gain.setValueAtTime(0.35, now);

    osc1.connect(this.hornGain);
    osc2.connect(this.hornGain);
    this.hornGain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);

    (this as any)._hornOsc1 = osc1;
    (this as any)._hornOsc2 = osc2;
  }

  public stopHorn() {
    if (!this.isHornPlaying || !this.ctx) return;
    this.isHornPlaying = false;
    const now = this.ctx.currentTime;

    if (this.hornGain) {
      this.hornGain.gain.setTargetAtTime(0, now, 0.05);
    }

    setTimeout(() => {
      try {
        if ((this as any)._hornOsc1) (this as any)._hornOsc1.stop();
        if ((this as any)._hornOsc2) (this as any)._hornOsc2.stop();
      } catch {}
    }, 60);
  }

  /**
   * Temple Bell Gong sound for Dwarka & Somnath
   */
  public playTempleBell() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Harmonic bell frequencies (fundamental + overtones)
    const freqs = [587.33, 1174.66, 1760, 2400];
    const decays = [3.5, 2.8, 1.8, 1.0];

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decays[i]);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + decays[i] + 0.1);
    });
  }

  /**
   * Sound effect for discovering new Gujarati food item
   */
  public playFoodDiscoverSound() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Upward cheerful arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  /**
   * Sound effect for unlocking a new achievement / stamp
   */
  public playAchievementSound() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chords = [
      [440, 554.37, 659.25], // A major
      [587.33, 739.99, 880], // D major
    ];

    chords.forEach((chord, cIdx) => {
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + cIdx * 0.22);

        gain.gain.setValueAtTime(0.2, now + cIdx * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + cIdx * 0.22 + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + cIdx * 0.22);
        osc.stop(now + cIdx * 0.22 + 0.75);
      });
    });
  }

  /**
   * Short rising two-note ping for confirmations (stamp earned, item bought, correct answer).
   */
  public playChime() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 987.77]; // E5, B5
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.22, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.3);
    });
  }

  /**
   * One or more short horn toots (used for wrong quiz answer, mission accept cue).
   */
  public playHorn(count: number = 1) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const toots = Math.max(1, Math.min(3, Math.floor(count)));
    const now = this.ctx.currentTime;
    for (let t = 0; t < toots; t++) {
      const start = now + t * 0.22;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(340, start);
      osc2.frequency.setValueAtTime(425, start);
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.setTargetAtTime(0, start + 0.14, 0.03);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + 0.2);
      osc2.stop(start + 0.2);
    }
  }

  /**
   * Play base64 audio from Gemini TTS
   */
  public async playBase64Audio(base64Data: string) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if PCM or encoded WAV
      if (bytes[0] === 0x52 && bytes[1] === 0x49) { // 'RIFF'
        const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer);
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.ctx.destination);
        source.start();
      } else {
        // Fallback or Web Speech API if standard decode fails
        this.speakGujaratiTextFallback('કાનજી કાકો બોલે છે!');
      }
    } catch (e) {
      console.warn('Audio decode error, using speech fallback', e);
    }
  }

  /**
   * Short subtle UI click sound
   */
  public playClick() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Web Speech API fallback for instant Gujarati voice playback
   */
  public speakGujaratiTextFallback(text: string) {
    if (this.isMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'gu-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }
}

export const soundManager = new SoundManager();
