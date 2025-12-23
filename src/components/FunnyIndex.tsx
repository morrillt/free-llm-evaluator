'use client';

import React, { useState } from 'react';
import { Conversation, Model } from '@/lib/types';
import { Trophy, Laugh, Meh, ArrowUpDown, ArrowUp, ArrowDown, Zap, Clock, Hash, Timer, Activity } from 'lucide-react';

interface FunnyIndexProps {
  models: Model[];
  conversations: Conversation[];
}

type SortField = 'name' | 'runs' | 'avgDuration' | 'avgTTFT' | 'avgThinkingTime' | 'avgTPS' | 'funnyScore' | 'avgCost';
type SortOrder = 'asc' | 'desc';
type DashboardMode = 'serious' | 'funny';

export const FunnyIndex: React.FC<FunnyIndexProps> = ({ models, conversations }) => {
  const [sortField, setSortField] = useState<SortField>('avgDuration');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [mode, setMode] = useState<DashboardMode>('serious');

  const stats = React.useMemo(() => {
    const modelStats: Record<string, { 
      funny: number; 
      notFunny: number;
      totalDuration: number;
      totalTTFT: number;
      totalThinkingDuration: number;
      totalTPS: number;
      totalCost: number;
      runs: number;
    }> = {};

    conversations.forEach((conv) => {
      Object.entries(conv.responses).forEach(([modelId, response]) => {
        if (!response.duration || response.duration <= 0) return;

        if (!modelStats[modelId]) {
          modelStats[modelId] = { 
            funny: 0, 
            notFunny: 0,
            totalDuration: 0,
            totalTTFT: 0,
            totalThinkingDuration: 0,
            totalTPS: 0,
            totalCost: 0,
            runs: 0
          };
        }
        modelStats[modelId].runs += 1;
        modelStats[modelId].totalDuration += response.duration || 0;
        modelStats[modelId].totalTTFT += response.ttft || 0;
        modelStats[modelId].totalThinkingDuration += response.thinkingDuration || 0;
        modelStats[modelId].totalTPS += response.tps || 0;
        modelStats[modelId].totalCost += response.cost || 0;

        if (response.rating === 'funny') {
          modelStats[modelId].funny += 1;
        } else if (response.rating === 'not_funny') {
          modelStats[modelId].notFunny += 1;
        }
      });
    });

    return Object.entries(modelStats)
      .map(([modelId, stat]) => {
        const model = models.find((m) => m.id === modelId);
        const ratedTotal = stat.funny + stat.notFunny;
        const funnyScore = ratedTotal > 0 ? (stat.funny / ratedTotal) * 100 : 0;
        return {
          id: modelId,
          name: model?.name || modelId,
          funny: stat.funny,
          notFunny: stat.notFunny,
          funnyScore,
          avgDuration: stat.totalDuration / stat.runs,
          avgTTFT: stat.totalTTFT / stat.runs,
          avgThinkingTime: stat.totalThinkingDuration / stat.runs,
          avgTPS: stat.totalTPS / stat.runs,
          avgCost: stat.totalCost / stat.runs,
          runs: stat.runs,
        };
      })
      .filter((stat) => stat.avgDuration > 0)
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else {
          comparison = (a[sortField] as number) - (b[sortField] as number);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [models, conversations, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to desc for stats, asc for name and durations
      if (field === 'avgDuration' || field === 'avgTTFT' || field === 'avgThinkingTime') {
        setSortOrder('asc');
      } else if (field === 'name') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
  };

  const SortHeader = ({ field, label, icon: Icon }: { field: SortField, label: string, icon?: any }) => (
    <th 
      className="px-4 py-4 font-bold cursor-pointer hover:bg-mocha-surface1 transition-colors group"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-mocha-overlay2" />}
        <span className="whitespace-nowrap">{label}</span>
        <div className={`transition-opacity ${sortField === field ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
          {sortField === field ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </div>
      </div>
    </th>
  );

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="flex flex-col items-center space-y-6 flex-shrink-0">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-mocha-text flex items-center justify-center gap-3 uppercase tracking-tighter">
            {mode === 'funny' ? <Trophy className="w-10 h-10 text-mocha-yellow" /> : <Zap className="w-10 h-10 text-mocha-blue" />}
            {mode === 'funny' ? 'LLM FUNNY BENCH' : 'LLM PERFORMANCE BENCH'}
          </h2>
          <p className="text-mocha-subtext1 text-lg font-medium">
            {mode === 'funny' 
              ? "Ranking the world's free LLMs by their humor and personality."
              : "Technical benchmarks of free LLMs based on real-world speed and latency."}
          </p>
        </div>

        <div className="flex p-1 bg-mocha-surface0 rounded-xl border border-mocha-surface1 shadow-inner">
          <button
            onClick={() => setMode('serious')}
            className={`px-6 py-2 rounded-lg font-black uppercase tracking-widest text-xs transition-all ${
              mode === 'serious' 
                ? 'bg-mocha-blue text-mocha-base shadow-lg' 
                : 'text-mocha-subtext1 hover:text-mocha-text'
            }`}
          >
            Serious Mode
          </button>
          <button
            onClick={() => setMode('funny')}
            className={`px-6 py-2 rounded-lg font-black uppercase tracking-widest text-xs transition-all ${
              mode === 'funny' 
                ? 'bg-mocha-yellow text-mocha-base shadow-lg' 
                : 'text-mocha-subtext1 hover:text-mocha-text'
            }`}
          >
            Funny Mode
          </button>
        </div>
      </div>

      <div className="flex-1 bg-mocha-mantle border border-mocha-surface1 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-mocha-surface0 text-mocha-lavender text-[11px] uppercase tracking-widest border-b border-mocha-surface1">
                <th className="px-6 py-4 font-bold w-16">Rank</th>
                <SortHeader field="name" label="Model" />
                <SortHeader field="runs" label="Runs" icon={Hash} />
                <SortHeader field="avgDuration" label="Avg Duration" icon={Clock} />
                <SortHeader field="avgTTFT" label="Avg TTFT" icon={Timer} />
                <SortHeader field="avgThinkingTime" label="Avg Thinking" icon={Activity} />
                <SortHeader field="avgTPS" label="Avg TPS" icon={Zap} />
                <SortHeader field="avgCost" label="Avg Cost" icon={Timer} />
                {mode === 'funny' && <SortHeader field="funnyScore" label="Funny Score" icon={Laugh} />}
              </tr>
            </thead>
            <tbody className="divide-y divide-mocha-surface1">
              {stats.length > 0 ? (
                stats.map((stat, index) => (
                  <tr key={stat.id} className="hover:bg-mocha-surface0/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm
                        ${index === 0 && sortField === 'avgDuration' && sortOrder === 'asc' ? (mode === 'funny' ? 'bg-mocha-yellow' : 'bg-mocha-blue') + ' text-mocha-base shadow-lg' : 
                          index === 1 && sortField === 'avgDuration' && sortOrder === 'asc' ? 'bg-mocha-overlay2 text-mocha-base' :
                          index === 2 && sortField === 'avgDuration' && sortOrder === 'asc' ? 'bg-mocha-peach text-mocha-base' :
                          'bg-mocha-surface1 text-mocha-subtext1'}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-mocha-text group-hover:text-mocha-lavender transition-colors">{stat.name}</span>
                        <span className="text-[10px] text-mocha-overlay0 font-mono truncate max-w-[180px]">{stat.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono font-bold text-mocha-subtext1">{stat.runs}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`font-mono font-bold ${stat.avgDuration < 2000 ? 'text-mocha-green' : stat.avgDuration < 5000 ? 'text-mocha-yellow' : 'text-mocha-red'}`}>
                          {(stat.avgDuration / 1000).toFixed(2)}s
                        </span>
                        <span className="text-[10px] text-mocha-overlay0 uppercase font-black">total</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`font-mono font-bold ${stat.avgTTFT < 500 ? 'text-mocha-green' : stat.avgTTFT < 1500 ? 'text-mocha-yellow' : 'text-mocha-red'}`}>
                          {stat.avgTTFT.toFixed(0)}ms
                        </span>
                        <span className="text-[10px] text-mocha-overlay0 uppercase font-black">latency</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`font-mono font-bold ${stat.avgThinkingTime > 0 ? 'text-mocha-mauve' : 'text-mocha-overlay0'}`}>
                          {stat.avgThinkingTime > 0 ? `${(stat.avgThinkingTime / 1000).toFixed(2)}s` : '0s'}
                        </span>
                        <span className="text-[10px] text-mocha-overlay0 uppercase font-black">thinking</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`font-mono font-bold ${stat.avgTPS > 50 ? 'text-mocha-green' : stat.avgTPS > 20 ? 'text-mocha-yellow' : 'text-mocha-red'}`}>
                          {stat.avgTPS.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-mocha-overlay0 uppercase font-black">tok/s</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-mocha-lavender">
                          ${stat.avgCost.toFixed(6)}
                        </span>
                        <span className="text-[10px] text-mocha-overlay0 uppercase font-black">avg cost</span>
                      </div>
                    </td>
                    {mode === 'funny' && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-mocha-surface1 rounded-full overflow-hidden min-w-[80px]">
                            <div 
                              className="h-full bg-mocha-green transition-all duration-1000" 
                              style={{ width: `${stat.funnyScore}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 min-w-[60px] justify-end">
                            <span className="font-mono font-bold text-mocha-green">
                              {stat.funnyScore.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-tighter">
                          <div className="flex items-center gap-1 text-mocha-green/70">
                            <Laugh className="w-3 h-3" />
                            {stat.funny}
                          </div>
                          <div className="flex items-center gap-1 text-mocha-red/70">
                            <Meh className="w-3 h-3" />
                            {stat.notFunny}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={mode === 'funny' ? 8 : 7} className="px-6 py-20 text-center text-mocha-subtext1 italic bg-mocha-mantle">
                    <div className="flex flex-col items-center gap-4">
                      <Activity className="w-12 h-12 text-mocha-surface2 animate-pulse" />
                      <p>No performance data recorded yet.</p>
                      <p className="text-sm not-italic">Go to "Evaluation" or "Tell me a Joke" to start benchmarking!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-mocha-surface0/30 border-t border-mocha-surface1 text-[10px] text-mocha-overlay1 flex justify-between items-center font-bold uppercase tracking-widest">
          <span>* Stats aggregated from all local sessions</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-mocha-green" /> Fast (&lt;2s)</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-mocha-yellow" /> Medium</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-mocha-red" /> Slow (&gt;5s)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
