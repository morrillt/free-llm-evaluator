'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Model, ModelResponse, Settings, Message, Joke } from '@/lib/types';
import { ModelContainer } from './ModelContainer';
import { Button } from './ui/Button';
import { Send, Trash2, Download, Copy, Check, MessageSquare, LayoutGrid, Table as TableIcon, ArrowUpDown, ChevronUp, ChevronDown, X } from 'lucide-react';
import { saveConversationAction, saveJokeAction } from '@/app/actions';
import posthog from 'posthog-js';

type ViewMode = 'grid' | 'table';
type SortConfig = { key: keyof ModelResponse | 'name'; direction: 'asc' | 'desc' };

interface ChatInterfaceProps {
  models: Model[];
  selectedModelIds: string[];
  settings: Settings;
  initialPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  onRandomizeModel: (oldModelId: string) => Promise<string | null>;
  onUpdateSettings: (settings: Settings) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  models,
  selectedModelIds,
  settings,
  initialPrompt = '',
  onPromptChange,
  onRandomizeModel,
  onUpdateSettings,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [modelContents, setModelContents] = useState<Record<string, string>>({});
  const [modelThinkingContents, setModelThinkingContents] = useState<Record<string, string>>({});
  const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'duration', direction: 'asc' });

  useEffect(() => {
    if (initialPrompt && !prompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));

  const sortedModelIds = [...selectedModelIds].sort((a, b) => {
    const resA = modelResponses[a];
    const resB = modelResponses[b];
    const modelA = models.find(m => m.id === a);
    const modelB = models.find(m => m.id === b);

    let valA: any;
    let valB: any;

    if (sortConfig.key === 'name') {
      valA = modelA?.name || a;
      valB = modelB?.name || b;
    } else {
      valA = resA ? resA[sortConfig.key] : Infinity;
      valB = resB ? resB[sortConfig.key] : Infinity;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof ModelResponse | 'name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const removeModelResponse = (modelId: string) => {
    setModelContents(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
    setModelThinkingContents(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
    setModelResponses(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
    posthog.capture('model_result_removed', { model_id: modelId });
  };

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
            comments: [],
            score: 0
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
      <div className="p-4 bg-mocha-mantle border border-mocha-surface1 rounded-2xl shadow-xl flex-shrink-0 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-mocha-blue flex items-center gap-2 uppercase tracking-tighter">
            <MessageSquare className="w-6 h-6" />
            Evaluation Lab
          </h2>
          <p className="text-xs text-mocha-subtext1 font-medium mt-1 uppercase tracking-widest opacity-70">
            preliminary evaluation mechanism for a rag pipeline, more features coming soon.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Table Toggle
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-1 pb-4 custom-scrollbar">
        {selectedModelIds.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="flex gap-4 h-full overflow-x-auto custom-scrollbar">
              {selectedModelIds.map((modelId) => {
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
              })}
            </div>
          ) : (
            <div className="bg-mocha-mantle border border-mocha-surface1 rounded-xl overflow-hidden h-full flex flex-col">
              <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-mocha-surface0 z-10">
                    <tr className="border-b border-mocha-surface1">
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Model {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider">Prompt</th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider">Thinking</th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider">Budget</th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('ttft')}>
                        <div className="flex items-center gap-1">
                          TTFT {sortConfig.key === 'ttft' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('thinkingDuration')}>
                        <div className="flex items-center gap-1">
                          Thinking Time {sortConfig.key === 'thinkingDuration' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('duration')}>
                        <div className="flex items-center gap-1">
                          Total Time {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('tps')}>
                        <div className="flex items-center gap-1">
                          TPS {sortConfig.key === 'tps' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('tokenCount')}>
                        <div className="flex items-center gap-1">
                          iTokens {sortConfig.key === 'tokenCount' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                        <div className="flex gap-2 mt-1 text-[9px] font-black opacity-40 tracking-tighter">
                          <span>IN</span>
                          <span className="opacity-30">/</span>
                          <span>OUT</span>
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider cursor-pointer hover:text-mocha-blue" onClick={() => handleSort('cost')}>
                        <div className="flex items-center gap-1">
                          Cost {sortConfig.key === 'cost' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider">Content</th>
                      <th className="p-4 text-xs font-bold text-mocha-overlay2 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mocha-surface1">
                    {sortedModelIds.map((modelId) => {
                      const model = models.find(m => m.id === modelId);
                      const response = modelResponses[modelId];
                      const content = modelContents[modelId] || '';
                      const override = settings.modelOverrides[modelId] || {};
                      const thinkingEnabled = override.thinkingEnabled ?? settings.globalThinkingEnabled;
                      const thinkingBudget = override.thinkingBudget ?? settings.globalThinkingBudget;
                      
                      return (
                        <tr key={modelId} className="hover:bg-mocha-surface0/50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-mocha-text">{model?.name || modelId}</div>
                            <div className="text-[10px] text-mocha-subtext0 font-mono opacity-60">{modelId}</div>
                          </td>
                          <td className="p-4 text-mocha-text max-w-[150px]">
                            <div className="text-xs truncate opacity-70" title={prompt}>
                              {prompt || '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              thinkingEnabled ? "bg-mocha-green/20 text-mocha-green" : "bg-mocha-red/20 text-mocha-red"
                            )}>
                              {thinkingEnabled ? 'On' : 'Off'}
                            </span>
                          </td>
                          <td className="p-4 text-mocha-text font-mono text-xs">
                            {thinkingBudget}
                          </td>
                          <td className="p-4 text-mocha-text">
                            {response?.ttft ? `${response.ttft}ms` : (streamingModels.has(modelId) ? '...' : '-')}
                          </td>
                          <td className="p-4 text-mocha-text">
                            {response?.thinkingDuration ? `${response.thinkingDuration}ms` : (streamingModels.has(modelId) ? '...' : '-')}
                          </td>
                          <td className="p-4 text-mocha-text">
                            {response?.duration ? `${(response.duration / 1000).toFixed(2)}s` : (streamingModels.has(modelId) ? '...' : '-')}
                          </td>
                          <td className="p-4 text-mocha-text">
                            {response?.tps ? `${response.tps.toFixed(1)}` : (streamingModels.has(modelId) ? '...' : '-')}
                          </td>
                          <td className="p-4 text-mocha-text">
                            <div className="flex flex-col">
                              <div className="text-xs font-mono">
                                {response?.promptTokens || '-'}<span className="mx-1 opacity-30">/</span>{response?.completionTokens || (content.length > 0 ? Math.ceil(content.length / 3.5) : '-')}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-mocha-text font-mono text-[10px]">
                            {response?.cost !== undefined ? `$${response.cost.toFixed(6)}` : (streamingModels.has(modelId) ? '...' : '-')}
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-mocha-subtext1 line-clamp-2 max-w-md">
                              {content || (response?.error ? <span className="text-mocha-red">{response.error}</span> : '-')}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeModelResponse(modelId)}
                              className="text-mocha-overlay0 hover:text-mocha-red h-8 w-8 p-0"
                              title="Remove from log"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
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
            onChange={(e) => {
              setPrompt(e.target.value);
              onPromptChange?.(e.target.value);
            }}
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
                onPromptChange?.('');
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}


