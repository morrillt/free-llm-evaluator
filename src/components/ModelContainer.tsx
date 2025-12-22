'use client';

import React from 'react';
import { ModelResponse } from '@/lib/types';
import { Timer, Zap, Hash, AlertCircle, ExternalLink } from 'lucide-react';

interface ModelContainerProps {
  modelId: string;
  modelName: string;
  response?: ModelResponse;
  isStreaming: boolean;
  content: string;
}

export const ModelContainer: React.FC<ModelContainerProps> = ({
  modelId,
  modelName,
  response,
  isStreaming,
  content,
}) => {
  return (
    <div className="flex flex-col h-full bg-mocha-mantle border border-mocha-surface1 rounded-xl overflow-hidden shadow-lg">
      <div className="p-3 bg-mocha-surface0 border-b border-mocha-surface1 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-mocha-lavender truncate">{modelName}</h3>
          <a
            href={`https://openrouter.ai/models/${modelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mocha-overlay0 hover:text-mocha-blue transition-colors flex-shrink-0"
            title="View on OpenRouter"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-mocha-blue rounded-full animate-pulse" />
            <span className="text-xs text-mocha-subtext0">Streaming...</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto font-sans text-mocha-text whitespace-pre-wrap">
        {content || (isStreaming ? '' : <span className="text-mocha-surface2 italic">Awaiting prompt...</span>)}
        {response?.error && (
          <div className="mt-2 p-3 bg-mocha-red/10 border border-mocha-red/20 rounded-md text-mocha-red text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{response.error}</span>
          </div>
        )}
      </div>

      {response && !isStreaming && (
        <div className="p-3 bg-mocha-crust border-t border-mocha-surface1 flex flex-wrap gap-4 text-[10px] text-mocha-subtext1">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3 h-3 text-mocha-blue" />
            <span>{(response.duration / 1000).toFixed(2)}s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-mocha-yellow" />
            <span>{response.tps} TPS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-mocha-green" />
            <span>{response.tokenCount} chars</span>
          </div>
        </div>
      )}
    </div>
  );
};
