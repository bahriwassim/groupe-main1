'use client';

import { createContext, useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';

export type UserRole = 'Admin' | 'Sales' | 'Planning' | 'Production' | 'Quality' | 'Accounting';

export const ALL_ROLES: UserRole[] = ['Admin', 'Sales', 'Planning', 'Production', 'Quality', 'Accounting'];

interface RoleContextType {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<UserRole>(() => {
    // Lire le rôle dès l'initialisation pour éviter le clignotement/revenir à l'ancien
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userRole') as UserRole | null;
      if (saved && ALL_ROLES.includes(saved)) return saved;
    }
    return 'Sales';
  });

  // Sécuriser la réhydratation: si rien n'était sauvegardé, persister la valeur initiale une fois monté
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole | null;
    if (!savedRole) {
      localStorage.setItem('userRole', role);
    }
  }, [role]);

  const updateRole: Dispatch<SetStateAction<UserRole>> = (value) => {
    const newRole = typeof value === 'function' ? value(role) : value;
    setRole(newRole);
    localStorage.setItem('userRole', newRole);
  };

  return (
    <RoleContext.Provider value={{ role, setRole: updateRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
