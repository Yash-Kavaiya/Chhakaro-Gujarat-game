import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, X, Map as MapIcon } from 'lucide-react';
import { LocationData } from '../types';
import { GUJARAT_LOCATIONS } from '../data/locations';
import { voiceQueue } from '../audio/VoiceQueue';
import { KakaChatMessage, KakaMode } from '../state/useKakaCompanion';
import { TripPlan } from '../state/tripPlanner';

interface KanjiKakaGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  messages: KakaChatMessage[];
  isThinking: boolean;
  onAsk: (prompt: string, mode?: KakaMode) => void;
  onGenerateTrip: (request: string) => Promise<TripPlan>;
}

const locName = (id: string): string =>
  GUJARAT_LOCATIONS.find((l) => l.id === id)?.nameGujarati ?? id;

const MODE_CHIPS: Array<{ mode: KakaMode; label: string; canned: (loc: LocationData) => string }> = [
  { mode: 'ask', label: 'પૂછો', canned: () => '' },
  { mode: 'story', label: 'વાર્તા', canned: (loc) => `${loc.nameGujarati} ની એક રસપ્રદ વાર્તા કે ઐતિહાસિક પ્રસંગ કહો` },
  { mode: 'duha', label: 'દુહો', canned: () => 'એક મસ્ત કાઠિયાવાડી દુહો કે કહેવત સંભળાવો' },
  { mode: 'food', label: 'ખાણીપીણી', canned: (loc) => `${loc.nameGujarati} માં શું ખાવાનું પ્રખ્યાત છે?` },
  { mode: 'directions', label: 'રસ્તો', canned: () => 'આગળનો રસ્તો કેવો છે કાકા?' },
];

