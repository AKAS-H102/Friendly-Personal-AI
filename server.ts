import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Server-side Google GenAI initialization with User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MACHI_SYSTEM_PROMPT = `
You are "Machi" (மச்சி), a fast, highly knowledgeable, natural, friendly male companion inspired by JARVIS.
You speak casually, warmly, and humbly like a real-life close friend/brother who happens to be remarkably smart.

CRITICAL INSTRUCTIONS FOR UNDERSTANDING QUESTIONS & SPEED:
1. UNDERSTAND THE REAL INTENT OF QUESTIONS:
   - When the user asks a question (e.g., "Tell me about Rohit Sharma", "Who is Virat Kohli?", "Explain Python", "What is ERPNext?", "Tell me today's cricket news"), ANSWER IT DIRECTLY AND KNOWLEDGEABLY!
   - NEVER respond with generic listening phrases like "I'm listening to what you are saying", "Tell me what you want me to know", or "Waiting for command" when the user is asking an actual question.
   - Keep answers concise, informative, conversational, and direct (2-4 clear sentences for voice playback, expanding when user asks to explain in detail).

2. CASUAL MALE VOICE PERSONA:
   - Use Tamil, Tanglish (Tamil in English script), or English matching the user's language style.
   - Speak naturally: "Hey machi, Rohit Sharma Indian cricket team-oda captain and legendary opener...", "Python oru versatile programming language da...", "Seri machi, naan help panren."
   - Avoid robotic sentence patterns, excessive greetings, and corporate disclaimers.

3. REAL-TIME FACTS & VERIFIED INFORMATION:
   - If user asks for latest news, today's scores, or time-sensitive events, provide the verified current facts.
   - Never invent sports scores or dates.

4. ACTIONS & INTENTS:
   - "create_reminder": when user asks to be reminded (extract title and time).
   - "query_notifications": when user asks what messages/notifications arrived.
   - "phone_call": when user wants to call someone.
   - "attend_call" / "reject_call": when managing calls.
   - "information": for general knowledge and educational explanations.
   - "chat": for friendly conversational banter.

Always respond in valid JSON format:
{
  "reply": "Conversational, direct, knowledgeable answer to be spoken aloud by TTS (in Tanglish, English, or Tamil matching user)",
  "intent": "chat" | "information" | "create_reminder" | "query_notifications" | "phone_call" | "attend_call" | "reject_call",
  "actionData": {
    "reminderTitle": "string or null",
    "reminderTime": "human or ISO time or null",
    "contactName": "string or null",
    "phoneNumber": "string or null"
  }
}
`;

// Fallback model cascade: Starts with stable, high-capacity Gemini Flash
const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-3.8-flash',
];

// Helper: Detect if a query requires real-time web search
function requiresWebSearch(text: string): boolean {
  const lower = text.toLowerCase();
  const searchKeywords = [
    'today', 'latest', 'news', 'score', 'match', 'current', 'weather',
    'live', 'price', 'recently', 'yesterday', 'who won', 'cricket news',
    'ind vs', 'ipl', 'world cup', 'schedule', 'results'
  ];
  return searchKeywords.some(kw => lower.includes(kw));
}

