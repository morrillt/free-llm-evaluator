'use client';

import React, { useState, useMemo } from 'react';
import { Model } from '@/lib/types';
import { Button } from './ui/Button';
import { Check, Filter, ExternalLink } from 'lucide-react';

interface ModelSelectorProps {
  models: Model[];
  selectedModelIds: string[];
  onToggleModel: (modelId: string) => void;
}

const FILTER_OPTIONS = ['Qwen3', 'Moonshot', 'Google', 'NVIDIA', 'z', 'DeepSeek'];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelIds,
  onToggleModel,
}) => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const filteredModels = useMemo(() => {
    if (activeFilters.length === 0) return models;
    return models.filter((model) =>
      activeFilters.some((filter) =>
        model.name.toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [models, activeFilters]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, Model[]> = {};
    
    filteredModels.forEach((model) => {
      // Extract provider name (usually first word or before colon)
      let provider = 'Other';
      if (model.name.includes(':')) {
        provider = model.name.split(':')[0].trim();
      } else {
        provider = model.name.split(' ')[0].trim();
      }
      
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(model);
    });

    // Sort groups by provider name, but keep 'Other' at the end
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [filteredModels]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-mocha-text mb-2">Select Models</h2>
          <p className="text-mocha-subtext1">Choose up to 5 free models to evaluate and compare.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2 text-mocha-subtext1">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium whitespace-nowrap">Quick Filters:</span>
          </div>
          {FILTER_OPTIONS.map((filter) => (
            <Button
              key={filter}
              variant={activeFilters.includes(filter) ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleFilter(filter)}
              className="rounded-full px-4"
            >
              {filter}
            </Button>
          ))}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilters([])}
              className="text-mocha-red hover:text-mocha-red/80 ml-2"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pb-2 border-b border-mocha-surface1">
        <h3 className="text-lg font-semibold text-mocha-lavender">Available Models</h3>
        <span className="text-sm text-mocha-subtext0 font-medium">
          {selectedModelIds.length} / 5 selected
        </span>
      </div>

      <div className="space-y-8">
        {groupedModels.map(([provider, providerModels]) => (
          <div key={provider} className="space-y-3">
            <h3 className="text-sm font-bold text-mocha-overlay2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-mocha-blue rounded-full"></span>
              {provider}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {providerModels.map((model) => {
                const isSelected = selectedModelIds.includes(model.id);
                const isDisabled = !isSelected && selectedModelIds.length >= 5;

                return (
                  <div
                    key={model.id}
                    className={cn(
                      'p-4 rounded-lg border transition-all cursor-pointer relative group flex flex-col justify-between h-full',
                      isSelected
                        ? 'border-mocha-blue bg-mocha-surface0 ring-1 ring-mocha-blue'
                        : 'border-mocha-surface1 bg-mocha-mantle hover:border-mocha-overlay0',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !isDisabled && onToggleModel(model.id)}
                  >
                    <a
                      href={`https://openrouter.ai/models/${model.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 p-1 text-mocha-overlay0 hover:text-mocha-blue transition-colors z-10"
                      onClick={(e) => e.stopPropagation()}
                      title="View on OpenRouter"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-mocha-text leading-tight group-hover:text-mocha-blue transition-colors">
                            {model.name}
                          </h4>
                          <p className="text-[10px] text-mocha-subtext0 font-mono mt-1 opacity-60">
                            {model.id}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="bg-mocha-blue rounded-full p-1 ml-2 flex-shrink-0">
                            <Check className="w-3 h-3 text-mocha-base" />
                          </div>
                        )}
                      </div>
                      
                      {model.description && (
                        <div className="text-xs text-mocha-subtext1 line-clamp-2 leading-relaxed">
                          {model.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredModels.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-mocha-surface1 rounded-xl">
            <p className="text-mocha-subtext0">No models match your selected filters.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilters([])}
              className="mt-4"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
