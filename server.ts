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

// Kanji Kaka AI Tour Guide endpoint with multi-model fallback & resilience
app.post('/api/gemini/guide', async (req, res) => {
  const { prompt, currentLocation, visitedLocations, speed, weather, timeOfDay } = req.body || {};

  try {
    const ai = getAI();

    if (!ai) {
      // Fallback if no API key provided in dev/preview
      return res.json(generateSmartKakaFallback(prompt, currentLocation, speed, weather));
    }

    const systemInstruction = `
તમે "કાનજી કાકો" (Kanji Kaka) છો — એક અનુભવી, માયાળુ, રમૂજી અને કાઠિયાવાડી બોલી બોલતા ગુજરાતી છકડા ટૂર ગાઈડ.
તમે યુઝર સાથે ગુજરાતના વિવિધ પ્રખ્યાત સ્થળો (Rajkot, Dwarka, Somnath, Gir Forest, Junagadh, Rann of Kutch, Statue of Unity, Saputara, Ahmedabad, Surat વગેરે) ની સફર પર છો.

નિયમો:
1. હંમેશા શુદ્ધ કાઠિયાવાડી/ગુજરાતી રંગમાં બોલો (જેમ કે: "કાં ભાઈ!", "મોજમાં!", "બાપા", "ડાહ્યા થઈને ચલાવજો", "અરે વાહ!").
2. વર્તમાન સ્થળ (${currentLocation?.nameGujarati || 'ગુજરાત'}, ${currentLocation?.region || 'સૌરાષ્ટ્ર'}) ના ઇતિહાસ, વિશેષતા, સ્થાનિક વાનગીઓ અને સંસ્કૃતિ વિશે રોચક માહિતી આપો.
3. જવાબ વધુ પડતો લાંબો ન બનાવો (૨-૪ વાક્યોમાં મજેદાર અને માહિતીસભર).
4. જો યુઝરે ખાવા-પીવા વિશે પૂછ્યું હોય, તો તે વિસ્તારની અસલ દેશી વાનગીઓ બતાવો.
5. પ્રત્યુત્તર JSON ફોર્મેટમાં આપો:
{
  "reply": "કાનજી કાકાનો ગુજરાતી જવાબ",
  "kakaMood": "cheerful | wise | excited | hungry | nostalgic",
  "recommendedFood": "વાનગીનું નામ"
}
`;

    const userMessage = `
વર્તમાન સ્થળ: ${currentLocation?.nameGujarati || 'રસ્તામાં'} (${currentLocation?.nameEnglish || 'On Road'})
વિસ્તાર: ${currentLocation?.region || 'ગુજરાત'}
ઝડપ: ${speed || 0} km/h
હવામાન: ${weather || 'sunny'}, સમય: ${timeOfDay || 'day'}
અગાઉ મુલાકાત લીધેલ સ્થળો: ${(visitedLocations || []).join(', ')}

યુઝરનો પ્રશ્ન/વાતચીત: "${prompt || 'કાકા, આ સ્થળ વિશે કંઈક કહો ને!'}"
`;

    // Multi-model fallback sequence to handle temporary 503 high-demand spikes
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
    let lastError = null;
    let rawText = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userMessage,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.8,
          },
        });

        rawText = response.text || '';
        if (rawText) break;
      } catch (err: any) {
        lastError = err;
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
          recommendedFood: currentLocation?.famousFood || 'કાઠિયાવાડી ગાંઠિયા',
        };
      }
      return res.json(parsed);
    }

    // If all models encountered high load or failed, seamlessly return the smart contextual Gujarati fallback
    console.warn('All Gemini models temporarily unavailable, serving smart local guide fallback');
    return res.json(generateSmartKakaFallback(prompt, currentLocation, speed, weather));
  } catch (error: any) {
    console.error('Gemini guide unexpected handler error:', error);
    return res.json(generateSmartKakaFallback(prompt, currentLocation, speed, weather));
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
