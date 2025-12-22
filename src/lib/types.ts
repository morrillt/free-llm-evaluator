export interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface Settings {
  selectedModels: string[];
  globalSystemPrompt: string;
  globalTemperature: number;
  globalThinkingEnabled: boolean;
  globalThinkingBudget: number;
  jokeSystemPrompt?: string;
  modelOverrides: Record<string, ModelOverride>;
}

export interface ModelOverride {
  systemPrompt?: string;
  temperature?: number;
  thinkingEnabled?: boolean;
  thinkingBudget?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Conversation {
  id: string;
  timestamp: string;
  prompt: string;
  responses: Record<string, ModelResponse>;
}

export interface ModelResponse {
  modelId: string;
  content: string;
  thinkingContent?: string;
  duration: number; // in ms
  ttft?: number; // Time to first token in ms
  thinkingDuration?: number; // in ms
  tps: number;
  tokenCount: number;
  thinkingTokenCount?: number;
  error?: string;
  rawResponse?: any;
  rating?: 'funny' | 'not_funny';
}

export interface JokeComment {
  id: string;
  text: string;
  timestamp: string;
  author: string;
}

export interface Joke {
  id: string;
  content: string;
  modelSignature: string;
  timestamp: string;
  comments: JokeComment[];
  score: number;
}


