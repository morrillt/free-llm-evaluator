import { getModelsAction, getSettingsAction } from './actions';
import { ClientApp } from '@/components/ClientApp';
import { Suspense } from 'react';

export default async function Home() {
  const [models, settings] = await Promise.all([
    getModelsAction(),
    getSettingsAction(),
  ]);

  return (
    <main className="h-screen bg-mocha-base flex flex-col overflow-hidden">
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-mocha-text">Loading...</div>}>
        <ClientApp initialModels={models} initialSettings={settings} />
      </Suspense>
    </main>
  );
}
