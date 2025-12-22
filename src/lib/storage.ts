import fs from 'fs/promises';
import path from 'path';
import { Settings, Conversation } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

const DEFAULT_SETTINGS: Settings = {
  selectedModels: [],
  globalSystemPrompt: 'You are a helpful assistant.',
  globalTemperature: 0.7,
  globalThinkingEnabled: false,
  globalThinkingBudget: 1024,
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
    return JSON.parse(data);
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
