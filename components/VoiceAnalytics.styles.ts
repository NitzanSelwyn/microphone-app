import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        padding: 16,
        paddingTop: 48,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1e293b',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: 'normal',
    },
    mainContent: {
        flex: 1,
        padding: 16,
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
    enrollmentContainer: {
        marginVertical: 20,
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    enrollmentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 4,
        marginBottom: 10,
        paddingHorizontal: 8,
    },
    enrollButton: {
        backgroundColor: '#22c55e',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    enrollButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    enrollmentInstructions: {
        marginTop: 10,
        fontSize: 14,
        color: '#475569',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
    },
    modalContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalText: {
        fontSize: 20,
        color: '#475569',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalStopButton: {
        backgroundColor: '#22c55e',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignSelf: 'center',
    },
    modalStopButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 