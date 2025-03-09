import { StyleSheet, Platform } from 'react-native';

export const voiceAnalyticsStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 24,
    },
    mainContent: {
        flex: 1,
    },
    leftColumn: {
        marginBottom: 16,
    },
    statusCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    speakingIndicator: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
    },
    speakerStatus: {
        fontSize: 18,
        color: '#475569',
        fontWeight: '500',
        marginBottom: 16,
    },
    button: {
        width: '100%',
        maxWidth: 300,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    metricsGrid: {
        flexDirection: 'row',
        gap: 16,
        flex: 1,
    },
    metricsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 20,
    },
    legendWrapper: {
        marginLeft: 16,
        maxWidth: 300,
    },
    metricCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        minHeight: 120,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    metricLabel: {
        color: '#64748b',
        fontSize: 14,
        marginBottom: 8,
    },
    metricValue: {
        color: '#1e293b',
        fontSize: 24,
        fontWeight: '600',
    },
    transcriptContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    transcriptTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    collapseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    collapseHeaderText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#475569',
    },
    collapseIcon: {
        fontSize: 16,
        color: '#475569',
    },
    activeSpeakersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    activeSpeakerChip: {
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    activeSpeakerText: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '500',
    },
    transcriptsList: {
        flex: 1,
    },
    transcriptItem: {
        marginBottom: 16,
    },
    transcriptSpeaker: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    transcriptText: {
        color: '#475569',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
    },
    audioIndicator: {
        marginTop: 8,
    },
    audioLabel: {
        marginBottom: 5,
        color: '#475569',
        fontSize: 14,
    },
    audioBar: {
        height: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
    },
    audioLevel: {
        height: '100%',
        position: 'absolute',
    },
    baselineMark: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#94a3b8',
        opacity: 0.8,
        zIndex: 2,
    },
    baselineArea: {
        position: 'absolute',
        height: '100%',
        backgroundColor: '#e2e8f0',
        opacity: 0.5,
        left: 0,
    },
    legendContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        width: 250,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    legendTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 10,
        textAlign: 'center',
    },
    legendDescription: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 16,
        textAlign: 'center',
    },
    soundLevelBar: {
        marginBottom: 16,
    },
    soundLevelGradient: {
        height: 16,
        borderRadius: 8,
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 2,
    },
    soundLevelSegment: {
        flex: 1,
        height: '100%',
    },
    tickMarksContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        height: 6,
    },
    tickMark: {
        width: 1,
        height: 6,
        backgroundColor: '#64748b',
    },
    soundLevelLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    soundLevelLabel: {
        fontSize: 9,
        color: '#64748b',
    },
    legendItems: {
        gap: 4,
        marginTop: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 3,
        marginRight: 6,
    },
    legendText: {
        color: '#475569',
        fontSize: 11,
    },
});
