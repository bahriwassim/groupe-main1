'use client';

import { PacksManager } from './packs-manager';

export default function PacksPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des Packs</h1>
      </div>
      <PacksManager />
    </div>
  );
}
