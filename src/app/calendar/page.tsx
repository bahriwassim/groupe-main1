'use client';

import dynamic from 'next/dynamic';

const CalendarView = dynamic(() => import('./calendar-view'), {
  ssr: false,
});

export default function CalendarPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Calendrier des Commandes</h1>
      </div>
      <CalendarView />
    </div>
  );
}
