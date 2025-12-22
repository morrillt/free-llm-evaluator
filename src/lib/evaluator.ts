import { Message, ModelOverride, Settings } from './types';

export interface StreamChunk {
  modelId: string;
  content?: string;
  error?: string;
  isDone: boolean;
  metrics?: {
    duration: number;
    tokenCount: number;
    tps: number;
  };
}

export async function* evaluateModelStream(
  modelId: string,
  messages: Message[],
  settings: Settings
): AsyncGenerator<StreamChunk> {
  const override = settings.modelOverrides[modelId] || {};
  const systemPrompt = override.systemPrompt || settings.globalSystemPrompt;
  const temperature = override.temperature ?? settings.globalTemperature;
  const thinkingEnabled = override.thinkingEnabled ?? settings.globalThinkingEnabled;
  const thinkingBudget = override.thinkingBudget ?? settings.globalThinkingBudget;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const startTime = Date.now();
  let tokenCount = 0;
  let fullContent = '';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Free LLM Evaluator',
      },
      body: JSON.stringify({
        model: modelId,
        messages: fullMessages,
        temperature,
        stream: true,
        ...(thinkingEnabled && {
          include_reasoning: true,
          thinking: {
            type: 'enabled',
            budget_tokens: thinkingBudget,
          },
        }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status} ${errorText}`;
      
      if (errorText.includes('data policy') || errorText.includes('Free model publication')) {
        errorMessage = 'Data policy error: You must enable "Free model publication" in your OpenRouter privacy settings to use this model. Visit https://openrouter.ai/settings/privacy';
      }
      
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices[0]?.delta;
            const content = delta?.content || delta?.reasoning || '';
            
            if (content) {
              fullContent += content;
              tokenCount += 1; // Simplistic token count
              yield {
                modelId,
                content,
                isDone: false,
              };
            }
          } catch (e) {
            console.error('Error parsing stream chunk', e);
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    const tps = tokenCount / (duration / 1000);

    yield {
      modelId,
      isDone: true,
      metrics: {
        duration,
        tokenCount,
        tps: parseFloat(tps.toFixed(2)),
      },
    };
  } catch (error: any) {
    yield {
      modelId,
      error: error.message,
      isDone: true,
    };
  }
}
