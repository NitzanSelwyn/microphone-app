import React from 'react';
import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-expo';
import { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY } from '@/env';
import { tokenCache } from '../clerk';

export const ClerkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("Initializing Clerk with key:", EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <BaseClerkProvider
      publishableKey={EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      {children}
    </BaseClerkProvider>
  );
};