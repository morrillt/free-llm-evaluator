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
  duration: number; // in ms
  tps: number;
  tokenCount: number;
  error?: string;
  rawResponse?: any;
}
