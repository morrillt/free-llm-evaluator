'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Model, ModelResponse, Settings, Message } from '@/lib/types';
import { ModelContainer } from './ModelContainer';
import { Button } from './ui/Button';
import { Send, Trash2, Download, Copy, Check } from 'lucide-react';
import { saveConversationAction } from '@/app/actions';

interface ChatInterfaceProps {
  models: Model[];
  selectedModelIds: string[];
  settings: Settings;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  models,
  selectedModelIds,
  settings,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [modelContents, setModelContents] = useState<Record<string, string>>({});
  const [modelThinkingContents, setModelThinkingContents] = useState<Record<string, string>>({});
  const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));

  const handleSend = async () => {
    if (!prompt.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setModelContents({});
    setModelThinkingContents({});
    setModelResponses({});
    const newStreamingModels = new Set(selectedModelIds);
    setStreamingModels(newStreamingModels);

    const messages: Message[] = [{ role: 'user', content: prompt }];

    const finalResponses: Record<string, ModelResponse> = {};

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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 min-h-0">
        {selectedModelIds.length > 0 ? (
          selectedModelIds.map((modelId) => {
            const model = models.find((m) => m.id === modelId);
            return (
              <ModelContainer
                key={modelId}
                modelId={modelId}
                modelName={model?.name || modelId}
                content={modelContents[modelId] || ''}
                thinkingContent={modelThinkingContents[modelId] || ''}
                response={modelResponses[modelId]}
                isStreaming={streamingModels.has(modelId)}
              />
            );
          })
        ) : (
          <div className="col-span-full flex items-center justify-center border-2 border-dashed border-mocha-surface1 rounded-xl text-mocha-surface2">
            Select up to 5 models to start evaluation
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
