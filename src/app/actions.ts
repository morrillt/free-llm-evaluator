'use server';

import { fetchFreeModels } from '@/lib/openrouter';
import { getSettings, saveSettings, saveConversation, getConversations, getJokes, saveJoke, updateJokes, recordVisit, getVisitorCount } from '@/lib/storage';
import { Settings, Model, Conversation, Joke, JokeComment } from '@/lib/types';
import { headers } from 'next/headers';

export async function recordVisitAction(): Promise<number> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
  return await recordVisit(ip);
}

export async function getVisitorCountAction(): Promise<number> {
  return await getVisitorCount();
}

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

export async function getConversationsAction(): Promise<Conversation[]> {
  return await getConversations();
}

export async function getJokesAction(): Promise<Joke[]> {
  return await getJokes();
}

export async function saveJokeAction(joke: Joke): Promise<void> {
  await saveJoke(joke);
}

export async function addCommentAction(jokeId: string, comment: JokeComment): Promise<void> {
  const jokes = await getJokes();
  const joke = jokes.find(j => j.id === jokeId);
  if (joke) {
    joke.comments.push(comment);
    await updateJokes(jokes);
  }
}

export async function voteJokeAction(jokeId: string, delta: number): Promise<void> {
  const jokes = await getJokes();
  const joke = jokes.find(j => j.id === jokeId);
  if (joke) {
    joke.score = (joke.score || 0) + delta;
    await updateJokes(jokes);
  }
}


