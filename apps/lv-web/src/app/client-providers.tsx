'use client';

import { SessionProvider } from 'next-auth/react';
import * as React from 'react';
import { Toaster } from 'sonner';

export const ClientProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          className: 'shadow-lg rounded-lg',
          duration: 3000,
        }}
      />
    </SessionProvider>
  );
};
