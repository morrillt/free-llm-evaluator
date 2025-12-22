import { NextRequest } from 'next/server';
import { evaluateModelStream } from '@/lib/evaluator';
import { getSettings } from '@/lib/storage';
import { Message } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { modelId, messages } = await req.json();
  const settings = await getSettings();

  const stream = new ReadableStream({
    async start(controller) {
      const generator = evaluateModelStream(modelId, messages as Message[], settings);
      
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
