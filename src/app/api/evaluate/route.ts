import { NextRequest } from 'next/server';
import { evaluateModelStream } from '@/lib/evaluator';
import { getSettings } from '@/lib/storage';
import { Message } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { modelId, messages, isJokeMode, settings: bodySettings } = await req.json();
  const settings = bodySettings || await getSettings();

  // If joke mode, override settings with joke prompt
  const effectiveSettings = isJokeMode ? {
    ...settings,
    globalSystemPrompt: settings.jokeSystemPrompt || process.env.JOKE_SYSTEM_PROMPT || settings.globalSystemPrompt,
    // We keep modelOverrides now so thinking params etc. work
  } : settings;

  const stream = new ReadableStream({
    async start(controller) {
      const generator = evaluateModelStream(modelId, messages as Message[], effectiveSettings);
      
      for await (const chunk of generator) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(chunk) + '\n'));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}


