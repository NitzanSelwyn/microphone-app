import { StyleSheet } from 'react-native';
import VoiceAnalytics from '@/components/VoiceAnalytics';
import { ThemedView } from '@/components/ThemedView';
import { AuthWrapper } from '@/components/AuthWrapper';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider } from '@/components/ClerkProvider';

export default function TabsIndex() {
  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <ClerkProvider>
        <AuthWrapper>
          <VoiceAnalytics />
        </AuthWrapper>
      </ClerkProvider>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Match the VoiceAnalytics background color
  },
});
