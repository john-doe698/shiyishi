'use client';

import { ReactNode } from 'react';
import { PermissionProvider, usePermission } from '@/hooks/use-permission';
import { LoginPage } from '@/components/layout/login-page';

interface ClientLayoutProps {
  children: ReactNode;
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn } = usePermission();
  
  if (!isLoggedIn) {
    return <LoginPage />;
  }
  
  return <>{children}</>;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <PermissionProvider>
      <AuthenticatedLayout>
        {children}
      </AuthenticatedLayout>
    </PermissionProvider>
  );
}