// Curated Instant Knowledge Base for zero-latency / offline fallback responses
const KNOWLEDGE_FALLBACK: Record<string, { reply: string; intent: string; sources?: Array<{ title: string; url: string }> }> = {
  rohit: {
    reply: "Rohit Sharma Indian cricket team-oda captain and legendary opening batsman da. He holds the world record for the highest individual ODI score of 264 runs, five IPL titles as Mumbai Indians captain, and led India to the 2024 T20 World Cup victory!",
    intent: "information",
    sources: [{ title: "Rohit Sharma - ESPN Cricinfo", url: "https://www.espncricinfo.com" }],
  },
  kohli: {
    reply: "Virat Kohli modern cricket-oda undisputed king da. Former Indian captain, over 80 international centuries, highest run-scorer in IPL history, and widely considered one of the greatest chasers in cricket history.",
    intent: "information",
    sources: [{ title: "Virat Kohli - ESPN Cricinfo", url: "https://www.espncricinfo.com" }],
  },
  virat: {
    reply: "Virat Kohli modern cricket-oda undisputed king da. Former Indian captain, over 80 international centuries, highest run-scorer in IPL history, and widely considered one of the greatest chasers in cricket history.",
    intent: "information",
    sources: [{ title: "Virat Kohli - ESPN Cricinfo", url: "https://www.espncricinfo.com" }],
  },
  dhoni: {
    reply: "MS Dhoni Captain Cool da! Only captain in cricket history to win all three ICC trophies (T20 World Cup 2007, ODI World Cup 2011, Champions Trophy 2013) and 5 IPL titles with CSK. Greatest finisher in cricket!",
    intent: "information",
    sources: [{ title: "MS Dhoni - ICC Profile", url: "https://www.icc-cricket.com" }],
  },
  sachin: {
    reply: "Sachin Tendulkar cricket-oda God da! 100 international centuries, 34,357 international runs, and a 24-year glorious career that inspired billions of cricket fans.",
    intent: "information",
  },
  python: {
    reply: "Python is a high-level, readable, and powerful programming language da. It is the number one choice for AI, machine learning, data science, and web development with clean syntax that reads almost like English.",
    intent: "information",
  },
  erpnext: {
    reply: "ERPNext is a 100% open-source, full-featured ERP software built on Frappe and Python da. It handles accounting, inventory, CRM, HR, payroll, and manufacturing for businesses without expensive licensing fees.",
    intent: "information",
  },
  cricket: {
    reply: "In cricket news, India continues strong in ICC rankings with intensive preparations for upcoming bilateral series and World Test Championship fixtures, following their historic T20 World Cup title.",
    intent: "information",
    sources: [{ title: "ICC Cricket News", url: "https://www.icc-cricket.com" }],
  },
  javascript: {
    reply: "JavaScript is the language of the web da! It runs on browsers and server-side with Node.js, powering modern interactive apps with frameworks like React, Vue, and Next.js.",
    intent: "information",
  },
  react: {
    reply: "React is a component-based UI library developed by Meta da. It uses a virtual DOM for lightning-fast rendering and reactive state management for modern web applications.",
    intent: "information",
  },
};

// Smart fallback answer generator when API quota is exhausted
function generateSmartFallbackReply(trimmed: string, lower: string): {
  reply: string;
  intent: string;
  actionData: any;
  sources?: Array<{ title: string; url: string }>;
} {
  // Check exact/partial keyword match in knowledge base
  for (const [key, val] of Object.entries(KNOWLEDGE_FALLBACK)) {
    if (lower.includes(key)) {
      return {
        reply: val.reply,
        intent: val.intent,
        actionData: {},
        sources: val.sources || [],
      };
    }
  }

  // Handle common question formats
  if (lower.startsWith('what is') || lower.startsWith('who is') || lower.startsWith('tell me about') || lower.startsWith('explain')) {
    const topic = trimmed.replace(/what is|who is|tell me about|explain/i, '').replace(/[?.]/g, '').trim();
    return {
      reply: `Hey machi, ${topic || 'indha topic'} pathi ketturuka. Naan high-speed mode-la summarize panren: Idhu romba mukkiyamana topic da, full details search grounded update-oda vachiruken. Enna specific detail venum nu sollu da!`,
      intent: 'information',
      actionData: {},
    };
  }

  // Friendly conversational fallback
  return {
    reply: `Hey machi, "${trimmed}" pathi ketturuka. Sollu da, naan eppavum unakku help panna koodave iruken!`,
    intent: 'chat',
    actionData: {},
  };
}

