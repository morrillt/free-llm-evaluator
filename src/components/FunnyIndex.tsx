'use client';

import React from 'react';
import { Conversation, Model } from '@/lib/types';
import { Trophy, Laugh, Meh } from 'lucide-react';

interface FunnyIndexProps {
  models: Model[];
  conversations: Conversation[];
}

export const FunnyIndex: React.FC<FunnyIndexProps> = ({ models, conversations }) => {
  const stats = React.useMemo(() => {
    const modelStats: Record<string, { funny: number; notFunny: number }> = {};

    conversations.forEach((conv) => {
      Object.entries(conv.responses).forEach(([modelId, response]) => {
        if (!modelStats[modelId]) {
          modelStats[modelId] = { funny: 0, notFunny: 0 };
        }
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
        const total = stat.funny + stat.notFunny;
        const score = total > 0 ? (stat.funny / total) * 100 : 0;
        return {
          id: modelId,
          name: model?.name || modelId,
          funny: stat.funny,
          notFunny: stat.notFunny,
          total,
          score,
        };
      })
      .sort((a, b) => b.score - a.score || b.funny - a.funny);
  }, [models, conversations]);

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="text-center space-y-2 flex-shrink-0">
        <h2 className="text-4xl font-black text-mocha-text flex items-center justify-center gap-3 uppercase">
          <Trophy className="w-10 h-10 text-mocha-yellow" />
          The Funny Index
        </h2>
        <p className="text-mocha-subtext1 text-lg">Ranking the world's free LLMs by their Larry David approved humor.</p>
      </div>

      <div className="flex-1 bg-mocha-mantle border border-mocha-surface1 rounded-2xl overflow-auto shadow-2xl min-h-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-mocha-surface0 text-mocha-lavender text-sm uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Rank</th>
              <th className="px-6 py-4 font-bold">Model</th>
              <th className="px-6 py-4 font-bold">Funny Score</th>
              <th className="px-6 py-4 font-bold text-center">Stats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mocha-surface1">
            {stats.length > 0 ? (
              stats.map((stat, index) => (
                <tr key={stat.id} className="hover:bg-mocha-surface0/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                      ${index === 0 ? 'bg-mocha-yellow text-mocha-base' : 
                        index === 1 ? 'bg-mocha-overlay2 text-mocha-base' :
                        index === 2 ? 'bg-mocha-peach text-mocha-base' :
                        'bg-mocha-surface1 text-mocha-subtext1'}
                    `}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-mocha-text">{stat.name}</div>
                    <div className="text-[10px] text-mocha-overlay0 font-mono truncate max-w-[200px]">{stat.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-mocha-surface1 rounded-full overflow-hidden min-w-[100px]">
                        <div 
                          className="h-full bg-mocha-green transition-all duration-1000" 
                          style={{ width: `${stat.score}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-mocha-green w-12 text-right">
                        {stat.score.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-mocha-green" title="Funny">
                        <Laugh className="w-4 h-4" />
                        <span className="font-bold">{stat.funny}</span>
                      </div>
                      <div className="flex items-center gap-1 text-mocha-red" title="Not Funny">
                        <Meh className="w-4 h-4" />
                        <span className="font-bold">{stat.notFunny}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-mocha-subtext1 italic">
                  No ratings yet. Go to "Tell me a Joke" and start judging!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


