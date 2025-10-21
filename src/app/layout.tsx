import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { RoleProvider } from '@/hooks/use-role';
import { NotificationProvider } from '@/hooks/use-notifications';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'Essoukri Artisans Pâtissiers',
  description: 'Système de gestion pour Essoukri Artisans Pâtissiers - Commandes, Production et Inventaire',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <RoleProvider>
          <NotificationProvider>
            <AppShell title="Essoukri Artisans Pâtissiers">
              {children}
            </AppShell>
          </NotificationProvider>
        </RoleProvider>
        <Toaster />
      </body>
    </html>
  );
}