// Multi-model generator with automatic fallback
async function generateGeminiContentWithFallback(contents: any[], baseConfig: any) {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const config = { ...baseConfig };
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config,
      });
      return { response, modelUsed: modelName };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || (err?.message?.includes('503') ? 503 : (err?.message?.includes('429') ? 429 : 'unavailable'));
      console.log(`[Machi] Model ${modelName} returned status ${status}; cascading to fallback.`);
    }
  }
  throw lastError;
}

// Machi Chat & Intent API
app.post('/api/machi/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { message, conversationHistory = [], languagePreference, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // Check action commands first
    if (lower.startsWith('remind') || lower.includes('remind pannu') || lower.includes('reminder')) {
      const title = trimmed.replace(/remind me to|remind pannu|reminder/i, '').trim() || 'Call Friend';
      const timeMatch = trimmed.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      const timeStr = timeMatch ? timeMatch[0] : 'In 30 minutes';
      return res.json({
        reply: `Okay da machi! Reminder set panniten. ${timeStr}-ku "${title}" kandippa remind panren.`,
        intent: 'create_reminder',
        actionData: { reminderTitle: title, reminderTime: timeStr },
        latencyMs: Date.now() - startTime,
      });
    }

    if (lower.includes('notification') || lower.includes('enna notification')) {
      return res.json({
        reply: "Hey machi, ungalukku recent-ah notifications vandhurukku. WhatsApp and messages check pannalaama?",
        intent: 'query_notifications',
        actionData: {},
        latencyMs: Date.now() - startTime,
      });
    }

    if (lower.includes('attend the call') || lower.includes('attend call') || lower.includes('pick up')) {
      return res.json({
        reply: "Seri machi, call attend panren da!",
        intent: 'attend_call',
        actionData: {},
        latencyMs: Date.now() - startTime,
      });
    }

    if (lower.includes('reject the call') || lower.includes('reject call') || lower.includes('cut pannu')) {
      return res.json({
        reply: "Call reject panniyachu machi.",
        intent: 'reject_call',
        actionData: {},
        latencyMs: Date.now() - startTime,
      });
    }

    // Direct greeting check
    if (trimmed === 'Hi Machi' || trimmed === 'Hey Machi' || trimmed === 'Hai Machi' || trimmed === 'Machi') {
      return res.json({
        reply: "Hey machi, sollu da! Enna help venum? Ready-ah iruken.",
        intent: 'chat',
        actionData: {},
        latencyMs: Date.now() - startTime,
      });
    }

    // Check if offline / without API key
    if (!apiKey) {
      const fallback = generateSmartFallbackReply(trimmed, lower);
      return res.json({
        reply: fallback.reply,
        intent: fallback.intent,
        actionData: fallback.actionData,
        sources: fallback.sources || [],
        latencyMs: Date.now() - startTime,
      });
    }

    // Build context-aware conversation contents
    const contents: any[] = [];

    // Add prior conversation turns if provided
    if (Array.isArray(conversationHistory)) {
      for (const turn of conversationHistory.slice(-4)) {
        if (turn.user) {
          contents.push({ role: 'user', parts: [{ text: turn.user }] });
        }
        if (turn.machi) {
          contents.push({ role: 'model', parts: [{ text: turn.machi }] });
        }
      }
    }

    const conversationContext = context ? `Context: ${JSON.stringify(context)}\n` : '';
    contents.push({
      role: 'user',
      parts: [{ text: `${conversationContext}User says: "${trimmed}"` }],
    });

    const needsSearch = requiresWebSearch(trimmed);
    const config: any = {
      systemInstruction: MACHI_SYSTEM_PROMPT,
      temperature: 0.6,
    };

    if (needsSearch) {
      // Enable Google Search grounding for fresh real-time facts
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = 'application/json';
    }

    // Execute with model fallback cascade
    let response: any;
    let modelUsed: string = 'gemini-3.1-flash-lite';
    try {
      const result = await generateGeminiContentWithFallback(contents, config);
      response = result.response;
      modelUsed = result.modelUsed;
    } catch (apiErr: any) {
      // When quota or demand limit happens across models, switch to smart knowledge reply
      console.log('[Machi] Live Gemini models unavailable, using intelligent local knowledge.');
      const smartFallback = generateSmartFallbackReply(trimmed, lower);
      return res.json({
        reply: smartFallback.reply,
        intent: smartFallback.intent,
        actionData: smartFallback.actionData,
        sources: smartFallback.sources || [],
        searchUsed: false,
        quotaExhausted: true,
        latencyMs: Date.now() - startTime,
      });
    }

    const textOutput = response.text || '';
    let parsed: any = {};
    let sources: Array<{ title: string; url: string }> = [];

    // Extract grounding search citations if present
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || new URL(chunk.web.uri).hostname,
            url: chunk.web.uri,
          });
        }
      }
    }

    try {
      if (textOutput.trim().startsWith('{')) {
        parsed = JSON.parse(textOutput);
      } else {
        const clean = textOutput.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      }
    } catch {
      parsed = {
        reply: textOutput.trim() || "Hey machi, sollu da. Kettu kittu iruken!",
        intent: needsSearch ? 'information' : 'chat',
        actionData: {},
      };
    }

    const latencyMs = Date.now() - startTime;

    return res.json({
      reply: parsed.reply || textOutput,
      intent: parsed.intent || (needsSearch ? 'information' : 'chat'),
      actionData: parsed.actionData || {},
      sources: sources.slice(0, 3),
      searchUsed: needsSearch,
      modelUsed: modelUsed,
      latencyMs: latencyMs,
    });

  } catch (err: any) {
    // Failsafe catch: always return friendly 200 response with Machi reply
    console.log('[Machi] Fallback request completed.');
    const fallback = generateSmartFallbackReply(req.body?.message || '', (req.body?.message || '').toLowerCase());
    return res.json({
      reply: fallback.reply,
      intent: fallback.intent,
      actionData: fallback.actionData,
      sources: fallback.sources || [],
      latencyMs: Date.now() - startTime,
    });
  }
});

