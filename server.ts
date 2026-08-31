import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { buildLocalTrip } from './src/state/tripPlanner';
import { GUJARAT_LOCATIONS } from './src/data/locations';

const VALID_LOCATION_IDS = new Set(GUJARAT_LOCATIONS.map((l) => l.id));
const TRIP_MAX_STOPS = 6;
const TRIP_MIN_STOPS = 3;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client with telemetry header
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Personality modes that shape Kaka's tone for a reply.
type KakaMode = 'ask' | 'story' | 'duha' | 'food' | 'directions';
const KAKA_MODES: KakaMode[] = ['ask', 'story', 'duha', 'food', 'directions'];
const MODE_TONE: Record<KakaMode, string> = {
  ask: 'સીધો, ટૂંકો અને માહિતીભર્યો જવાબ આપો.',
  story: 'આ સ્થળનો એક રસપ્રદ ઐતિહાસિક પ્રસંગ કે લોકવાયકા ટૂંકમાં કહો.',
  duha: 'એક અસલ કાઠિયાવાડી દુહો, કહેવત કે લોકગીતની કડી સંભળાવો અને પછી તેનો ટૂંકો અર્થ.',
  food: 'આ વિસ્તારની અસલ દેશી વાનગીઓ અને એ ક્યાં ખાવી તેની વાત કરો.',
  directions: 'આગળનો રસ્તો, વળાંક અને અંતરની ટૂંકી દિશા-સૂચના આપો.',
};

// A single normalized view over either the legacy guide body
// ({ prompt, currentLocation, visitedLocations, speed, weather, timeOfDay }) or the M2
// KakaContext body ({ prompt, mode, context: {...} } or the context fields flat).
function normalizeGuideRequest(body: any) {
  const b = body || {};
  const c = b.context && typeof b.context === 'object' ? b.context : b;

  const prompt: string = typeof b.prompt === 'string' ? b.prompt : '';
  const mode: KakaMode | null = KAKA_MODES.includes(b.mode) ? b.mode : null;

  const legacyLoc = b.currentLocation || c.currentLocation || null;
  const zone =
    c.zone && typeof c.zone === 'object'
      ? { id: c.zone.id || 'rajkot', nameGujarati: c.zone.nameGujarati || 'ગુજરાત', region: c.zone.region || 'saurashtra' }
      : legacyLoc
        ? {
            id: legacyLoc.id || 'rajkot',
            nameGujarati: legacyLoc.nameGujarati || 'ગુજરાત',
            region: legacyLoc.region || 'saurashtra',
          }
        : { id: 'rajkot', nameGujarati: 'રાજકોટ', region: 'saurashtra' };

  const famousFood: string =
    legacyLoc?.famousFood || (typeof c.recommendedFood === 'string' ? c.recommendedFood : '') || 'કાઠિયાવાડી ગાંઠિયા અને ગરમ ચા';

  const speedKmh = Math.round(Number(c.speedKmh ?? b.speed ?? 0)) || 0;
  const weather: string = c.weather || b.weather || 'sunny';
  const timeOfDayPhase: string = c.timeOfDayPhase || b.timeOfDay || 'day';
  const visitedCount =
    Number(c.visitedCount ?? (Array.isArray(b.visitedLocations) ? b.visitedLocations.length : 0)) || 0;
  const totalLocations = Number(c.totalLocations ?? 16) || 16;
  const mission = c.mission && typeof c.mission === 'object' ? c.mission : null;
  const nav = c.nav && typeof c.nav === 'object' ? c.nav : null;
  const nearbyLandmarkId = typeof c.nearbyLandmarkId === 'string' ? c.nearbyLandmarkId : null;
  const inGirZone = Boolean(c.inGirZone) || zone.id === 'gir';
  const recentEvents = Array.isArray(c.recentEvents) ? c.recentEvents.slice(0, 5) : [];

  return {
    prompt,
    mode,
    zone,
    famousFood,
    speedKmh,
    weather,
    timeOfDayPhase,
    visitedCount,
    totalLocations,
    mission,
    nav,
    nearbyLandmarkId,
    inGirZone,
    recentEvents,
  };
}

