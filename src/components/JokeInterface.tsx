'use client';

import React, { useState, useEffect } from 'react';
import { Model, ModelResponse, Settings, Message, Joke } from '@/lib/types';
import { ModelContainer } from './ModelContainer';
import { JokeSidebar } from './JokeSidebar';
import { Button } from './ui/Button';
import { Laugh, Meh, PartyPopper, Send, Trash2, X } from 'lucide-react';
import { saveConversationAction, saveJokeAction } from '@/app/actions';
import posthog from 'posthog-js';

interface JokeInterfaceProps {
  models: Model[];
  selectedModelIds: string[];
  settings: Settings;
  onRandomizeModel: (oldModelId: string) => Promise<string | null>;
  onUpdateSettings: (settings: Settings) => void;
  onOpenSettings: () => void;
}

export const JokeInterface: React.FC<JokeInterfaceProps> = ({
  models,
  selectedModelIds,
  settings,
  onRandomizeModel,
  onUpdateSettings,
  onOpenSettings,
}) => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRemixOpen, setIsRemixOpen] = useState(false);
  const [modelContents, setModelContents] = useState<Record<string, string>>({});
  const [modelThinkingContents, setModelThinkingContents] = useState<Record<string, string>>({});
  const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, 'funny' | 'not_funny'>>({});
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));

  // Sort model IDs so completed models come first
  const sortedModelIds = [...selectedModelIds].sort((a, b) => {
    const aCompleted = completedModels.has(a);
    const bCompleted = completedModels.has(b);
    if (aCompleted && !bCompleted) return -1;
    if (!aCompleted && bCompleted) return 1;
    return 0; // Keep original order for models with same completion status
  });

  const evaluateSingleJoke = async (modelId: string) => {
    console.log('JokeInterface: Entering evaluateSingleJoke for', modelId);
    // Reset state for this model
    setModelContents(prev => ({ ...prev, [modelId]: '' }));
    setModelThinkingContents(prev => ({ ...prev, [modelId]: '' }));
    setModelResponses(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
    setStreamingModels(prev => {
      console.log('JokeInterface: Setting streaming state for', modelId);
      const next = new Set(prev);
      next.add(modelId);
      return next;
    });
    setRatings(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });

    const messages: Message[] = [{ role: 'user', content: "Tell me a joke." }];

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: JSON.stringify({ 
          modelId, 
          messages,
          isJokeMode: true,
          settings
        }),
      });

      if (!response.ok) throw new Error('Failed to start evaluation');

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';
      let currentContent = '';
      let currentThinking = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.content) {
              currentContent += chunk.content;
              setModelContents((prev) => ({
                ...prev,
                [modelId]: (prev[modelId] || '') + chunk.content,
              }));
            }
            if (chunk.thinkingContent) {
              currentThinking += chunk.thinkingContent;
              setModelThinkingContents((prev) => ({
                ...prev,
                [modelId]: (prev[modelId] || '') + chunk.thinkingContent,
              }));
            }
              if (chunk.isDone) {
                if (chunk.metrics) {
                  const modelRes = {
                    modelId,
                    content: currentContent,
                    thinkingContent: currentThinking,
                    ...chunk.metrics,
                  };
                  setModelResponses((prev) => ({
                    ...prev,
                    [modelId]: modelRes,
                  }));

                  // Trigger: LLM says "is funny"
                  if (currentContent.toLowerCase().includes('is funny')) {
                    const model = models.find(m => m.id === modelId);
                    const joke: Joke = {
                      id: Date.now().toString() + '-' + modelId,
                      content: currentContent,
                      modelSignature: model?.name || modelId,
                      timestamp: new Date().toISOString(),
                      comments: [],
                      score: 0
                    };
                    saveJokeAction(joke);
                  }
                }
                setStreamingModels((prev) => {
                const next = new Set(prev);
                next.delete(modelId);
                return next;
              });
              setCompletedModels(prev => new Set([...prev, modelId]));
            }
          } catch (e) {
            console.error('Error parsing chunk', e);
          }
        }
      }
    } catch (error: any) {
      setStreamingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  const handleTellJoke = async () => {
    if (isEvaluating || selectedModelIds.length === 0) return;

    setIsEvaluating(true);
    setModelContents({});
    setModelThinkingContents({});
    setModelResponses({});
    setRatings({});
    setCompletedModels(new Set());
    const newStreamingModels = new Set(selectedModelIds);
    setStreamingModels(newStreamingModels);

    // Track joke_generation_started with PostHog
    posthog.capture('joke_generation_started', {
      model_count: selectedModelIds.length,
      model_ids: selectedModelIds,
      joke_prompt: settings.jokeSystemPrompt,
    });

    // Prompt is provided by system prompt in joke mode
    const messages: Message[] = [{ role: 'user', content: "Tell me a joke." }];
    
    // We'll override the system prompt in the API call by passing a special flag or just handling it in actions
    // For now, we'll use a hidden prompt approach or just rely on the server action handling it if we update it.
    // Actually, let's just use the current API but with the joke prompt.

    const finalResponses: Record<string, ModelResponse> = {};

    const evalPromises = selectedModelIds.map(async (modelId) => {
      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          body: JSON.stringify({ 
            modelId, 
            messages,
            isJokeMode: true // We'll handle this in the API route
          }),
        });

        if (!response.ok) throw new Error('Failed to start evaluation');

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';
        let currentContent = '';
        let currentThinking = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);
              if (chunk.content) {
                currentContent += chunk.content;
                setModelContents((prev) => ({
                  ...prev,
                  [modelId]: (prev[modelId] || '') + chunk.content,
                }));
              }
              if (chunk.thinkingContent) {
                currentThinking += chunk.thinkingContent;
                setModelThinkingContents((prev) => ({
                  ...prev,
                  [modelId]: (prev[modelId] || '') + chunk.thinkingContent,
                }));
              }
              if (chunk.isDone) {
                if (chunk.metrics) {
                  const modelRes = {
                    modelId,
                    content: currentContent,
                    thinkingContent: currentThinking,
                    ...chunk.metrics,
                  };
                  finalResponses[modelId] = modelRes;
                  setModelResponses((prev) => ({
                    ...prev,
                    [modelId]: modelRes,
                  }));

                  // Trigger: LLM says "is funny"
                  if (currentContent.toLowerCase().includes('is funny')) {
                    const model = models.find(m => m.id === modelId);
                    const joke: Joke = {
                      id: Date.now().toString() + '-' + modelId,
                      content: currentContent,
                      modelSignature: model?.name || modelId,
                      timestamp: new Date().toISOString(),
                      comments: [],
                      score: 0
                    };
                    saveJokeAction(joke);
                  }
                }
                setStreamingModels((prev) => {
                  const next = new Set(prev);
                  next.delete(modelId);
                  return next;
                });
                setCompletedModels(prev => new Set([...prev, modelId]));
              }
            } catch (e) {
              console.error('Error parsing chunk', e);
            }
          }
        }
      } catch (error: any) {
        setStreamingModels((prev) => {
          const next = new Set(prev);
          next.delete(modelId);
          return next;
        });
      }
    });

    await Promise.all(evalPromises);
    setIsEvaluating(false);
  };

  const handleRate = async (modelId: string, rating: 'funny' | 'not_funny') => {
    const response = modelResponses[modelId];
    if (!response) return;

    const model = models.find(m => m.id === modelId);

    // Track joke_rated with PostHog
    posthog.capture('joke_rated', {
      model_id: modelId,
      model_name: model?.name || modelId,
      rating: rating,
      is_funny: rating === 'funny',
      response_tps: response.tps,
      response_duration_ms: response.duration,
    });

    const newResponse = { ...response, rating };

    setRatings(prev => ({ ...prev, [modelId]: rating }));
    setModelResponses(prev => ({ ...prev, [modelId]: newResponse }));

    // If rated funny, add to Joke Wall
    if (rating === 'funny') {
      const joke: Joke = {
        id: Date.now().toString() + '-' + modelId,
        content: response.content,
        modelSignature: model?.name || modelId,
        timestamp: new Date().toISOString(),
        comments: []
      };
      await saveJokeAction(joke);
    }

    // Update final responses and save
    const updatedResponses = { ...modelResponses, [modelId]: newResponse };
    
    await saveConversationAction({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      prompt: "Tell me a joke (Joke Mode)",
      responses: updatedResponses,
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden relative">
      <div className="p-4 bg-mocha-mantle border border-mocha-surface1 rounded-2xl shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-mocha-pink flex items-center gap-2 uppercase tracking-tighter">
              <Laugh className="w-6 h-6" />
              Testing the funniness and speed of all free models on Open Router.-&lt;
            </h2>
            <p className="text-xs text-mocha-subtext1 font-medium mt-1 uppercase tracking-widest opacity-70 flex items-center gap-1">
              say something funny that would make larry david laugh, hint, self referetnial witty, e
              <button 
                onClick={() => setIsRemixOpen(true)}
                className="text-mocha-blue hover:underline lowercase tracking-normal font-bold"
              >
                ... (see more)
              </button>
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setIsRemixOpen(!isRemixOpen)}
              className="whitespace-nowrap flex items-center justify-center gap-3 bg-mocha-lavender hover:bg-mocha-lavender/90 text-mocha-base font-black px-8 py-4 text-xl rounded-full shadow-lg shadow-mocha-lavender/20 transition-transform hover:scale-105 active:scale-95"
            >
              <PartyPopper className="w-6 h-6" />
              {isRemixOpen ? 'CLOSE REMIX' : 'REMIX THE MAGIC'}
            </Button>
            <Button 
              size="lg" 
              onClick={handleTellJoke} 
              disabled={isEvaluating || selectedModelIds.length === 0}
              className="bg-mocha-yellow hover:bg-mocha-yellow/90 text-mocha-base font-black px-8 py-4 text-xl rounded-full shadow-lg shadow-mocha-yellow/20 whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
            >
              {isEvaluating ? 'THINKING...' : 'GENERATE JOKES'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 relative overflow-hidden">
        <div className={`flex-1 flex gap-4 min-h-0 overflow-x-auto p-1 pb-4 transition-all duration-300 ${isRemixOpen ? 'opacity-50 pointer-events-none' : ''}`}>
          {sortedModelIds.length > 0 ? (
            sortedModelIds.map((modelId) => {
              const model = models.find((m) => m.id === modelId);
              const response = modelResponses[modelId];
              const currentRating = ratings[modelId];

              return (
                <div key={modelId} className="flex-shrink-0 w-[400px] h-full">
                  <ModelContainer
                    modelId={modelId}
                    modelName={model?.name || modelId}
                    content={modelContents[modelId] || ''}
                    thinkingContent={modelThinkingContents[modelId] || ''}
                    response={response}
                    isStreaming={streamingModels.has(modelId)}
                    onRandomize={async () => {
                      console.log('JokeInterface: Randomizing model', modelId);
                      const newModelId = await onRandomizeModel(modelId);
                      console.log('JokeInterface: New model ID received:', newModelId);
                      if (newModelId) {
                        console.log('JokeInterface: Re-prompting with new model', newModelId);
                        setTimeout(() => evaluateSingleJoke(newModelId), 50);
                      }
                    }}
                    onRefresh={() => evaluateSingleJoke(modelId)}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                    rating={currentRating}
                    onRate={(rating) => handleRate(modelId, rating)}
                  />
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-mocha-surface1 rounded-xl text-mocha-surface2">
              Select some models first to hear some jokes!
            </div>
          )}
        </div>

        {isRemixOpen && (
          <div className="pointer-events-none fixed inset-y-0 right-0 z-40 w-80">
            <div className="h-full shadow-2xl animate-in slide-in-from-right duration-300 pointer-events-auto relative">
              <JokeSidebar 
                settings={settings}
                onUpdateSettings={onUpdateSettings}
              />
              <button 
                onClick={() => setIsRemixOpen(false)}
                className="absolute top-4 right-4 p-1 bg-mocha-surface0 hover:bg-mocha-surface1 text-mocha-text rounded-full shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


