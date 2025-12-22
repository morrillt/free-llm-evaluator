import { Message, ModelOverride, Settings } from './types';

export interface StreamChunk {
  modelId: string;
  content?: string;
  thinkingContent?: string;
  error?: string;
  isDone: boolean;
  metrics?: {
    duration: number;
    ttft?: number;
    tokenCount: number;
    thinkingDuration?: number;
    thinkingTokenCount?: number;
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

  let effectiveSystemPrompt = systemPrompt;
  if (thinkingEnabled && thinkingBudget > 0) {
    effectiveSystemPrompt += `\n\n[IMPORTANT: Keep your internal reasoning/thinking extremely concise. Aim for under ${thinkingBudget} tokens of reasoning.]`;
  }

  const fullMessages = [
    { role: 'system', content: effectiveSystemPrompt },
    ...messages,
  ];

  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  let lastThinkingTokenTime: number | null = null;
  let tokenCount = 0;
  let thinkingTokenCount = 0;
  let charCount = 0;
  let thinkingCharCount = 0;
  let fullContent = '';
  let fullThinkingContent = '';

  const body: any = {
    model: modelId,
    messages: fullMessages,
    temperature,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (thinkingEnabled) {
    body.reasoning = {
      max_tokens: thinkingBudget,
      exclude: false,
      enabled: true
    };
    // Top-level max_tokens must be > reasoning budget for many providers
    body.max_tokens = Math.max(thinkingBudget + 2048, 4096);
    
    // Legacy fallback for some providers
    if (modelId.includes('nemotron') || modelId.includes('qwen')) {
      body.include_reasoning = true;
      body.thinking_budget = thinkingBudget;
    }
  }

  console.log(`[EVALUATOR] Request for ${modelId}:`, JSON.stringify(body, null, 2));

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'freellmfunny',
      },
      body: JSON.stringify(body),
    });

    console.log(`[EVALUATOR] ${modelId} response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage = `${errorMessage} ${errorText}`;
      }
      
      if (errorMessage.includes('data policy') || errorMessage.includes('Free model publication')) {
        errorMessage = 'Data policy error: You must enable "Free model publication" in your OpenRouter privacy settings to use this model. Visit https://openrouter.ai/settings/privacy';
      } else if (response.status === 429 || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('rate-limited')) {
        errorMessage = `Rate limit error: ${errorMessage}`;
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
        if (line.trim() === '' || line.startsWith(':')) continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices[0]?.delta;
            const content = delta?.content || '';
            
            // Support multiple possible reasoning fields from different providers via OpenRouter
            // Check delta.reasoning (DeepSeek/Legacy), delta.reasoning_content (OpenAI), delta.thinking (Legacy)
            let thinking = delta?.reasoning || delta?.reasoning_content || delta?.thinking || '';
            
            // Handle the new standardized reasoning_details array
            if (delta?.reasoning_details) {
              const textParts = delta.reasoning_details
                .filter((d: any) => d.type === 'reasoning.text')
                .map((d: any) => d.text);
              if (textParts.length > 0) {
                thinking = textParts.join('');
              }
            }
            
            if (thinking) {
              if (!firstTokenTime) firstTokenTime = Date.now();
              fullThinkingContent += thinking;
              thinkingCharCount += thinking.length;
              // Very rough token estimation
              thinkingTokenCount = Math.ceil(thinkingCharCount / 3.5);
              lastThinkingTokenTime = Date.now();

              yield {
                modelId,
                thinkingContent: thinking,
                isDone: false,
              };
            }

            if (content) {
              if (!firstTokenTime) firstTokenTime = Date.now();
              fullContent += content;
              charCount += content.length;
              // Very rough token estimation
              tokenCount = Math.ceil(charCount / 3.5);
              yield {
                modelId,
                content,
                isDone: false,
              };
            }
            
            // If we have usage in the chunk (OpenRouter sends it at the end)
            if (data.usage) {
              tokenCount = data.usage.completion_tokens || tokenCount;
            }
          } catch (e) {
            console.error('Error parsing stream chunk', e);
          }
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const ttft = firstTokenTime ? firstTokenTime - startTime : duration;
    const thinkingDuration = lastThinkingTokenTime ? lastThinkingTokenTime - (firstTokenTime || startTime) : 0;
    
    // TPS based on tokens
    const totalTokens = tokenCount + thinkingTokenCount;
    const tps = totalTokens / (duration / 1000);

    yield {
      modelId,
      isDone: true,
      metrics: {
        duration,
        ttft,
        tokenCount: charCount, // UI uses this as chars usually
        thinkingDuration,
        thinkingTokenCount,
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


