import { getModelsAction, getSettingsAction } from './actions';
import { ClientApp } from '@/components/ClientApp';

export default async function Home() {
  const [models, settings] = await Promise.all([
    getModelsAction(),
    getSettingsAction(),
  ]);

  return (
    <main className="h-screen bg-mocha-base flex flex-col overflow-hidden">
      <ClientApp initialModels={models} initialSettings={settings} />
    </main>
  );
}
