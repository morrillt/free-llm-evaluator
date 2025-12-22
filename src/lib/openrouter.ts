import { Model } from './types';

export async function fetchFreeModels(): Promise<Model[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'freellmfunny',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    const models: any[] = data.data;

    // Filter for models with "free" in the name or slug
    return models
      .filter((model) => 
        model.name.toLowerCase().includes('free') || 
        model.id.toLowerCase().includes('free')
      )
      .map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        pricing: model.pricing,
      }));
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}


