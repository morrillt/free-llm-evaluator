'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Model, ModelResponse, Settings, Message, Joke } from '@/lib/types';
import { ModelContainer } from './ModelContainer';
import { Button } from './ui/Button';
import { Send, Trash2, Download, Copy, Check, MessageSquare } from 'lucide-react';
import { saveConversationAction, saveJokeAction } from '@/app/actions';
import posthog from 'posthog-js';

interface ChatInterfaceProps {
  models: Model[];
  selectedModelIds: string[];
  settings: Settings;
  onRandomizeModel: (oldModelId: string) => Promise<string | null>;
  onUpdateSettings: (settings: Settings) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  models,
  selectedModelIds,
  settings,
  onRandomizeModel,
  onUpdateSettings,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [modelContents, setModelContents] = useState<Record<string, string>>({});
  const [modelThinkingContents, setModelThinkingContents] = useState<Record<string, string>>({});
  const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));

  const evaluateSingleModel = async (modelId: string, currentPrompt: string) => {
    if (!currentPrompt.trim()) return;

    // Reset state for this model
    setModelContents(prev => ({ ...prev, [modelId]: '' }));
    setModelThinkingContents(prev => ({ ...prev, [modelId]: '' }));
    setModelResponses(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
    setStreamingModels(prev => {
      const next = new Set(prev);
      next.add(modelId);
      return next;
    });

    const messages: Message[] = [{ role: 'user', content: currentPrompt }];

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: JSON.stringify({ modelId, messages, settings }),
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
                } else if (chunk.error) {
                const errorRes = {
                  modelId,
                  content: currentContent,
                  thinkingContent: currentThinking,
                  error: chunk.error,
                  duration: 0,
                  tps: 0,
                  tokenCount: 0,
                };
                setModelResponses((prev) => ({
                  ...prev,
                  [modelId]: errorRes,
                }));
              }
              setStreamingModels((prev) => {
                const next = new Set(prev);
                next.delete(modelId);
                return next;
              });
            }
          } catch (e) {
            console.error('Error parsing chunk', e);
          }
        }
      }
    } catch (error: any) {
      const errRes = {
        modelId,
        content: '',
        error: error.message,
        duration: 0,
        tps: 0,
        tokenCount: 0,
      };
      setModelResponses((prev) => ({
        ...prev,
        [modelId]: errRes,
      }));
      setStreamingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  const handleSend = async () => {
    if (!prompt.trim() || isEvaluating) return;

    // Check if user is saying "is funny" about the previous responses
    if (prompt.toLowerCase().includes('is funny')) {
      const responsesToSave = Object.entries(modelResponses);
      for (const [modelId, response] of responsesToSave) {
        if (response.content.trim()) {
          const model = models.find(m => m.id === modelId);
          const joke: Joke = {
            id: Date.now().toString() + '-' + modelId,
            content: response.content,
            modelSignature: model?.name || modelId,
            timestamp: new Date().toISOString(),
            comments: []
          };
          await saveJokeAction(joke);
        }
      }
    }

    setIsEvaluating(true);
    setModelContents({});
    setModelThinkingContents({});
    setModelResponses({});
    const newStreamingModels = new Set(selectedModelIds);
    setStreamingModels(newStreamingModels);

    const messages: Message[] = [{ role: 'user', content: prompt }];

    const finalResponses: Record<string, ModelResponse> = {};

    // Track evaluation_started with PostHog
    const evaluationStartTime = Date.now();
    posthog.capture('evaluation_started', {
      model_count: selectedModelIds.length,
      model_ids: selectedModelIds,
      prompt_length: prompt.length,
    });

    // Trigger evaluations in parallel
    const evalPromises = selectedModelIds.map(async (modelId) => {
      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          body: JSON.stringify({ modelId, messages }),
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
                } else if (chunk.error) {
                  const errorRes = {
                    modelId,
                    content: currentContent,
                    thinkingContent: currentThinking,
                    error: chunk.error,
                    duration: 0,
                    tps: 0,
                    tokenCount: 0,
                  };
                  finalResponses[modelId] = errorRes;
                  setModelResponses((prev) => ({
                    ...prev,
                    [modelId]: errorRes,
                  }));
                }
                setStreamingModels((prev) => {
                  const next = new Set(prev);
                  next.delete(modelId);
                  return next;
                });
              }
            } catch (e) {
              console.error('Error parsing chunk', e);
            }
          }
        }
      } catch (error: any) {
        const errRes = {
          modelId,
          content: '',
          error: error.message,
          duration: 0,
          tps: 0,
          tokenCount: 0,
        };
        finalResponses[modelId] = errRes;
        setModelResponses((prev) => ({
          ...prev,
          [modelId]: errRes,
        }));
        setStreamingModels((prev) => {
          const next = new Set(prev);
          next.delete(modelId);
          return next;
        });
      }
    });

    await Promise.all(evalPromises);

    // Save conversation to local storage
    if (Object.keys(finalResponses).length > 0) {
      await saveConversationAction({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        prompt,
        responses: finalResponses,
      });
    }

    // Track evaluation_completed with PostHog
    const successfulResponses = Object.values(finalResponses).filter(r => !r.error);
    const errorResponses = Object.values(finalResponses).filter(r => r.error);
    posthog.capture('evaluation_completed', {
      model_count: selectedModelIds.length,
      successful_count: successfulResponses.length,
      error_count: errorResponses.length,
      total_duration_ms: Date.now() - evaluationStartTime,
      average_tps: successfulResponses.length > 0
        ? successfulResponses.reduce((sum, r) => sum + r.tps, 0) / successfulResponses.length
        : 0,
    });

    setIsEvaluating(false);
  };

  const handleExport = () => {
    const data = {
      prompt,
      timestamp: new Date().toISOString(),
      results: selectedModels.map((m) => ({
        model: m.name,
        ...modelResponses[m.id],
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Track results_exported with PostHog
    posthog.capture('results_exported', {
      model_count: selectedModels.length,
      result_count: Object.keys(modelResponses).length,
      export_format: 'json',
    });
  };

  const handleCopy = () => {
    const data = {
      prompt,
      results: selectedModels.map((m) => ({
        model: m.name,
        content: modelContents[m.id],
        metrics: modelResponses[m.id],
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      <div className="p-4 bg-mocha-mantle border border-mocha-surface1 rounded-2xl shadow-xl flex-shrink-0">
        <h2 className="text-xl font-black text-mocha-blue flex items-center gap-2 uppercase tracking-tighter">
          <MessageSquare className="w-6 h-6" />
          Evaluation Lab
        </h2>
        <p className="text-xs text-mocha-subtext1 font-medium mt-1 uppercase tracking-widest opacity-70">
          preliminary evaluation mechanism for a rag pipeline, more features coming soon.
        </p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-x-auto p-1 pb-4">
        {selectedModelIds.length > 0 ? (
          selectedModelIds.map((modelId) => {
            const model = models.find((m) => m.id === modelId);
            return (
              <div key={modelId} className="flex-shrink-0 w-[400px] h-full">
                <ModelContainer
                  modelId={modelId}
                  modelName={model?.name || modelId}
                  content={modelContents[modelId] || ''}
                  thinkingContent={modelThinkingContents[modelId] || ''}
                  response={modelResponses[modelId]}
                  isStreaming={streamingModels.has(modelId)}
                  onRandomize={async () => {
                    console.log('ChatInterface: Randomizing model', modelId);
                    const newModelId = await onRandomizeModel(modelId);
                    console.log('ChatInterface: New model ID received:', newModelId);
                    if (newModelId && prompt.trim()) {
                      console.log('ChatInterface: Re-prompting with new model', newModelId);
                      setTimeout(() => evaluateSingleModel(newModelId, prompt), 50);
                    }
                  }}
                  onRefresh={() => evaluateSingleModel(modelId, prompt)}
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                />
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-mocha-surface1 rounded-xl text-mocha-surface2">
            Select up to 7 models to start evaluation
          </div>
        )}
      </div>

      <div className="bg-mocha-mantle p-4 border border-mocha-surface1 rounded-xl shadow-2xl">
        <div className="flex gap-4">
          <textarea
            className="flex-1 bg-mocha-surface0 border border-mocha-surface1 rounded-lg p-4 text-mocha-text focus:outline-none focus:ring-2 focus:ring-mocha-blue resize-none h-24"
            placeholder="Enter your prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <Button
              className="h-full flex flex-col items-center justify-center gap-1 min-w-[80px]"
              onClick={handleSend}
              disabled={isEvaluating || !prompt.trim() || selectedModelIds.length === 0}
            >
              <Send className="w-6 h-6" />
              <span className="text-xs">Send</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPrompt('');
                setModelContents({});
                setModelResponses({});
              }}
              disabled={isEvaluating}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              disabled={Object.keys(modelResponses).length === 0}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={Object.keys(modelResponses).length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


