'use client';

import React from 'react';
import { Settings, ModelOverride } from '@/lib/types';
import { Button } from './ui/Button';
import { Settings as SettingsIcon, X } from 'lucide-react';

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const updateGlobal = (key: keyof Settings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-mocha-mantle border-l border-mocha-surface1 p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-mocha-lavender" />
            <h2 className="text-2xl font-bold text-mocha-text">Global Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="block text-sm font-medium text-mocha-subtext1 mb-2">
              Default System Prompt
            </label>
            <textarea
              className="w-full h-32 p-3 bg-mocha-surface0 border border-mocha-surface1 rounded-md text-mocha-text focus:outline-none focus:ring-2 focus:ring-mocha-blue"
              value={settings.globalSystemPrompt}
              onChange={(e) => updateGlobal('globalSystemPrompt', e.target.value)}
            />
          </section>

          <section>
            <label className="block text-sm font-medium text-mocha-subtext1 mb-2">
              Joke Mode Prompt (Larry David Edition)
            </label>
            <textarea
              className="w-full h-32 p-3 bg-mocha-surface0 border border-mocha-surface1 rounded-md text-mocha-text focus:outline-none focus:ring-2 focus:ring-mocha-pink"
              placeholder="What would Larry David say?"
              value={settings.jokeSystemPrompt || ''}
              onChange={(e) => updateGlobal('jokeSystemPrompt', e.target.value)}
            />
          </section>

          <section>
            <label className="block text-sm font-medium text-mocha-subtext1 mb-2">
              Temperature ({settings.globalTemperature})
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              className="w-full accent-mocha-blue"
              value={settings.globalTemperature}
              onChange={(e) => updateGlobal('globalTemperature', parseFloat(e.target.value))}
            />
          </section>

          <section className="flex flex-col gap-2 p-4 bg-mocha-surface0 rounded-lg border border-mocha-surface1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-mocha-text">Enable Thinking</h3>
                <p className="text-xs text-mocha-subtext0">For models that support reasoning</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-mocha-blue"
                checked={settings.globalThinkingEnabled}
                onChange={(e) => updateGlobal('globalThinkingEnabled', e.target.checked)}
              />
            </div>
            <p className="text-[10px] text-mocha-red italic">
              currently not working, feel free to help
            </p>
          </section>

          <div className="pt-6 border-t border-mocha-surface1">
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

