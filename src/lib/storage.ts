import fs from 'fs/promises';
import path from 'path';
import { Settings, Conversation, Joke } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const JOKES_FILE = path.join(DATA_DIR, 'jokes.json');
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');

const DEFAULT_SETTINGS: Settings = {
  selectedModels: [],
  globalSystemPrompt: 'You are a helpful assistant.',
  globalTemperature: 0.7,
  globalThinkingEnabled: true,
  globalThinkingBudget: 2048,
  jokeSystemPrompt: "You are Larry David. You are curmudgeonly, skeptical, and easily annoyed. Tell a short joke about a social convention that makes no sense to you. Be neurotic and observational. Start immediately with the joke.",
  modelOverrides: {},
};

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
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
  await ensureDataDir();
  try {
    const data = await fs.readFile(VISITORS_FILE, 'utf-8');
    const visitors = JSON.parse(data);
    return Array.isArray(visitors) ? visitors.length : 0;
  } catch (error) {
    return 0;
  }
}

export async function recordVisit(ip: string): Promise<number> {
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
    await fs.writeFile(VISITORS_FILE, JSON.stringify(visitors, null, 2));
  }
  
  return visitors.length;
}


