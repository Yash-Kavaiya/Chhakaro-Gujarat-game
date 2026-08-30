import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, X, Sparkles, MessageSquare } from 'lucide-react';
import { LocationData, WeatherType } from '../types';
import { soundManager } from '../audio/SoundManager';

interface KanjiKakaGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  speed: number;
  weather: WeatherType;
  visitedLocations: string[];
  lastSpokenMessage: string;
  onNewKakaReply: (msg: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'kaka';
  text: string;
  timestamp: string;
  mood?: string;
  food?: string;
}

export const KanjiKakaGuide: React.FC<KanjiKakaGuideProps> = ({
  isOpen,
  onClose,
  currentLocation,
  speed,
  weather,
  visitedLocations,
  lastSpokenMessage,
  onNewKakaReply,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'kaka',
      text: `રામ રામ બાપા! હું તમારો કાનજી કાકો! અત્યારે આપણો છકડો ${currentLocation.nameGujarati} ના રસ્તે મોજમાં દોડે છે. પૂછો જે પૂછવું હોય — ઇતિહાસ, ખાણીપીણી કે રસ્તાની વાતો!`,
      timestamp: 'હમણાં જ',
      mood: 'cheerful',
      food: currentLocation.famousFood,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync if proactive narration occurred
  useEffect(() => {
    if (lastSpokenMessage && !messages.some((m) => m.text === lastSpokenMessage)) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'kaka',
          text: lastSpokenMessage,
          timestamp: 'હમણાં જ',
          mood: 'excited',
        },
      ]);
    }
  }, [lastSpokenMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice speech-to-text recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'gu-IN';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, [currentLocation, speed, weather]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('તમારા બ્રાઉઝરમાં માઇક્રોફોન સ્પીચ રેકગ્નિશન સપોર્ટેડ નથી.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const query = customPrompt || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          currentLocation,
          visitedLocations,
          speed,
          weather,
          timeOfDay: weather === 'night' ? 'night' : 'day',
        }),
      });

      const data = await res.json();
      const replyText = data.reply || 'કાં ભાઈ, મોજમાં રહો અને છકડો ચલાવતા રહો!';

      const kakaMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'kaka',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mood: data.kakaMood,
        food: data.recommendedFood,
      };

      setMessages((prev) => [...prev, kakaMsg]);
      onNewKakaReply(replyText);

      // Play Gujarati Voice narration
      soundManager.speakGujaratiTextFallback(replyText);
    } catch (err) {
      console.error('Error fetching guide reply', err);
      const fallbackMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'kaka',
        text: `કાં ભાઈ! આપણો છકડો ${currentLocation.nameGujarati} પહોંચી ગયો છે. અહીંની મુલાકાત યાદગાર રહેશે!`,
        timestamp: 'હમણાં જ',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    `આ ${currentLocation.nameGujarati} નો ઇતિહાસ શું છે?`,
    `અહીં શું ખાવાનું પ્રખ્યાત છે?`,
    `આગળનો રસ્તો કેવો છે કાકા?`,
    `એક મસ્ત કાઠિયાવાડી દુહો કે કહેવત સંભળાવો!`,
  ];

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
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
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
                  <span>{m.timestamp}</span>
                  {m.sender === 'kaka' && (
                    <button
                      onClick={() => soundManager.speakGujaratiTextFallback(m.text)}
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

          {isLoading && (
            <div className="flex gap-2 items-center text-amber-400 text-xs font-semibold animate-pulse">
              <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center text-sm">
                👳🏽‍♂️
              </div>
              <div className="bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
                કાનજી કાકો વિચારી રહ્યા છે... 💭
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp)}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-medium border border-slate-700 transition-colors shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-amber-600/40 flex items-center gap-2">
          <button
            id="kaka-mic-btn"
            onClick={toggleListening}
            className={`p-3 rounded-2xl transition-all shadow ${
              isListening
                ? 'bg-red-500 text-white animate-bounce'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
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
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="કાનજી કાકાને ગુજરાતીમાં કંઈપણ પૂછો..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          <button
            id="kaka-send-btn"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 p-3 rounded-2xl font-bold transition-transform active:scale-95 shadow"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
