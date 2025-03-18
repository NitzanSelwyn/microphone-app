import React from 'react';
import { StatusBar } from 'expo-status-bar';
import VoiceAnalytics from '@/components/VoiceAnalytics';
import { ClerkProvider } from '@/components/ClerkProvider';
import { AuthWrapper } from '@/components/AuthWrapper';

export default function App() {
  return (
    <ClerkProvider>
      <StatusBar style="auto" />
      <AuthWrapper>
        <VoiceAnalytics />
      </AuthWrapper>
    </ClerkProvider>
  );
} 