// One recent player event → a short Gujarati phrase for the model prompt.
function describeKakaEvent(e: any): string {
  switch (e?.kind) {
    case 'stamp':
      return `${e.nameGujarati} નો પાસપોર્ટ સ્ટેમ્પ મળ્યો`;
    case 'food':
      return `${e.nameGujarati} નો સ્વાદ માણ્યો`;
    case 'souvenir':
      return `${e.nameGujarati} ખરીદ્યું`;
    case 'quiz':
      return e.correct ? 'ક્વિઝનો સાચો જવાબ આપ્યો' : 'ક્વિઝમાં ખોટો જવાબ પડ્યો';
    case 'mission_done':
      return `${e.nameGujarati} નું મુસાફર-મિશન પૂરું કર્યું`;
    case 'refuel':
      return 'ડીઝલ પુરાવ્યું';
    case 'repair':
      return 'છકડો રીપેર કરાવ્યો';
    case 'overspeed':
      return `${e.zone} માં ઝડપ વધારે પડી ગઈ`;
    default:
      return '';
  }
}

// Traditional Kathiyawadi folk verses / proverbs (verifiable folklore, not invented).
const KAKA_DUHAS = [
  '"કાઠિયાવાડમાં કોક દી ભૂલો પડ ભગવાન,\nતો તારો કરું સત્કાર — સ્વર્ગ ભુલાવી દઉં શામળા!"\n— અસલ કાઠિયાવાડી મહેમાનગતિનો દુહો.',
  '"જ્યાં જ્યાં વસે એક ગુજરાતી, ત્યાં ત્યાં સદાકાળ ગુજરાત."\n— કવિ અરદેશર ખબરદારની અમર પંક્તિ.',
  '"પાણી પહેલાં પાળ બાંધવી."\n— જૂની કહેવત: મુસીબત આવે એ પહેલાં તૈયારી કરી લેવી. છકડામાં ડીઝલ પૂરું રાખજો, બાપા!',
];

// Light chhakaro humour — no factual claims.
const KAKA_JOKES = [
  'છકડાને પૂછ્યું, "થાક્યો?" તો કહે, "ના બાપા, હજી ડીઝલ બાકી છે!"',
  'છકડો ધીમો કેમ? — કારણ કે મંઝિલ ઉતાવળમાં નહીં, મોજમાં આવે!',
  'છકડાવાળાની ઘડિયાળ હંમેશા સાચી — જ્યાં પહોંચે ત્યાં જ સાચો સમય!',
];

