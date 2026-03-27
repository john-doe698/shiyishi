'use client';

import { ReactNode } from 'react';
import { PermissionProvider } from '@/hooks/use-permission';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <PermissionProvider>
      {children}
    </PermissionProvider>
  );
}
