import { RadioStation, RadioTrack, RadioGenre } from '../types';
import { GUJARAT_RADIO_STATIONS } from '../data/radioStations';

export class RadioAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isPoweredOn: boolean = false;
  private volume: number = 0.75;
  private isMuted: boolean = false;

  // Active Radio State
  private currentStationIndex: number = 0;
  private currentTrackIndex: number = 0;
  private trackStartTime: number = 0;
  private trackElapsedTime: number = 0;
  private newsBulletinIndex: number = 0;
  private isSpeakingNews: boolean = false;

  // Master Audio Nodes
  private masterGain: GainNode | null = null;
  private radioFilter: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;

  // Synth Nodes & Loops
  private loopTimerId: any = null;
  private melodyStep: number = 0;
  private beatStep: number = 0;
  private activeVoices: OscillatorNode[] = [];
  private droneOscs: OscillatorNode[] = [];

  // Tuning Static Noise
  private staticGain: GainNode | null = null;

  // Listeners
  private onStateChangeCallbacks: Array<() => void> = [];

  constructor() {
    // Initialized on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isPoweredOn && !this.isMuted ? this.volume : 0, this.ctx.currentTime);

      // Vintage Warm AM/FM Radio Filter
      this.radioFilter = this.ctx.createBiquadFilter();
      this.radioFilter.type = 'bandpass';
      this.radioFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.radioFilter.Q.setValueAtTime(0.9, this.ctx.currentTime);

      // Fast Analyser for UI VU Meter and Frequency Visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.radioFilter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
  }

  public subscribe(cb: () => void) {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notify() {
    this.onStateChangeCallbacks.forEach((cb) => cb());
  }

  // --- Controls ---

  public togglePower(): boolean {
    this.isPoweredOn = !this.isPoweredOn;
    if (this.isPoweredOn) {
      this.initContext();
      this.playTuningStaticSound(0.25);
      this.startBroadcast();
    } else {
      this.stopBroadcast();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    this.updateGain();
    this.notify();
    return this.isPoweredOn;
  }

  public setPower(power: boolean) {
    if (this.isPoweredOn !== power) {
      this.togglePower();
    }
  }

  public getIsPowered(): boolean {
    return this.isPoweredOn;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateGain();
    this.notify();
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateGain();
    this.notify();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private updateGain() {
    if (!this.ctx || !this.masterGain) return;
    const target = this.isPoweredOn && !this.isMuted ? this.volume * 0.42 : 0;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  // --- Station Navigation ---

  public getCurrentStation(): RadioStation {
    return GUJARAT_RADIO_STATIONS[this.currentStationIndex] || GUJARAT_RADIO_STATIONS[0];
  }

  public getCurrentTrack(): RadioTrack {
    const st = this.getCurrentStation();
    return st.tracks[this.currentTrackIndex] || st.tracks[0];
  }

  public getCurrentStationIndex(): number {
    return this.currentStationIndex;
  }

  public selectStation(index: number) {
    if (index < 0 || index >= GUJARAT_RADIO_STATIONS.length) return;
    if (this.currentStationIndex === index && this.isPoweredOn) return;

    this.currentStationIndex = index;
    this.currentTrackIndex = 0;
    this.melodyStep = 0;
    this.beatStep = 0;
    this.newsBulletinIndex = 0;

    if (!this.isPoweredOn) {
      this.isPoweredOn = true;
      this.initContext();
    }

    // Play tuning static sweep
    this.playTuningStaticSound(0.4);

    this.stopBroadcast();
    setTimeout(() => {
      this.startBroadcast();
    }, 180);

    this.notify();
  }

  public nextStation() {
    const nextIdx = (this.currentStationIndex + 1) % GUJARAT_RADIO_STATIONS.length;
    this.selectStation(nextIdx);
  }

  public prevStation() {
    const prevIdx = (this.currentStationIndex - 1 + GUJARAT_RADIO_STATIONS.length) % GUJARAT_RADIO_STATIONS.length;
    this.selectStation(prevIdx);
  }

  public nextTrack() {
    const st = this.getCurrentStation();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % st.tracks.length;
    this.melodyStep = 0;
    this.beatStep = 0;
    this.stopBroadcast();
    this.startBroadcast();
    this.notify();
  }

  public prevTrack() {
    const st = this.getCurrentStation();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + st.tracks.length) % st.tracks.length;
    this.melodyStep = 0;
    this.beatStep = 0;
    this.stopBroadcast();
    this.startBroadcast();
    this.notify();
  }

  // --- Procedural Radio Broadcast Synthesizer ---

  private startBroadcast() {
    if (!this.isPoweredOn) return;
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.trackStartTime = Date.now();

    const station = this.getCurrentStation();
    const track = this.getCurrentTrack();

    // Start background drone (Tanpura / Harmonium sur)
    this.startDrone(track.scaleType);

    // If news channel, trigger Akashvani Chime and spoken news updates
    if (station.genre === 'news') {
      this.playAkashvaniSignatureChime();
      this.scheduleSpokenNews();
    }

    // Rhythm and Melody Tick Engine
    const intervalMs = Math.max(120, Math.floor((60000 / (track.tempoBpm || 110)) / 2)); // 8th note resolution

    this.loopTimerId = setInterval(() => {
      if (!this.isPoweredOn || !this.isPlaying || !this.ctx) return;
      this.tickMusicStep(track);
    }, intervalMs);

    this.notify();
  }

  private stopBroadcast() {
    this.isPlaying = false;
    if (this.loopTimerId) {
      clearInterval(this.loopTimerId);
      this.loopTimerId = null;
    }
    this.stopDrone();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Continuous Tanpura Drone chord for Indian classical / folk grounding
   */
  private startDrone(scaleType: string) {
    if (!this.ctx || !this.radioFilter) return;
    this.stopDrone();

    // Fundamental Sa (C3 = 130.81 Hz, G2 = 98 Hz)
    const baseFreq = 130.81;
    const fifthFreq = baseFreq * 1.5; // Pa (G)
    const octaveFreq = baseFreq * 2; // High Sa

    const freqs = [baseFreq, fifthFreq, octaveFreq];
    const now = this.ctx.currentTime;

    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f + (idx - 1) * 0.35, now); // Gentle chorus detune

      // Soft breathing modulation
      gain.gain.setValueAtTime(0.04, now);

      osc.connect(gain);
      gain.connect(this.radioFilter!);
      osc.start(now);

      this.droneOscs.push(osc);
    });
  }

  private stopDrone() {
    this.droneOscs.forEach((osc) => {
      try {
        osc.stop();
      } catch {}
    });
    this.droneOscs = [];
  }

  /**
   * Generates rhythmic percussion and folk melody on every clock step
   */
  private tickMusicStep(track: RadioTrack) {
    if (!this.ctx || !this.radioFilter) return;
    const now = this.ctx.currentTime;
    const step = this.beatStep % 8;

    // 1. Percussion synthesis based on genre
    switch (track.genre) {
      case 'garba':
        // High-energy 4/4 and 2/4 Garba Dhol groove (Dhum - Ta - Ta - Dhum)
        if (step === 0 || step === 4) {
          this.synthesizeDholBass(now, 0.45); // Deep resonant Dhol bass stroke
        }
        if (step === 2 || step === 6) {
          this.synthesizeManjiraClap(now, 0.25); // Metallic Manjira jingle / clap
        }
        if (step === 3 || step === 7) {
          this.synthesizeDholRim(now, 0.18); // Snappy rim stroke
        }
        break;

      case 'folk':
      case 'dayro':
        // Traditional Dayro Dholak / Tabla beat (Dhin Ta Dhin Ta)
        if (step === 0) {
          this.synthesizeDholBass(now, 0.38);
        }
        if (step === 2 || step === 6) {
          this.synthesizeDholRim(now, 0.22);
          this.synthesizeManjiraClap(now, 0.15);
        }
        if (step === 4) {
          this.synthesizeDholBass(now, 0.28);
        }
        break;

      case 'bhakti':
        // Soothing rhythmic Tabla & temple bells
        if (step === 0 || step === 4) {
          this.synthesizeDholBass(now, 0.25);
        }
        if (step === 2) {
          this.synthesizeTempleChime(now, 0.15);
        }
        break;

      case 'news':
        // Subtle soft ticking rhythm
        if (step === 0) {
          this.synthesizeTeletypeBeep(now);
        }
        break;
    }

    // 2. Melodic note generation (Folk Bansuri / Harmonium notes)
    if (track.genre !== 'news' || Math.random() < 0.2) {
      this.synthesizeMelodyNote(now, track.scaleType, track.genre);
    }

    this.beatStep++;
    this.melodyStep++;
  }

  /**
   * Synthesize deep punchy Dhol / Dholak bass (ઢોલનો ધબકારો)
   */
  private synthesizeDholBass(time: number, gainVal: number) {
    if (!this.ctx || !this.radioFilter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.18); // Punchy pitch dive

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.radioFilter);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  /**
   * Synthesize Dholak rim click (ઢોલકની થાપ)
   */
  private synthesizeDholRim(time: number, gainVal: number) {
    if (!this.ctx || !this.radioFilter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.08);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(this.radioFilter);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  /**
   * Synthesize Manjira & Hand Clap (મંજીરા અને તાળી)
   */
  private synthesizeManjiraClap(time: number, gainVal: number) {
    if (!this.ctx || !this.radioFilter) return;
    // High crisp harmonic bell
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2450, time);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.radioFilter);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  /**
   * Synthesize Temple Chime / Ghanti
   */
  private synthesizeTempleChime(time: number, gainVal: number) {
    if (!this.ctx || !this.radioFilter) return;
    const freqs = [1174.66, 1760];
    freqs.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(gain);
      gain.connect(this.radioFilter!);
      osc.start(time);
      osc.stop(time + 0.45);
    });
  }

  /**
   * Synthesize melodic modal lead (Harmonium / Shehnai / Bansuri)
   */
  private synthesizeMelodyNote(time: number, scaleType: string, genre: RadioGenre) {
    if (!this.ctx || !this.radioFilter) return;

    // Indian Ragas / Folk Scales (Sa, Re, Ga, Ma, Pa, Dha, Ni, Sa)
    // C4 base = 261.63 Hz
    const C4 = 261.63;
    const bilawal = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]; // Major
    const khamaj = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16]; // Flat 7th (Desh/Khamaj folk)
    const bhairav = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16]; // Komal Re, Komal Dha (Soulful Indian Morning)
    const kalyan = [0, 2, 4, 6, 7, 9, 11, 12, 14]; // Teevra Ma (Radiant Evening)

    let scale = bilawal;
    if (scaleType === 'khamaj') scale = khamaj;
    if (scaleType === 'bhairav') scale = bhairav;
    if (scaleType === 'kalyan') scale = kalyan;

    // Procedural folk melodic contour
    const melodyIndex = Math.floor(Math.sin(this.melodyStep * 0.4) * 3.5 + 3.5) % scale.length;
    const semitones = scale[Math.max(0, Math.min(scale.length - 1, melodyIndex))];
    const freq = C4 * Math.pow(2, semitones / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Harmonium / Shehnai timbre (Warm sawtooth with smooth attack)
    osc.type = genre === 'garba' ? 'sawtooth' : genre === 'bhakti' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const dur = genre === 'garba' ? 0.2 : 0.38;
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.radioFilter);

    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  /**
   * Akashvani News Teletype Beep
   */
  private synthesizeTeletypeBeep(time: number) {
    if (!this.ctx || !this.radioFilter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.radioFilter);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  /**
   * Historic Akashvani Signature Chime Tune
   */
  private playAkashvaniSignatureChime() {
    if (!this.ctx || !this.radioFilter) return;
    const now = this.ctx.currentTime + 0.1;

    // Classic Akashvani Tanpura / Viola signature notes
    const notes = [
      { f: 392.00, t: 0.0, d: 0.25 }, // G4
      { f: 523.25, t: 0.25, d: 0.3 }, // C5
      { f: 493.88, t: 0.55, d: 0.25 }, // B4
      { f: 440.00, t: 0.8, d: 0.25 }, // A4
      { f: 392.00, t: 1.05, d: 0.5 }, // G4
    ];

    notes.forEach((n) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.2, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.radioFilter!);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });
  }

  /**
   * Akashvani / Gujarati News Reader using Web Speech Synthesis
   */
  private scheduleSpokenNews() {
    if (!('speechSynthesis' in window) || this.isMuted || !this.isPoweredOn) return;

    const track = this.getCurrentTrack();
    if (!track.newsBulletins || track.newsBulletins.length === 0) return;

    const bulletin = track.newsBulletins[this.newsBulletinIndex % track.newsBulletins.length];
    this.newsBulletinIndex++;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(bulletin);
      utterance.lang = 'gu-IN';
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeakingNews = true;
        this.notify();
      };

      utterance.onend = () => {
        this.isSpeakingNews = false;
        this.notify();
        // Schedule next bulletin after 12 seconds
        if (this.isPoweredOn && this.getCurrentStation().genre === 'news') {
          setTimeout(() => {
            if (this.isPoweredOn && this.getCurrentStation().genre === 'news') {
              this.scheduleSpokenNews();
            }
          }, 12000);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  /**
   * Analog FM/AM Tuning Static Noise Sound
   */
  private playTuningStaticSound(duration: number = 0.3) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; // White noise
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);
    } catch {}
  }

  /**
   * Get real-time audio visualizer frequency byte data
   */
  public getVisualizerData(): Uint8Array {
    if (!this.analyser || !this.isPoweredOn || this.isMuted) {
      return new Uint8Array(16).fill(0);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export const radioAudioEngine = new RadioAudioEngine();
