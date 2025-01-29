import { StyleSheet } from 'react-native';
import VoiceAnalytics from '@/components/VoiceAnalytics';
import { ThemedView } from '@/components/ThemedView';

export default function TabsIndex() {
  return (
    <ThemedView style={styles.container}>
      <VoiceAnalytics />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Match the VoiceAnalytics background color
  },
});
