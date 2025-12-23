import fs from 'fs/promises';
import path from 'path';
import { Settings, Conversation, Joke } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const JOKES_FILE = path.join(DATA_DIR, 'jokes.json');
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');

const DEFAULT_SETTINGS: Settings = {
  selectedModels: [
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'tngtech/deepseek-r1t2-chimera:free',
    'tngtech/deepseek-r1t-chimera:free',
    'google/gemma-3-27b-it:free',
    'qwen/qwen3-coder:free'
  ],
  globalSystemPrompt: 'You are a helpful assistant.',
  globalTemperature: 0.7,
  globalThinkingEnabled: true,
  globalThinkingBudget: 2048,
  jokeSystemPrompt: "say something funny that would make larry david laugh, hint, self referetnial witty, etc... no fart jokes.\n\nJust the joke, no warm up no referneces, joke only. DO NOT LOOKUP ON JOKE SITES! MAKE IT UP\n\n\n",
  modelOverrides: {
    'z-ai/glm-4.5-air:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'qwen/qwen3-coder:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'nvidia/nemotron-3-nano-30b-a3b:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'tngtech/deepseek-r1t2-chimera:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'meta-llama/llama-3.3-70b-instruct:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'google/gemma-3-27b-it:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'deepseek/deepseek-r1-0528:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'google/gemini-2.0-flash-exp:free': { thinkingEnabled: true, thinkingBudget: 100 },
    'nvidia/nemotron-nano-9b-v2:free': { thinkingEnabled: true, thinkingBudget: 100 },
  },
};

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
}

export async function getSettings(): Promise<Settings> {
  // We no longer persist settings to a file on localhost/dev
  // Settings are primarily managed via URL params now
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  // We no longer persist settings to a file
  // The ClientApp handles syncing settings to the URL
}

export async function getConversations(): Promise<Conversation[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(CONVERSATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  await ensureDataDir();
  const conversations = await getConversations();
  conversations.push(conversation);
  await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
}

export async function getJokes(): Promise<Joke[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(JOKES_FILE, 'utf-8');
    const jokes = JSON.parse(data);
    // Ensure all jokes have a score and comments array
    return jokes.map((j: any) => ({
      ...j,
      score: j.score ?? 0,
      comments: j.comments ?? []
    }));
  } catch (error) {
    return [];
  }
}

export async function saveJoke(joke: Joke): Promise<void> {
  await ensureDataDir();
  const jokes = await getJokes();
  jokes.push(joke);
  await fs.writeFile(JOKES_FILE, JSON.stringify(jokes, null, 2));
}

export async function updateJokes(jokes: Joke[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(JOKES_FILE, JSON.stringify(jokes, null, 2));
}

export async function getVisitorCount(): Promise<number> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(VISITORS_FILE, 'utf-8');
    const visitors = JSON.parse(data);
    return Array.isArray(visitors) ? visitors.length : 0;
  } catch (error) {
    // If we can't read from file (e.g. on Vercel), return a fallback
    return 1337; 
  }
}

export async function recordVisit(ip: string): Promise<number> {
  try {
    await ensureDataDir();
    let visitors: string[] = [];
    try {
      const data = await fs.readFile(VISITORS_FILE, 'utf-8');
      visitors = JSON.parse(data);
      if (!Array.isArray(visitors)) visitors = [];
    } catch (error) {
      visitors = [];
    }

    if (!visitors.includes(ip)) {
      visitors.push(ip);
      try {
        await fs.writeFile(VISITORS_FILE, JSON.stringify(visitors, null, 2));
      } catch (e) {
        // Fail silently on Vercel, we'll just return the current length
        console.warn('Could not write visitors to file system, using memory fallback');
      }
    }
    
    return visitors.length > 0 ? visitors.length : 1337;
  } catch (e) {
    // Fallback for Vercel where fs might be totally disabled or fail
    return 1337;
  }
}