function pickStable(arr: string[], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

// Full-coverage local Kanji Kaka responder — used when there is no API key or every model
// is under load. Grounded in the real per-location data (history / food / culture) and
// mode-aware; no invented facts.
function generateSmartKakaFallback(ctx: ReturnType<typeof normalizeGuideRequest>) {
  const loc = GUJARAT_LOCATIONS.find((l) => l.id === ctx.zone.id);
  const name = ctx.zone.nameGujarati || loc?.nameGujarati || 'ગુજરાત';
  const food = loc?.famousFood || ctx.famousFood;
  const q = (ctx.prompt || '').toLowerCase();
  const mode = ctx.mode;

  const wantJoke = /જોક|મજાક|હસાવ|રમૂજ|joke|funny/.test(q);
  const wantDuha = mode === 'duha' || /દુહો|કહેવત|શાયરી|જોડકણું|લોકગીત|duha|proverb|kahevat/.test(q);
  const wantDirections =
    mode === 'directions' || /રસ્તો|આગળ|દિશા|કેટલે દૂર|કેટલું દૂર|road|route|direction|how far/.test(q);
  const wantFood = mode === 'food' || /ખાવા|ખાણી|ખાણું|ફૂડ|વાનગી|નાસ્તો|સ્વાદ|food|eat|hungry/.test(q);
  const wantHistory =
    mode === 'story' || /ઇતિહાસ|ઈતિહાસ|history|વાર્તા|કહાની|પ્રસંગ|story/.test(q);

  if (wantJoke) {
    return { reply: `હેહે! ${pickStable(KAKA_JOKES, name)}`, kakaMood: 'cheerful', recommendedFood: food };
  }
  if (wantDuha) {
    return { reply: `સાંભળો ત્યારે:\n${pickStable(KAKA_DUHAS, name)}`, kakaMood: 'nostalgic', recommendedFood: food };
  }
  if (wantDirections) {
    const navLine = ctx.nav
      ? `${ctx.nav.targetNameGujarati} આશરે ${(Number(ctx.nav.distanceM) / 1000).toFixed(1)} કિમી દૂર છે. `
      : loc?.signboardText
        ? `સાઇનબોર્ડ કહે છે: "${loc.signboardText}". `
        : '';
    return {
      reply: `${navLine}આગળનો રસ્તો પહોળો છે — સ્ટીયરિંગ મજબૂત પકડો, હોર્ન વગાડતા રહો ને ડાહ્યા થઈને હંકારજો, બાપા!`,
      kakaMood: 'cheerful',
      recommendedFood: food,
    };
  }
  if (wantFood) {
    const desc = loc?.foodDescription ? ` ${loc.foodDescription}` : '';
    return {
      reply: `ખાવાના શોખીન લાગો છો! ${name} માં ${food} ખાધા વગર આગળ ન વધાય.${desc} સાથે કડક મસાલા ચા તો ખરી જ!`,
      kakaMood: 'hungry',
      recommendedFood: food,
    };
  }
  if (wantHistory && loc) {
    return {
      reply: `${loc.history} ${loc.passportStory}`.trim(),
      kakaMood: 'wise',
      recommendedFood: food,
    };
  }

  // Mode-aware default: greet + one grounded cultural note for this exact zone.
  const note = loc?.culturalHighlights?.[0] || loc?.landmarks?.[0];
  return {
    reply: `રામ રામ બાપા! કાનજી કાકો તમારી સાથે જ છે. અત્યારે આપણે ${name} માં છીએ${
      note ? ` — ${note} જોવા જેવું છે` : ''
    }. છકડો મસ્ત ચાલે છે, મોજ કરો!`,
    kakaMood: 'cheerful',
    recommendedFood: food,
  };
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Kanji Kaka AI Tour Guide endpoint with multi-model fallback & resilience.
// Accepts the full M2 KakaContext body (or the legacy body — both normalized below).
app.post('/api/gemini/guide', async (req, res) => {
  const ctx = normalizeGuideRequest(req.body);
  const localFallback = () => generateSmartKakaFallback(ctx);

  try {
    const ai = getAI();
    if (!ai) {
      // No API key in dev/preview — the local scripted responder carries the demo.
      return res.json(localFallback());
    }

    const modeLine = ctx.mode
      ? `\nમોડ: ${ctx.mode} — ${MODE_TONE[ctx.mode]}`
      : '';

    const systemInstruction = `
તમે "કાનજી કાકો" (Kanji Kaka) છો — સૌરાષ્ટ્રના છકડામાં યુઝરની બાજુમાં બેઠેલા અનુભવી, માયાળુ અને રમૂજી કાઠિયાવાડી ટૂર ગાઈડ. તમે માત્ર ત્યારે જ બોલતા નથી જ્યારે પૂછવામાં આવે — તમને પરિસ્થિતિની ખબર છે અને તમે સામેથી વાત કરો છો.

નિયમો:
1. હંમેશા અસલ કાઠિયાવાડી/ગુજરાતી લહેકામાં બોલો ("કાં ભાઈ!", "મોજમાં!", "બાપા", "અરે વાહ!", "ડાહ્યા થઈને હંકારજો").
2. નીચે આપેલા લાઇવ સંદર્ભ (ઝોન, નજીકનું સ્થળ, મિશન, નેવિગેશન, હવામાન, સમય, તાજેતરની ઘટનાઓ) નો ઉપયોગ કરીને જવાબ આપો — સામાન્ય નહીં, પરિસ્થિતિને અનુરૂપ.
3. ઐતિહાસિક કે સાંસ્કૃતિક હકીકત ચકાસી શકાય તેવી જ કહો — ખોટો ઇતિહાસ ક્યારેય ન બનાવો.
4. જવાબ ટૂંકો રાખો: ૨-૪ વાક્ય, મજેદાર અને માહિતીસભર.${modeLine}
5. ફક્ત આ JSON આપો, બીજું કંઈ નહીં:
{
  "reply": "કાનજી કાકાનો ગુજરાતી જવાબ",
  "kakaMood": "cheerful | wise | excited | hungry | nostalgic",
  "recommendedFood": "વાનગીનું નામ"
}
`;

    const eventLines = ctx.recentEvents.map(describeKakaEvent).filter(Boolean);
    const userMessage = `
લાઇવ સંદર્ભ:
- વર્તમાન ઝોન: ${ctx.zone.nameGujarati} (${ctx.zone.id}, વિસ્તાર: ${ctx.zone.region})
- નજીકનું જોવાલાયક સ્થળ: ${ctx.nearbyLandmarkId || 'કોઈ ખાસ નહીં'}
- છકડાની ઝડપ: ${ctx.speedKmh} km/h${ctx.inGirZone ? ' (ગીર ઝોન — ૨૫ ની લિમિટ)' : ''}
- હવામાન: ${ctx.weather}, સમય: ${ctx.timeOfDayPhase}
- મુલાકાત લીધેલ સ્થળો: ${ctx.visitedCount}/${ctx.totalLocations}
- સક્રિય મિશન: ${ctx.mission ? `${ctx.mission.titleGujarati} → ${ctx.mission.dropNameGujarati}` : 'કોઈ નહીં'}
- નેવિગેશન લક્ષ્ય: ${ctx.nav ? `${ctx.nav.targetNameGujarati}, આશરે ${(Number(ctx.nav.distanceM) / 1000).toFixed(1)} કિમી દૂર` : 'કોઈ નહીં'}
- તાજેતરની ઘટનાઓ: ${eventLines.length ? eventLines.join('; ') : 'કંઈ ખાસ નહીં'}

યુઝરનો પ્રશ્ન/વાતચીત: "${ctx.prompt || 'કાકા, આ સ્થળ વિશે કંઈક કહો ને!'}"
`;

    // Multi-model fallback sequence to handle temporary 503 high-demand spikes
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
    let rawText = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userMessage,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        rawText = response.text || '';
        if (rawText) break;
      } catch (err: any) {
        console.warn(`Model ${modelName} call failed (attempting fallback):`, err?.message || err);
      }
    }

    if (rawText) {
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText,
          kakaMood: 'cheerful',
          recommendedFood: ctx.famousFood,
        };
      }
      return res.json(parsed);
    }

    // All models under load / failed — serve the smart contextual Gujarati fallback.
    console.warn('All Gemini models temporarily unavailable, serving smart local guide fallback');
    return res.json(localFallback());
  } catch (error: any) {
    console.error('Gemini guide unexpected handler error:', error);
    return res.json(localFallback());
  }
});

