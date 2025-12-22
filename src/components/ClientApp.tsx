'use client';

import React, { useState, useEffect } from 'react';
import { Model, Settings } from '@/lib/types';
import { ModelSelector } from './ModelSelector';
import { SettingsPanel } from './SettingsPanel';
import { ChatInterface } from './ChatInterface';
import { Button } from './ui/Button';
import { Settings as SettingsIcon, LayoutGrid, MessageSquare, Zap, ArrowRight, Github, Play, HelpCircle, X } from 'lucide-react';
import { saveSettingsAction } from '@/app/actions';

interface ClientAppProps {
  initialModels: Model[];
  initialSettings: Settings;
}

const VideoModal = ({ isOpen, onClose, title }: { isOpen: boolean; onClose: () => void; title: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl aspect-video bg-mocha-crust rounded-2xl overflow-hidden border border-mocha-surface1 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-mocha-surface0 hover:bg-mocha-surface1 text-mocha-text rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="absolute top-4 left-6 text-mocha-lavender font-bold text-lg pointer-events-none">
          {title}
        </div>
        <iframe
          className="w-full h-full"
          src={process.env.NEXT_PUBLIC_VIDEO_URL || "https://www.youtube.com/embed/dQw4w9WgXcQ"}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export const ClientApp: React.FC<ClientAppProps> = ({
  initialModels,
  initialSettings,
}) => {
  const [view, setView] = useState<'models' | 'chat'>('models');
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; title: string }>({ isOpen: false, title: '' });

  const handleToggleModel = async (modelId: string) => {
    const newSelected = settings.selectedModels.includes(modelId)
      ? settings.selectedModels.filter((id) => id !== modelId)
      : [...settings.selectedModels, modelId];
    
    if (newSelected.length > 5) return;

    const newSettings = { ...settings, selectedModels: newSelected };
    setSettings(newSettings);
    await saveSettingsAction(newSettings);
  };

  const handleUpdateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettingsAction(newSettings);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-mocha-mantle border-b border-mocha-surface1">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-mocha-blue rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-mocha-base fill-current" />
            </div>
            <h1 className="text-xl font-bold text-mocha-text tracking-tight">
              Free LLM <span className="text-mocha-blue">Evaluator</span>
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-sm border-l border-mocha-surface1 pl-6">
            <a 
              href="https://github.com/morrillt/free-llm-evaluator" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-mocha-subtext1 hover:text-mocha-blue transition-colors"
            >
              <Github className="w-4 h-4" />
              Repository
            </a>
            <button 
              onClick={() => setVideoModal({ isOpen: true, title: 'How to use' })}
              className="flex items-center gap-2 text-mocha-subtext1 hover:text-mocha-blue transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              How to use
            </button>
            <button 
              onClick={() => setVideoModal({ isOpen: true, title: 'oneshotted by BROZ OS' })}
              className="flex items-center gap-2 text-mocha-mauve hover:text-mocha-pink transition-colors font-mono font-bold"
            >
              <Play className="w-4 h-4" />
              oneshotted by BROZ OS
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-mocha-surface0 p-1 rounded-lg">
            <Button
              variant={view === 'models' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('models')}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Models
            </Button>
            <Button
              variant={view === 'chat' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('chat')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Evaluation
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="text-mocha-subtext1 hover:text-mocha-text"
          >
            <SettingsIcon className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto h-full">
          {view === 'models' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ModelSelector
                models={initialModels}
                selectedModelIds={settings.selectedModels}
                onToggleModel={handleToggleModel}
              />
              {settings.selectedModels.length > 0 && (
                <div className="mt-8 flex justify-end">
                  <Button
                    size="lg"
                    onClick={() => setView('chat')}
                    className="group"
                  >
                    Start Evaluation
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ChatInterface
                models={initialModels}
                selectedModelIds={settings.selectedModels}
                settings={settings}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings Sidebar */}
      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Video Modal */}
      <VideoModal 
        isOpen={videoModal.isOpen} 
        onClose={() => setVideoModal({ isOpen: false, title: '' })} 
        title={videoModal.title}
      />
    </div>
  );
};

