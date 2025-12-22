'use server';

import { fetchFreeModels } from '@/lib/openrouter';
import { getSettings, saveSettings, saveConversation } from '@/lib/storage';
import { Settings, Model, Conversation } from '@/lib/types';

export async function getModelsAction(): Promise<Model[]> {
  return await fetchFreeModels();
}

export async function getSettingsAction(): Promise<Settings> {
  return await getSettings();
}

export async function saveSettingsAction(settings: Settings): Promise<void> {
  await saveSettings(settings);
}

export async function saveConversationAction(conversation: Conversation): Promise<void> {
  await saveConversation(conversation);
}