export const KanjiKakaGuide: React.FC<KanjiKakaGuideProps> = ({
  isOpen,
  onClose,
  currentLocation,
  messages,
  isThinking,
  onAsk,
  onGenerateTrip,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeMode, setActiveMode] = useState<KakaMode>('ask');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [tripOpen, setTripOpen] = useState(false);
  const [tripRequest, setTripRequest] = useState('');
  const [tripBusy, setTripBusy] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeModeRef = useRef<KakaMode>('ask');
  activeModeRef.current = activeMode;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, tripPlan]);

  // Gujarati speech-to-text. Registered once; reads the live mode through a ref.
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'gu-IN';
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onAsk(transcript, activeModeRef.current);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, [onAsk]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMicError('તમારા બ્રાઉઝરમાં માઇક્રોફોન સપોર્ટેડ નથી.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      recognitionRef.current.start();
      setMicError(null);
      setIsListening(true);
    } catch (err) {
      console.error('Speech recognition start failed', err);
    }
  };

  const send = (text?: string, mode?: KakaMode) => {
    const query = (text ?? inputText).trim();
    if (!query || isThinking) return;
    onAsk(query, mode ?? activeMode);
    setInputText('');
  };

  const pickMode = (chip: (typeof MODE_CHIPS)[number]) => {
    setActiveMode(chip.mode);
    const canned = chip.canned(currentLocation);
    if (canned) send(canned, chip.mode);
  };

  const runTrip = async () => {
    const req = tripRequest.trim() || 'ગુજરાતની એક મસ્ત સફર';
    setTripBusy(true);
    setTripPlan(null);
    try {
      const plan = await onGenerateTrip(req);
      setTripPlan(plan);
    } finally {
      setTripBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-sans select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-2xl shadow">
              👳🏽‍♂️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-serif">કાનજી કાકો (AI ટૂર ગાઈડ)</h2>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Online
                </span>
              </div>
              <p className="text-xs text-amber-100">
                અસલ કાઠિયાવાડી છકડાના સાથી | વર્તમાન સ્થળ: {currentLocation.nameGujarati}
              </p>
            </div>
          </div>
          <button
            id="kaka-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
          {messages.length === 0 && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center text-sm shrink-0">
                👳🏽‍♂️
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-none p-3.5 shadow-md bg-slate-800 border border-amber-500/40 text-amber-50">
                <p className="text-sm leading-relaxed">
                  રામ રામ બાપા! હું તમારો કાનજી કાકો. અત્યારે આપણો છકડો {currentLocation.nameGujarati} ના
                  રસ્તે મોજમાં દોડે છે. ઇતિહાસ, ખાણીપીણી, દુહો કે રસ્તાની વાત — જે પૂછવું હોય એ પૂછો!
                </p>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'kaka' && (
                <div className="w-8 h-8 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center text-sm shrink-0">
                  👳🏽‍♂️
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-3.5 shadow-md ${
                  m.sender === 'user'
                    ? 'bg-amber-600 text-white rounded-br-none'
                    : 'bg-slate-800 border border-amber-500/40 text-amber-50 rounded-bl-none'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>

                {m.food && m.sender === 'kaka' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700 text-xs text-amber-300 flex items-center gap-1.5 font-medium">
                    <span>🍲 કાકાની ભલામણ:</span>
                    <span className="font-bold underline">{m.food}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{m.ts}</span>
                  {m.sender === 'kaka' && (
                    <button
                      onClick={() => voiceQueue.enqueue(m.text, { priority: 'high' })}
                      className="hover:text-amber-300 flex items-center gap-1"
                      title="ફરીથી સાંભળો"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>સાંભળો</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-2 items-center text-amber-400 text-xs font-semibold animate-pulse">
              <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center text-sm">👳🏽‍♂️</div>
              <div className="bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
                કાનજી કાકો વિચારી રહ્યા છે... 💭
              </div>
            </div>
          )}

          {/* Trip generator panel */}
          {tripOpen && (
            <div className="rounded-2xl border border-amber-500/50 bg-slate-900/80 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-bold">
                <MapIcon className="w-4 h-4" />
                <span>કાકા સાથે સફર બનાવો</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tripRequest}
                  onChange={(e) => setTripRequest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runTrip()}
                  placeholder="દા.ત. અડધા દિવસનો ધાર્મિક પ્રવાસ"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={runTrip}
                  disabled={tripBusy}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 px-3 py-2 rounded-xl text-sm font-bold"
                >
                  {tripBusy ? '...' : 'બનાવો'}
                </button>
              </div>

              {tripPlan && (
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-amber-100 leading-relaxed">{tripPlan.introGujarati}</p>
                  <ol className="space-y-1.5">
                    {tripPlan.stops.map((s, i) => (
                      <li key={s.locationId} className="text-xs text-slate-200 flex gap-2">
                        <span className="font-black text-amber-400 shrink-0">{i + 1}.</span>
                        <span>
                          <span className="font-bold text-amber-200">{locName(s.locationId)}</span>
                          {' — '}
                          {s.reasonGujarati}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Mode chips */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          {MODE_CHIPS.map((chip) => (
            <button
              key={chip.mode}
              onClick={() => pickMode(chip)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                activeMode === chip.mode
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
          <button
            onClick={() => setTripOpen((v) => !v)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
              tripOpen
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border-slate-700'
            }`}
          >
            🗺️ સફર બનાવો
          </button>
        </div>

        {micError && (
          <div
            role="alert"
            className="mx-3 sm:mx-4 mt-2 -mb-1 flex items-center justify-between gap-3 rounded-xl border border-red-500/50 bg-red-950/70 px-3 py-2 text-xs font-semibold text-red-200"
          >
            <span>{micError}</span>
            <button
              onClick={() => setMicError(null)}
              className="shrink-0 rounded-lg bg-red-500/20 p-1 text-red-200 hover:bg-red-500/40 transition-colors"
              title="બંધ કરો"
              aria-label="બંધ કરો"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-amber-600/40 flex items-center gap-2">
          <button
            id="kaka-mic-btn"
            onClick={toggleListening}
            className={`p-3 rounded-2xl transition-all shadow ${
              isListening ? 'bg-red-500 text-white animate-bounce' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
            title="ગુજરાતીમાં બોલીને પૂછો (Microphone)"
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <input
            id="kaka-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="કાનજી કાકાને ગુજરાતીમાં કંઈપણ પૂછો..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          <button
            id="kaka-send-btn"
            onClick={() => send()}
            disabled={!inputText.trim() || isThinking}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 p-3 rounded-2xl font-bold transition-transform active:scale-95 shadow"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
