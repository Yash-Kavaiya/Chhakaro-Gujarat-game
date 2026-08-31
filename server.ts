import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

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
    // a currentLocation-shaped object the local fallback can branch on
    fallbackLocation: legacyLoc || { id: zone.id, nameGujarati: zone.nameGujarati, region: zone.region, famousFood },
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

// Contextual fallback response generator for Kanji Kaka when model is under high load
function generateSmartKakaFallback(
  prompt: string = '',
  currentLocation: any = {},
  speed: number = 0,
  weather: string = 'sunny'
) {
  const query = (prompt || '').toLowerCase();
  const locName = currentLocation?.nameGujarati || 'ગુજરાતના રસ્તે';
  const food = currentLocation?.famousFood || 'કાઠિયાવાડી ગાંઠિયા અને ગરમ ચા';

  let reply = '';
  let mood = 'cheerful';

  if (query.includes('ઇતિહાસ') || query.includes('history') || query.includes('વાત')) {
    if (currentLocation?.id === 'dwarka') {
      reply = `અરે બાપા! આ તો આપણી દ્વારિકા નગરી! ભગવાન શ્રીકૃષ્ણ મથુરાથી અહીં આવ્યા ને સુવર્ણ દ્વારકા બનાવી. અહીં ૫૨ ગજની ધ્વજા દર્શનનું બહુ પુણ્ય મળે છે!`;
    } else if (currentLocation?.id === 'somnath') {
      reply = `હર હર મહાદેવ! સોમનાથ એ બાર જ્યોતિર્લિંગમાં સર્વપ્રથમ છે. ચંદ્રદેવે અહીં મહાદેવની તપસ્યા કરી હતી. બાણસ્તંભ અહીંથી દક્ષિણ ધ્રુવ સુધીનો સીધો સમુદ્ર માર્ગ બતાવે છે!`;
    } else if (currentLocation?.id === 'gir') {
      reply = `કાં ભાઈ! સાસણ ગીર એટલે આપણા એશિયાટિક સાવજનો અસલ દેશ! અહીં આપણો છકડો ૨૫ કિમીની લિમિટમાં ધીમે હંકારવાનો, જેથી વનરાજોને ખલેલ ન પહોંચે!`;
    } else if (currentLocation?.id === 'junagadh') {
      reply = `જૂનાગઢ એટલે ઐતિહાસિક ઉપરકોટ અને ૯,૯૯૯ પગથિયાંવાળો ગિરનાર! સંતો, શૂરવીરો અને ગરવા ગિરનારની ભૂમિમાં તમારું સ્વાગત છે બાપા!`;
    } else if (currentLocation?.id === 'kutch') {
      reply = `કચ્છ નહિ દેખા તો કુછ નહિ દેખા! શ્વેત રણમાં ચાંદની રાતે મીઠાની ચાદર હીરાની જેમ ચમકે છે. અહીં કચ્છી ભૂંગા અને રણોત્સવની રોનક જોવા જેવી હોય છે!`;
    } else if (currentLocation?.id === 'statue_of_unity') {
      reply = `આ છે આપણા લોખંડી પુરુષ સરદાર વલ્લભભાઈ પટેલનું ૧૮૨ મીટર ઊંચું સ્ટેચ્યુ ઓફ યુનિટી! ૫૬૨ રજવાડાંને એક કરનાર અખંડ ભારતના શિલ્પીને વંદન!`;
    } else {
      reply = `અરે વાહ! ${locName} નો ઇતિહાસ બહુ ગૌરવશાળી છે. આપણા ગુજરાતની ધરતી સંતો, દાતારો અને શૂરવીરોની ભૂમિ છે બાપા!`;
    }
    mood = 'wise';
  } else if (query.includes('ખાવા') || query.includes('ફૂડ') || query.includes('વાનગી') || query.includes('food')) {
    reply = `ખાવાના શોખીન લાગો છો! અત્યારે આપણે ${locName} માં છીએ, એટલે અહીં ${food} નો સ્વાદ લીધા વિના આગળ ન વધાય! સાથે એક કડક મસાલા ચા થઈ જાય તો દિવસ સુધરી જાય!`;
    mood = 'hungry';
  } else if (query.includes('દુહો') || query.includes('કહેવત') || query.includes('ગીત') || query.includes('શાયરી')) {
    reply = `સાંભળો ત્યારે અસલ કાઠિયાવાડી રંગ:\n"કાઠિયાવાડમાં કોક દી ભુલો પડ ભગવાન,\nતો તારો કરું સત્કાર, સ્વર્ગ ભુલાવી દઉં શામળા!"\nજય ગરવી ગુજરાત!`;
    mood = 'excited';
  } else if (query.includes('રસ્તો') || query.includes('આગળ') || query.includes('road')) {
    reply = `આગળનો હાઈવે મસ્ત પહોળો છે! બસ છકડાનું સ્ટીયરિંગ મજબૂત પકડી રાખજો અને હોર્ન વગાડતા રહેજો! છકડો તો હવા સાથે વાતો કરશે!`;
    mood = 'cheerful';
  } else {
    reply = `રામ રામ બાપા! હું કાનજી કાકો તમારી સાથે જ છું. ${locName} ની મુસાફરીમાં મોજ કરો, છકડો મસ્ત ચાલે છે અને હવામાન પણ ખુશનુમા છે!`;
    mood = 'cheerful';
  }

  return {
    reply,
    kakaMood: mood,
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
  const localFallback = () =>
    generateSmartKakaFallback(ctx.prompt, ctx.fallbackLocation, ctx.speedKmh, ctx.weather);

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
