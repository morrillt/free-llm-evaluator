'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Model, Settings, Conversation, ModelOverride } from '@/lib/types';
import { ModelSelector } from './ModelSelector';
import { SettingsPanel } from './SettingsPanel';
import { ChatInterface } from './ChatInterface';
import { JokeInterface } from './JokeInterface';
import { FunnyIndex } from './FunnyIndex';
import { JokeWall } from './JokeWall';
import { Button } from './ui/Button';
import { Settings as SettingsIcon, LayoutGrid, MessageSquare, Zap, ArrowRight, Github, Play, HelpCircle, X, Laugh, Trophy } from 'lucide-react';
import { saveSettingsAction, getConversationsAction, recordVisitAction } from '@/app/actions';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import posthog from 'posthog-js';

interface ClientAppProps {
  initialModels: Model[];
  initialSettings: Settings;
}

const VideoModal = ({ isOpen, onClose, title }: { isOpen: boolean; onClose: () => void; title: string }) => {
  if (!isOpen) return null;
  const videoUrl = process.env.NEXT_PUBLIC_VIDEO_URL || "https://www.youtube.com/embed/dQw4w9WgXcQ";
  const autoplayUrl = videoUrl.includes('?') ? `${videoUrl}&autoplay=1&mute=1` : `${videoUrl}?autoplay=1&mute=1`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-5xl bg-mocha-crust rounded-2xl overflow-hidden border border-mocha-surface1 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-8 py-6 bg-mocha-mantle border-b border-mocha-surface1">
          <div className="flex flex-col gap-1">
            <h3 className="text-mocha-lavender font-black text-4xl uppercase tracking-tighter">
              {title}
            </h3>
            <p className="text-mocha-yellow text-xl font-bold animate-pulse flex items-center gap-2">
              <span>meanwhile pls enjoy a song and dance.</span>
              <span className="text-sm opacity-50 font-normal">(sorry, will add real video tomorrow :)</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-mocha-surface0 hover:bg-mocha-surface1 text-mocha-text rounded-full transition-colors shadow-lg"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            className="w-full h-full"
            src={autoplayUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export const ClientApp: React.FC<ClientAppProps> = ({
  initialModels,
  initialSettings,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [view, setView] = useState<'models' | 'chat' | 'joke' | 'funny_index'>('chat');
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; title: string }>({ isOpen: false, title: '' });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('how much wood could a woodchuck chuck if a wood chuck could chuck  wood?');

  // Record visit and get count
  useEffect(() => {
    const recordVisit = async () => {
      const count = await recordVisitAction();
      setVisitorCount(count);
    };
    recordVisit();
  }, []);

  // Helper to encode thinking params: modelId1:budget1,modelId2:budget2
  const encodeThinkingParams = (overrides: Record<string, ModelOverride>) => {
    return Object.entries(overrides)
      .filter(([_, ov]) => ov.thinkingBudget !== undefined)
      .map(([id, ov]) => `${id}:${ov.thinkingBudget}`)
      .join(',');
  };

  // Helper to decode thinking params
  const decodeThinkingParams = (param: string | null): Record<string, ModelOverride> => {
    if (!param) return {};
    const overrides: Record<string, ModelOverride> = {};
    param.split(',').forEach(part => {
      const lastColonIndex = part.lastIndexOf(':');
      if (lastColonIndex !== -1) {
        const id = part.substring(0, lastColonIndex);
        const budget = part.substring(lastColonIndex + 1);
        if (id && budget) {
          overrides[id] = {
            thinkingEnabled: true,
            thinkingBudget: parseInt(budget, 10)
          };
        }
      }
    });
    return overrides;
  };

  // Initialize state from URL
  useEffect(() => {
    const r = searchParams.get('route') as any;
    const m = searchParams.get('models');
    const t = searchParams.get('thinking');
    const j = searchParams.get('joke');
    const p = searchParams.get('prompt');

    let updatedSettings = { ...settings };
    let needsUpdate = false;

    if (r && ['models', 'chat', 'joke', 'funny_index'].includes(r)) {
      setView(r);
    }

    if (m) {
      updatedSettings.selectedModels = m.split(',');
      needsUpdate = true;
    }

    if (t) {
      const overrides = decodeThinkingParams(t);
      updatedSettings.modelOverrides = { ...updatedSettings.modelOverrides, ...overrides };
      needsUpdate = true;
    }

    if (j) {
      updatedSettings.jokeSystemPrompt = j;
      needsUpdate = true;
    }

    if (p) {
      setCurrentPrompt(p);
    }

    if (needsUpdate) {
      setSettings(updatedSettings);
    }
    
    setIsInitialized(true);
  }, []); // Only on mount

  // Sync state to URL
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    if (view !== 'models') params.set('route', view);
    if (settings.selectedModels.length > 0) params.set('models', settings.selectedModels.join(','));
    
    const thinkingStr = encodeThinkingParams(settings.modelOverrides);
    if (thinkingStr) params.set('thinking', thinkingStr);
    
    if (settings.jokeSystemPrompt) params.set('joke', settings.jokeSystemPrompt);
    if (currentPrompt) params.set('prompt', currentPrompt);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    // Use window.history.replaceState to avoid adding to history on every state change
    window.history.replaceState(null, '', newUrl);
  }, [view, settings, pathname, isInitialized]);

  useEffect(() => {
    const fetchConversations = async () => {
      const convs = await getConversationsAction();
      setConversations(convs);
    };
    if (view === 'funny_index') {
      fetchConversations();
    }
  }, [view]);

  const handleToggleModel = async (modelId: string) => {
    const newSelected = settings.selectedModels.includes(modelId)
      ? settings.selectedModels.filter((id) => id !== modelId)
      : [...settings.selectedModels, modelId];
    
    if (newSelected.length > 7) return;

    const newSettings = { ...settings, selectedModels: newSelected };
    setSettings(newSettings);
    await saveSettingsAction(newSettings);
  };

  const handleRandomizeModel = async (oldModelId: string) => {
    const unselectedModels = initialModels.filter(m => !settings.selectedModels.includes(m.id));
    if (unselectedModels.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * unselectedModels.length);
    const newModelId = unselectedModels[randomIndex].id;

    const newSelected = settings.selectedModels.map(id => id === oldModelId ? newModelId : id);
    const newSettings = { ...settings, selectedModels: newSelected };
    setSettings(newSettings);
    await saveSettingsAction(newSettings);
    return newModelId;
  };

  const handleUpdateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettingsAction(newSettings);
  };

  const handleViewChange = (newView: 'models' | 'chat' | 'joke' | 'funny_index') => {
    // Track view_changed with PostHog
    posthog.capture('view_changed', {
      from_view: view,
      to_view: newView,
      selected_model_count: settings.selectedModels.length,
    });
    setView(newView);
  };


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-mocha-mantle border-b border-mocha-surface1">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-mocha-blue overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="freellmfunny logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-black text-mocha-text tracking-tight uppercase">
              Free LLM Evaluator
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-mocha-surface0 p-1 rounded-lg border border-mocha-surface1">
            <Button
              variant={view === 'models' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('models')}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Models
            </Button>
            <Button
              variant={view === 'chat' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('chat')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Evaluation
            </Button>
            <Button
              variant={view === 'joke' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('joke')}
              className="flex items-center gap-2"
            >
              <Laugh className="w-4 h-4" />
              Tell me a Joke
            </Button>
            <Button
              variant={view === 'funny_index' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('funny_index')}
              className="flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Benchmarks
            </Button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-mocha-surface0/50 rounded-lg border border-mocha-surface1/50 text-mocha-subtext0">
            <Users className="w-4 h-4 text-mocha-blue" />
            <span className="text-sm font-bold font-mono">
              {visitorCount === null ? '...' : visitorCount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 text-sm">
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

          <div className="h-6 w-px bg-mocha-surface1 hidden lg:block" />

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
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        {view === 'joke' && <JokeWall />}

        <div className="flex-1 min-h-0 p-6 overflow-hidden">
          <div className="w-full h-full flex flex-col">
            {view === 'models' ? (
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ModelSelector
                models={initialModels}
                selectedModelIds={settings.selectedModels}
                onToggleModel={handleToggleModel}
              />
              {settings.selectedModels.length > 0 && (
                <div className="mt-8 flex justify-end">
                  <Button
                    size="lg"
                    onClick={() => handleViewChange('chat')}
                    className="group"
                  >
                    Start Evaluation
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              )}
            </div>
          ) : view === 'chat' ? (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ChatInterface
                models={initialModels}
                selectedModelIds={settings.selectedModels}
                settings={settings}
                initialPrompt={currentPrompt}
                onPromptChange={setCurrentPrompt}
                onRandomizeModel={handleRandomizeModel}
                onUpdateSettings={handleUpdateSettings}
              />
            </div>
          ) : view === 'joke' ? (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <JokeInterface
                models={initialModels}
                selectedModelIds={settings.selectedModels}
                settings={settings}
                onRandomizeModel={handleRandomizeModel}
                onUpdateSettings={handleUpdateSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>
          ) : (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FunnyIndex
                models={initialModels}
                conversations={conversations}
              />
            </div>
          )}
          </div>
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

      {/* Known Issue Notification */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-1000 fill-mode-both">
        <a 
          href="https://github.com/morrillt/free-llm-evaluator/issues/1"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 bg-mocha-crust/90 backdrop-blur-md border border-mocha-red/30 hover:border-mocha-red/60 rounded-full shadow-2xl transition-all hover:scale-105 group"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-mocha-red/20 text-mocha-red group-hover:bg-mocha-red/30 transition-colors">
            <Github className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-bold tracking-tight text-mocha-subtext1 group-hover:text-mocha-text transition-colors flex items-center gap-2">
            <span>known issue pls help :)</span>
            <span className="text-mocha-red font-black uppercase tracking-widest text-[10px]">Broken Thinking Budget</span>
          </p>
          <div className="w-1.5 h-1.5 rounded-full bg-mocha-red animate-pulse shadow-[0_0_8px_rgba(243,139,168,0.5)]" />
        </a>
      </div>
    </div>
  );
};

