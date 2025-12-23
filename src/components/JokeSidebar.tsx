'use client';

import React from 'react';
import { Settings } from '@/lib/types';
import { Laugh, Thermometer, Brain } from 'lucide-react';

interface JokeSidebarProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export const JokeSidebar: React.FC<JokeSidebarProps> = ({ settings, onUpdateSettings }) => {
  const updateGlobal = (key: keyof Settings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="h-full flex flex-col bg-mocha-mantle border-r border-mocha-surface1 w-80 overflow-hidden shadow-2xl p-4 space-y-6">
      <div className="p-2 border-b border-mocha-surface1 bg-mocha-crust -m-4 mb-2 px-4 py-4">
        <h2 className="text-xl font-black text-mocha-blue flex items-center gap-2 uppercase tracking-tighter">
          <Laugh className="w-6 h-6" />
          Joke Sidebar
        </h2>
        <p className="text-[10px] text-mocha-subtext1 font-medium mt-1 uppercase tracking-widest opacity-70">
          Customize the Fun
        </p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 py-2 custom-scrollbar">
        <section>
          <label className="block text-sm font-medium text-mocha-subtext1 mb-2">
            Joke Prompt
          </label>
          <textarea
            className="w-full h-40 p-3 bg-mocha-surface0 border border-mocha-surface1 rounded-xl text-mocha-text focus:outline-none focus:ring-2 focus:ring-mocha-blue resize-none text-sm"
            placeholder="What kind of jokes should the models tell?"
            value={settings.jokeSystemPrompt || ''}
            onChange={(e) => updateGlobal('jokeSystemPrompt', e.target.value)}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-mocha-subtext1 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-mocha-yellow" />
              Temperature
            </label>
            <span className="text-xs font-bold text-mocha-blue bg-mocha-blue/10 px-2 py-0.5 rounded-full">
              {settings.globalTemperature}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            className="w-full h-1.5 bg-mocha-surface0 rounded-lg appearance-none cursor-pointer accent-mocha-blue border border-mocha-surface1"
            value={settings.globalTemperature}
            onChange={(e) => updateGlobal('globalTemperature', parseFloat(e.target.value))}
          />
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[10px] text-mocha-subtext0">Precise</span>
            <span className="text-[10px] text-mocha-subtext0">Creative</span>
          </div>
        </section>

        <section className="space-y-3 p-4 bg-mocha-surface0/50 rounded-2xl border border-mocha-surface1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-mocha-text flex items-center gap-2">
              <Brain className="w-4 h-4 text-mocha-mauve" />
              Enable Thinking
            </label>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-mocha-surface1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-mocha-blue focus:ring-offset-2 focus:ring-offset-mocha-mantle">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.globalThinkingEnabled}
                onChange={(e) => updateGlobal('globalThinkingEnabled', e.target.checked)}
              />
              <div 
                className={`h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${settings.globalThinkingEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                onClick={() => updateGlobal('globalThinkingEnabled', !settings.globalThinkingEnabled)}
              />
            </div>
          </div>
          
          {settings.globalThinkingEnabled && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-mocha-subtext1 uppercase">Budget (Tokens)</label>
                <span className="text-[10px] font-mono text-mocha-mauve">{settings.globalThinkingBudget}</span>
              </div>
              <input
                type="number"
                className="w-full p-2 bg-mocha-crust border border-mocha-surface1 rounded-lg text-xs text-mocha-text focus:outline-none focus:ring-1 focus:ring-mocha-mauve"
                value={settings.globalThinkingBudget}
                onChange={(e) => updateGlobal('globalThinkingBudget', parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          <p className="text-[10px] text-mocha-green font-bold italic leading-tight">
            Trying to fix this! Let me know if it works.
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-mocha-surface1">
        <p className="text-[10px] text-mocha-subtext1 text-center italic opacity-50">
          Changes are saved automatically
        </p>
      </div>
    </div>
  );
};