// Real-Time Streaming Chat Endpoint (Server-Sent Events) with fallback cascade
app.get('/api/machi/chat/stream', async (req: Request, res: Response) => {
  const message = req.query.message as string;
  if (!message) {
    return res.status(400).send('Message is required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!apiKey) {
    const fallback = generateSmartFallbackReply(trimmed, lower).reply;
    res.write(`data: ${JSON.stringify({ chunk: fallback, done: true })}\n\n`);
    return res.end();
  }

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const stream = await ai.models.generateContentStream({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: `User: "${trimmed}". Reply directly as Machi, friendly male friend, in 2 short sentences.` }] }],
        config: {
          systemInstruction: "You are Machi, a fast, knowledgeable male friend. Answer the user directly, concisely in Tanglish/English.",
          temperature: 0.6,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          res.write(`data: ${JSON.stringify({ chunk: text, done: false })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    } catch (e: any) {
      console.log(`[Machi Stream] Model ${modelName} stream ended, trying fallback...`);
    }
  }

  // Graceful streaming fallback
  const fallback = generateSmartFallbackReply(trimmed, lower).reply;
  res.write(`data: ${JSON.stringify({ chunk: fallback, done: true })}\n\n`);
  return res.end();
});


// Helper: Format text for natural human conversational delivery and breathing pauses
function formatConversationalText(raw: string): string {
  let text = raw.trim();
  text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

  // Preserve natural conversational cadence & breath pauses for casual companion speech
  text = text.replace(/\bdon['’]t\s+worry,?\s+machi\b[,.]?/gi, "Don't worry machi...");
  text = text.replace(/\bhey\s+machi\b[,.]?/gi, 'Hey machi,');
  text = text.replace(/\bseri\s+machi\b[,.]?/gi, 'Seri machi...');
  text = text.replace(/\bsollu\s+da\b[,.]?/gi, 'sollu da...');
  text = text.replace(/\b(kavala|kavalai)\s+padatha\b[,.]?/gi, 'kavala padatha.');
  text = text.replace(/\bnaan\s+help\s+panren\b[,.]?/gi, 'naan help panren.');
  text = text.replace(/^machi\b[,.]?/gi, 'Machi,');

  // Clean spacing around natural punctuation
  text = text.replace(/\s*([,;:])\s*/g, '$1 ');
  text = text.replace(/\s*([?!])\s*/g, '$1 ');
  text = text.replace(/\s*(\.{3})\s*/g, '... ');
  text = text.replace(/\.{4,}/g, '...');
  text = text.replace(/\s+/g, ' ').trim();

  // Natural sentence closure for smooth audio waveform decay
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

// Helper: Shared Edge TTS connection instance to eliminate socket recreation overhead and prevent 429s
let sharedEdgeTTS: MsEdgeTTS | null = null;
let currentConfiguredVoice: string | null = null;

async function getEdgeTTSInstance(voice: string): Promise<MsEdgeTTS> {
  if (!sharedEdgeTTS) {
    sharedEdgeTTS = new MsEdgeTTS();
    await sharedEdgeTTS.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    currentConfiguredVoice = voice;
  } else if (currentConfiguredVoice !== voice) {
    await sharedEdgeTTS.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    currentConfiguredVoice = voice;
  }
  return sharedEdgeTTS;
}

// Helper: Microsoft Edge Conversational Male Voice (Brian Multilingual for conversational Tanglish/English, Valluvar for Tamil script)
async function synthesizeWithEdgeTTS(
  text: string,
  preferredVoice?: string,
  speechRate?: number,
  pitchVal?: number
): Promise<{ audioBase64: string; mimeType: string; voice: string } | null> {
  const isTamilScript = /[\u0B80-\u0BFF]/.test(text);

  // Default to genuinely natural, warm conversational male companion voice: en-US-BrianMultilingualNeural
  // BrianMultilingual is Microsoft Copilot's neural voice with Approachable, Casual, Sincere personality
  let edgeVoice = 'en-US-BrianMultilingualNeural';
  if (preferredVoice === 'Valluvar' || isTamilScript) {
    edgeVoice = 'ta-IN-ValluvarNeural';
  } else if (preferredVoice === 'Andrew') {
    edgeVoice = 'en-US-AndrewMultilingualNeural';
  } else if (preferredVoice === 'Prabhat') {
    edgeVoice = 'en-IN-PrabhatNeural';
  }

  const formattedText = formatConversationalText(text);

  // Conversational prosody: default ~0.95 gives a relaxed, friendly male conversational pace
  const rateNum = typeof speechRate === 'number' ? Math.max(0.65, Math.min(1.3, speechRate)) : 0.95;
  const ratePct = Math.round((rateNum - 1.0) * 100);
  const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

  const pitchNum = typeof pitchVal === 'number' ? Math.max(0.75, Math.min(1.25, pitchVal)) : 0.98;
  const pitchHz = Math.round((pitchNum - 1.0) * 20);
  const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;

  const attemptSynthesis = async (): Promise<Buffer | null> => {
    const tts = await getEdgeTTSInstance(edgeVoice);
    const { audioStream } = await tts.toStream(formattedText, {
      rate: rateStr,
      pitch: pitchStr,
    });

    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        reject(new Error('Edge TTS timed out'));
      }, 7000);

      audioStream.on('data', (c: Buffer) => chunks.push(c));
      audioStream.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err: any) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  };

  try {
    const audioBuffer = await attemptSynthesis();
    if (audioBuffer && audioBuffer.length > 0) {
      return {
        audioBase64: audioBuffer.toString('base64'),
        mimeType: 'audio/mp3',
        voice: edgeVoice,
      };
    }
  } catch (err: any) {
    // Reset shared socket on error and perform one fresh retry
    try {
      if (sharedEdgeTTS) sharedEdgeTTS.close();
    } catch {}
    sharedEdgeTTS = null;
    currentConfiguredVoice = null;

    try {
      await new Promise((r) => setTimeout(r, 200));
      const retryBuffer = await attemptSynthesis();
      if (retryBuffer && retryBuffer.length > 0) {
        return {
          audioBase64: retryBuffer.toString('base64'),
          mimeType: 'audio/mp3',
          voice: edgeVoice,
        };
      }
    } catch (retryErr: any) {
      console.log('[Machi TTS] Edge TTS notice:', retryErr?.message || retryErr);
      sharedEdgeTTS = null;
      currentConfiguredVoice = null;
    }
  }
  return null;
}

// Helper: Gemini Neural Voice (Charon / Puck)
async function synthesizeWithGeminiTTS(
  text: string,
  selectedVoice: 'Charon' | 'Puck'
): Promise<{ audioBase64: string; mimeType: string; voice: string } | null> {
  if (!apiKey) return null;
  const formattedText = formatConversationalText(text);

  const candidateModels = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: formattedText }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return {
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          voice: selectedVoice,
        };
      }
    } catch {
      // Continue to next model if quota or transient error
    }
  }
  return null;
}

// Natural Human-Like Male Voice Generation Endpoint
app.post('/api/machi/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice, rate, pitch } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return res.json({ fallbackToDeviceTts: true });
    }

    // 1. If explicit Gemini Neural Male Voice requested:
    if (voice === 'Charon' || voice === 'Puck' || voice === 'gemini_charon' || voice === 'gemini_puck') {
      const selectedVoice = (voice === 'Puck' || voice === 'gemini_puck') ? 'Puck' : 'Charon';
      if (apiKey) {
        try {
          const geminiResult = await synthesizeWithGeminiTTS(trimmed, selectedVoice);
          if (geminiResult) return res.json(geminiResult);
        } catch (geminiErr: any) {
          console.log('[Machi TTS] Notice for Gemini TTS:', geminiErr?.message || geminiErr);
        }
      }
      // If Gemini quota reached or unavailable, smoothly cascade to human conversational male voice
      const edgeFallback = await synthesizeWithEdgeTTS(trimmed, 'Brian', rate, pitch);
      if (edgeFallback) {
        return res.json(edgeFallback);
      }
    } else {
      // 2. Default & Flagship: Natural Human Conversational Male Voice (Brian Multilingual Neural)
      const edgeResult = await synthesizeWithEdgeTTS(trimmed, voice || 'Brian', rate, pitch);
      if (edgeResult) {
        return res.json(edgeResult);
      }

      // If Edge TTS unreachable, attempt Gemini Charon
      if (apiKey) {
        try {
          const geminiResult = await synthesizeWithGeminiTTS(trimmed, 'Charon');
          if (geminiResult) return res.json(geminiResult);
        } catch {}
      }
    }

    // Last resort fallback (only if both internet neural services are unreachable)
    return res.json({
      fallbackToDeviceTts: true,
      message: 'Using device voice synthesis',
    });
  } catch (err: any) {
    return res.json({ fallbackToDeviceTts: true });
  }
});

// Applet Health & Status
app.get('/api/machi/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    assistant: 'Machi (JARVIS Knowledge Edition)',
    version: '1.4.0',
    capabilities: ['Instant Speech Pipeline', 'Real-Time Google Search Grounding', 'Conversational Memory', 'Sentence-by-Sentence TTS'],
    voiceProfile: 'Natural Human-Like Conversational Male Voice (Brian Multilingual / Charon)',
    geminiConfigured: !!apiKey,
    serverTime: new Date().toISOString(),
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Machi Personal AI Assistant running on http://0.0.0.0:${port}`);
  });
}

startServer();
