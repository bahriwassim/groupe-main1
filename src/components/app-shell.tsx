'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger
} from '@/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRole, UserRole, ALL_ROLES } from '@/hooks/use-role';
import { ChefHat, LayoutDashboard, ShoppingCart, UtensilsCrossed, Calendar, FileText, BarChart2, UserCog, Package, Settings, LifeBuoy, Factory, Users, TrendingUp, PackageOpen } from 'lucide-react';
import { Logo } from '@/components/logo';
import { NotificationCenter } from '@/components/notification-center';

const navItems = [
  {
    href: '/',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    roles: ['Admin', 'Sales', 'Planning', 'Accounting'],
    description: 'Vue d\'ensemble de l\'activité'
  },
  {
    href: '/products',
    label: 'Produits',
    icon: Package,
    roles: ['Admin', 'Sales', 'Planning'],
    description: 'Gestion du catalogue produits'
  },
  {
    href: '/packs',
    label: 'Packs',
    icon: PackageOpen,
    roles: ['Admin'],
    description: 'Gestion des packs de produits'
  },
  {
    href: '/orders',
    label: 'Commandes',
    icon: ShoppingCart,
    roles: ['Admin', 'Sales', 'Planning', 'Accounting'],
    description: 'Suivi des commandes clients'
  },
  {
    href: '/calendar',
    label: 'Calendrier',
    icon: Calendar,
    roles: ['Admin', 'Sales', 'Planning', 'Production', 'Quality'],
    description: 'Planning et organisation'
  },
  {
    href: '/production',
    label: 'Production',
    icon: UtensilsCrossed,
    roles: ['Admin', 'Planning', 'Production', 'Quality'],
    description: 'Gestion de la production'
  },
  {
    href: '/production/production-orders',
    label: 'Ordres de Fabrication',
    icon: Factory,
    roles: ['Admin', 'Planning', 'Production', 'Quality'],
    description: 'Suivi des ordres de fabrication'
  },
];

const roleDescriptions: Record<UserRole, string> = {
  'Admin': 'Accès complet à toutes les fonctionnalités',
  'Sales': 'Gestion des ventes et commandes',
  'Planning': 'Planification et organisation',
  'Production': 'Gestion de la production',
  'Quality': 'Contrôle qualité',
  'Accounting': 'Gestion comptable et financière'
};

export function AppShell({ children, title }: { children: React.ReactNode, title: string }) {
  const { role, setRole } = useRole();
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-center py-2">
            <Logo variant="small" className="mx-auto" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} prefetch={false}>
                  <SidebarMenuButton isActive={pathname === item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <Separator className="my-4" />

          {/* Notifications dans la sidebar */}
          <div className="px-3">
            <NotificationCenter />
          </div>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
          
          {/* Sélecteur de rôle amélioré */}
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-sidebar-foreground/70 flex items-center gap-2">
                <UserCog className="h-3 w-3" />
                Rôle Actuel
              </label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger className="w-full bg-sidebar-primary text-sidebar-primary-foreground focus:ring-sidebar-ring">
                  <SelectValue placeholder="Changer de rôle" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((roleName) => (
                    <SelectItem key={roleName} value={roleName}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{roleName}</span>
                        <span className="text-xs text-muted-foreground">
                          {roleDescriptions[roleName]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Indicateur de rôle actuel */}
            <div className="flex items-center gap-2 p-2 bg-sidebar-primary/20 rounded-lg">
              <Badge variant="secondary" className="text-xs">
                {role}
              </Badge>
              <span className="text-xs text-sidebar-foreground/70">
                {roleDescriptions[role]}
              </span>
            </div>
          </div>
          
          <Separator className="my-2" />
          
          {/* Profil utilisateur */}
          <div className="p-3 flex items-center gap-3">
            <Avatar>
              <AvatarImage src="https://picsum.photos/100" alt="User" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {role.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{role} User</span>
              <span className="text-xs text-muted-foreground truncate">user@essoukri.com</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {/* Header avec trigger mobile */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">{title || 'Essoukri'}</h1>
        </header>

        <main className="min-h-screen bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
