'use client';

import React from 'react';
import { ModelResponse, Settings } from '@/lib/types';
import { Timer, Zap, Hash, AlertCircle, ExternalLink, ChevronDown, ChevronRight, Brain, Dices, Sliders, Laugh, Meh, RefreshCw } from 'lucide-react';
import posthog from 'posthog-js';

interface ModelContainerProps {
  modelId: string;
  modelName: string;
  response?: ModelResponse;
  isStreaming: boolean;
  content: string;
  thinkingContent?: string;
  onRandomize?: () => void;
  onRefresh?: () => void;
  settings?: Settings;
  onUpdateSettings?: (settings: Settings) => void;
  rating?: 'funny' | 'not_funny';
  onRate?: (rating: 'funny' | 'not_funny') => void;
}

export const ModelContainer: React.FC<ModelContainerProps> = ({
  modelId,
  modelName,
  response,
  isStreaming,
  content,
  thinkingContent,
  onRandomize,
  onRefresh,
  settings,
  onUpdateSettings,
  rating,
  onRate,
}) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = React.useState(false);

  const override = settings?.modelOverrides[modelId];
  const currentThinkingBudget = override?.thinkingBudget ?? settings?.globalThinkingBudget ?? 75;
  const isThinkingEnabled = override?.thinkingEnabled ?? settings?.globalThinkingEnabled ?? false;

  const handleBudgetChange = (value: number) => {
    if (!settings || !onUpdateSettings) return;
    const newOverrides = { ...settings.modelOverrides };
    newOverrides[modelId] = {
      ...(newOverrides[modelId] || {}),
      thinkingBudget: value,
      thinkingEnabled: true, // Auto-enable if adjusting budget
    };
    onUpdateSettings({ ...settings, modelOverrides: newOverrides });
  };

  return (
    <div className="flex flex-col h-full bg-mocha-mantle border border-mocha-surface1 rounded-xl overflow-hidden shadow-lg group/container">
      <div className="p-3 bg-mocha-surface0 border-b border-mocha-surface1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mocha-overlay0 hover:text-mocha-green transition-colors"
              title="Re-run prompt for this model"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try again</span>
            </button>
          )}
          {onRandomize && (
            <button
              onClick={() => {
                // Track model_randomized with PostHog
                posthog.capture('model_randomized', {
                  old_model_id: modelId,
                  old_model_name: modelName,
                  trigger: 'header_button',
                });
                onRandomize();
              }}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mocha-overlay0 hover:text-mocha-yellow transition-colors"
              title="Swap for a random model and re-run"
            >
              <Dices className="w-3 h-3" />
              <span>Random other model</span>
            </button>
          )}
        </div>
      </div>

      {/* Thinking Slider - Shown by default */}
      <div className="p-4 bg-mocha-surface0/50 border-b border-mocha-surface1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-mocha-mauve uppercase tracking-wider">Thinking Budget</span>
          <span className="text-3xl font-mono font-bold text-mocha-subtext1">{currentThinkingBudget.toLocaleString()} <span className="text-sm">tokens</span></span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="50"
          className="w-full h-3 accent-mocha-mauve cursor-pointer"
          value={currentThinkingBudget}
          onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
        />
        <div className="flex justify-between mt-2 text-xs text-mocha-overlay0 font-mono font-bold">
          <span>0</span>
          <span>250</span>
          <span>500</span>
          <span>750</span>
          <span>1K</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {(thinkingContent || response?.thinkingContent) && (
          <div className="border-b border-mocha-surface1">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-mocha-surface0 transition-colors group"
            >
              <div className="flex items-center gap-2 text-mocha-mauve font-black text-sm uppercase tracking-wider">
                <Brain className="w-4 h-4" />
                <span>Thinking</span>
                {isThinkingExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex gap-4 text-base font-mono font-bold text-mocha-overlay1">
                {(response?.thinkingDuration || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    {(response!.thinkingDuration! / 1000).toFixed(2)}s
                  </span>
                )}
                {(thinkingContent?.length || response?.thinkingContent?.length || 0) > 0 && (
                  <span className={`flex items-center gap-1 ${
                    response?.thinkingTokenCount && settings?.globalThinkingBudget && response.thinkingTokenCount > (settings.modelOverrides[modelId]?.thinkingBudget || settings.globalThinkingBudget)
                      ? 'text-mocha-red animate-pulse'
                      : ''
                  }`}>
                    <Hash className="w-3.5 h-3.5" />
                    {response?.thinkingTokenCount || Math.ceil((thinkingContent?.length || response?.thinkingContent?.length || 0) / 3.5)} {response?.thinkingTokenCount ? 'tokens' : 'est. tokens'}
                  </span>
                )}
              </div>
            </button>
            {isThinkingExpanded && (
              <div className="px-4 pb-4 text-xs text-mocha-overlay1 italic whitespace-pre-wrap border-t border-mocha-surface0/50 pt-2 font-mono">
                {thinkingContent || response?.thinkingContent}
              </div>
            )}
          </div>
        )}

        <div className="p-4 font-sans text-mocha-text whitespace-pre-wrap">
          {content || (isStreaming ? '' : <span className="text-mocha-surface2 italic text-sm">Awaiting prompt...</span>)}
          {response?.error && (
            <div className="mt-2 p-3 bg-mocha-red/10 border border-mocha-red/20 rounded-md text-mocha-red text-sm flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{response.error}</span>
              </div>
              
              {response.error.includes('Rate limit error') && onRandomize && (
                <button
                  onClick={() => {
                    // Track model_randomized with PostHog (triggered from error panel)
                    posthog.capture('model_randomized', {
                      old_model_id: modelId,
                      old_model_name: modelName,
                      trigger: 'rate_limit_error',
                      error: response.error,
                    });
                    onRandomize();
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-mocha-surface0 hover:bg-mocha-surface1 rounded-lg border border-mocha-red/30 transition-all group"
                >
                  <Dices className="w-10 h-10 text-mocha-yellow group-hover:rotate-12 transition-transform" />
                  <span className="font-bold text-mocha-text">Want to try a random different one?</span>
                  <span className="text-[10px] text-mocha-overlay0 uppercase font-bold tracking-widest">(Swaps and re-runs current prompt)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {response && !isStreaming && onRate && (
        <div className="p-4 bg-mocha-surface0/30 border-t border-mocha-surface1 flex flex-row gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            onClick={() => onRate('funny')}
            disabled={!!rating}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-4 transition-all font-black text-xl ${
              rating === 'funny' 
                ? 'bg-mocha-green border-mocha-green text-mocha-base scale-[1.02] shadow-xl shadow-mocha-green/40' 
                : 'bg-mocha-surface0 border-mocha-surface1 text-mocha-green hover:border-mocha-green hover:scale-[1.05]'
            } ${rating && rating !== 'funny' ? 'opacity-20' : ''}`}
          >
            <Laugh className="w-6 h-6" />
            FUNNY
          </button>
          <button
            onClick={() => onRate('not_funny')}
            disabled={!!rating}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-4 transition-all font-black text-xl ${
              rating === 'not_funny' 
                ? 'bg-mocha-red border-mocha-red text-mocha-base scale-[1.02] shadow-xl shadow-mocha-red/40' 
                : 'bg-mocha-surface0 border-mocha-surface1 text-mocha-red hover:border-mocha-red hover:scale-[1.05]'
            } ${rating && rating !== 'not_funny' ? 'opacity-20' : ''}`}
          >
            <Meh className="w-6 h-6" />
            NOT FUNNY
          </button>
        </div>
      )}

      {response && !isStreaming && (
        <div className="p-4 bg-mocha-crust border-t border-mocha-surface1 flex flex-wrap gap-x-8 gap-y-4 text-2xl font-bold text-mocha-subtext1">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-mocha-blue" />
            <div className="flex flex-col">
              <span>{(response.duration / 1000).toFixed(2)}s</span>
              {response.ttft !== undefined && (
                <span className="text-sm font-black uppercase tracking-widest text-mocha-overlay0 opacity-80 mt-1">TTFT: {response.ttft}ms</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-mocha-yellow" />
            <span>{response.tps} TPS</span>
          </div>
          <div className="flex items-center gap-3">
            <Hash className="w-8 h-8 text-mocha-green" />
            <span>{response.tokenCount} chars</span>
          </div>
        </div>
      )}
    </div>
  );
};