// AI trip generator. body { request: string, context: KakaContext } ->
// { introGujarati, stops: [{ locationId, reasonGujarati }] }. Every returned locationId is
// validated against the 16 real locations; anything else falls back to the local planner.
app.post('/api/gemini/trip', async (req, res) => {
  const { request, context } = req.body || {};
  const requestText = typeof request === 'string' ? request : '';
  const fromId =
    (context && context.zone && typeof context.zone.id === 'string' && context.zone.id) || 'rajkot';
  const serveLocal = () => res.json(buildLocalTrip(requestText, fromId));

  try {
    const ai = getAI();
    if (!ai) return serveLocal();

    const idList = GUJARAT_LOCATIONS.map((l) => `${l.id} = ${l.nameGujarati}`).join('\n');
    const zoneLine = context?.zone?.nameGujarati ? `યુઝર અત્યારે ${context.zone.nameGujarati} માં છે.` : '';

    const systemInstruction = `
તમે "કાનજી કાકો" — ગુજરાતના છકડા ટૂર ગાઈડ. યુઝરની વિનંતી પ્રમાણે એક ક્રમબદ્ધ પ્રવાસ બનાવો.
ફક્ત નીચેની યાદીના locationId જ વાપરો, બીજું કોઈ નામ નહીં:
${idList}

નિયમો:
- ${TRIP_MIN_STOPS} થી ${TRIP_MAX_STOPS} સ્થળ, યુઝર જ્યાં છે ત્યાંથી ભૌગોલિક રીતે સમજદાર ક્રમમાં.
- દરેક સ્થળનું એક ટૂંકું ગુજરાતી કારણ (reasonGujarati).
- ચકાસી શકાય તેવી હકીકત જ; ખોટો ઇતિહાસ નહીં.
- ફક્ત આ JSON આપો:
{ "introGujarati": "...", "stops": [ { "locationId": "...", "reasonGujarati": "..." } ] }
`;

    const userMessage = `${zoneLine}\nવિનંતી: "${requestText || 'ગુજરાતની એક મસ્ત સફર'}"`;

    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
    let rawText = '';
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userMessage,
          config: { systemInstruction, responseMimeType: 'application/json' },
        });
        rawText = response.text || '';
        if (rawText) break;
      } catch (err: any) {
        console.warn(`Trip model ${modelName} failed (attempting fallback):`, err?.message || err);
      }
    }

    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        const seen = new Set<string>();
        const stops = (Array.isArray(parsed?.stops) ? parsed.stops : [])
          .filter((s: any) => s && VALID_LOCATION_IDS.has(s.locationId) && !seen.has(s.locationId))
          .map((s: any) => {
            seen.add(s.locationId);
            return {
              locationId: s.locationId as string,
              reasonGujarati:
                typeof s.reasonGujarati === 'string' && s.reasonGujarati.trim()
                  ? s.reasonGujarati.trim()
                  : 'આ સફરમાં જોવા જેવું સ્થળ.',
            };
          })
          .slice(0, TRIP_MAX_STOPS);

        if (stops.length >= TRIP_MIN_STOPS) {
          return res.json({
            introGujarati:
              typeof parsed.introGujarati === 'string' && parsed.introGujarati.trim()
                ? parsed.introGujarati.trim()
                : 'ચાલો, આ રહી તમારી સફર!',
            stops,
          });
        }
      } catch {
        // fall through to the local planner
      }
    }

    console.warn('Trip generation empty/invalid, serving local planner');
    return serveLocal();
  } catch (err: any) {
    console.error('Trip endpoint unexpected error:', err);
    return serveLocal();
  }
});

// Gemini TTS speech synthesis endpoint with fallback
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const ai = getAI();
    if (!ai) {
      return res.status(200).json({ audio: null, useFallback: true });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Speak in a friendly, enthusiastic Gujarati tone: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({ audio: null, useFallback: true });
    }

    res.json({ audio: base64Audio });
  } catch (err: any) {
    console.warn('TTS high demand or unavailable, falling back to Web Speech Synthesis:', err?.message || err);
    res.json({ audio: null, useFallback: true });
  }
});

// Setup Vite development middleware or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛺 Chhakaro Gujarat Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
