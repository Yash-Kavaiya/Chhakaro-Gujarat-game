import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client with telemetry header & validation
let aiClient: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;
let isKeyMarkedInvalid = false;

function isValidApiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'YOUR_API_KEY' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'PLACEHOLDER' ||
    trimmed.length < 10
  ) {
    return false;
  }
  return true;
}

function getAI(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY?.trim();
  if (!isValidApiKey(currentKey)) {
    return null;
  }
  if (currentKey !== lastApiKey) {
    lastApiKey = currentKey;
    isKeyMarkedInvalid = false;
    aiClient = new GoogleGenAI({
      apiKey: currentKey!,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  if (isKeyMarkedInvalid) {
    return null;
  }
  return aiClient;
}

function handleAiApiError(err: any, endpointName: string) {
  const errMsg = err?.message || String(err || '');
  const isKeyError =
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('API key not valid') ||
    errMsg.includes('API_KEY') ||
    err?.status === 400 ||
    err?.code === 400;

  if (isKeyError) {
    isKeyMarkedInvalid = true;
    console.warn(`[Gemini API] Invalid or unconfigured API key during ${endpointName}. Falling back to browser speech synthesis.`);
  } else {
    console.warn(`[Gemini API] ${endpointName} request notice:`, errMsg);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
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
    handleAiApiError(err, 'TTS');
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
