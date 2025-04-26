import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { voiceAnalyticsStyles as styles } from '@/constants/StyleFroPage';
import type { Transcript } from '@/types/voiceAnalytics';

interface SidebarProps {
    isSidebarOpen: boolean;
    sidebarAnim: Animated.Value;
    transcriptionHistory: Transcript[];
    toggleSidebar: () => void;
    downloadConversations: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, sidebarAnim, transcriptionHistory, toggleSidebar, downloadConversations }) => {
    // Group all items by date (YYYY-MM-DD)
    const itemsByDate = transcriptionHistory.reduce((acc, item) => {
        const date = item.timestamp ? new Date(item.timestamp).toISOString().slice(0, 10) : 'unknown';
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {} as Record<string, Transcript[]>);

    return (
        <>
            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: sidebarAnim }],
                    }
                ]}
            >
                <View style={styles.sidebarHeader}>
                    <View style={styles.sidebarTitleContainer}>
                        <Text style={styles.sidebarTitle}>Conversation History</Text>
                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={downloadConversations}
                        >
                            <Text style={styles.downloadButtonText}>⬇️</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={toggleSidebar}
                    >
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.sidebarContent}>
                    {Object.entries(itemsByDate).map(([date, items]) => (
                        <View key={date} style={styles.conversationGroup}>
                            <Text style={styles.conversationDate}>
                                {date !== 'unknown' ? new Date(date).toLocaleDateString() : ''}
                            </Text>
                            {items.map((item, index) => (
                                <View key={index} style={styles.historyItem}>
                                    <View style={styles.historyItemHeader}>
                                        <Text style={styles.historyTime}>
                                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historySpeaker}>
                                            Speaker {item.speakerId}
                                        </Text>
                                        <Text style={styles.historyText}>{item.text}</Text>
                                    </View>
                                    {index < items.length - 1 && (
                                        <View style={styles.historyDivider} />
                                    )}
                                </View>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>
            {/* Add overlay when sidebar is open */}
            {isSidebarOpen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={toggleSidebar}
                />
            )}
        </>
    );
};

export default Sidebar; 