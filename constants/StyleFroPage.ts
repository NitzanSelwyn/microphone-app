import { StyleSheet, Platform } from 'react-native';

export const voiceAnalyticsStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
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
            default: {
                padding: 24,
            }
        }),
    },
    speakingIndicator: {
        ...Platform.select({
            web: {
                width: 120,
                height: 120,
                borderRadius: 60,
            },
            default: {
                width: 100,
                height: 100,
                borderRadius: 50,
            }
        }),
        marginBottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    speakingBadge: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    speakingBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    speakerStatus: {
        color: '#475569',
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'center',
        ...Platform.select({
            web: {
                fontSize: 18,
            },
            default: {
                fontSize: 16,
            }
        }),
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
    metricsContainer: {
        ...Platform.select({
            web: {
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 20,
            },
            default: {
                flexDirection: 'column',
                gap: 16,
            },
        }),
    },
    metricsContainerNarrow: {
        flexDirection: 'column',
        gap: 16,
    },
    metricsGrid: {
        ...Platform.select({
            web: {
                flexDirection: 'row',
                gap: 16,
                flex: 1,
            },
            default: {
                flexDirection: 'column',
                gap: 16,
                width: '100%',
            },
        }),
    },
    metricsGridNarrow: {
        flexDirection: 'column',
        gap: 16,
        width: '100%',
    },
    legendWrapper: {
        ...Platform.select({
            web: {
                marginLeft: 16,
                maxWidth: 300,
            },
            default: {
                marginTop: 8,
                marginBottom: 16,
                alignSelf: 'center',
                width: '100%',
                maxWidth: 400,
            },
        }),
    },
    legendWrapperNarrow: {
        marginLeft: 0,
        marginTop: 16,
        width: '100%',
        maxWidth: undefined,
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
    metricCardNarrow: {
        flex: 0,
        marginBottom: 12,
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
        marginTop: 16,
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
        width: '100%',
    },
    audioLabelContainer: {
        marginBottom: 5,
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        ...Platform.select({
            web: {
                flexDirection: 'row',
            },
            default: {
                flexDirection: 'column',
            }
        }),
    },
    audioLabel: {
        color: '#475569',
        fontSize: 14,
        flexWrap: 'wrap',
    },
    audioLabelSmall: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 2,
    },
    audioBar: {
        height: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        marginTop: 4,
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
        ...Platform.select({
            web: {
                width: 250,
            },
            default: {
                width: '100%',
            },
        }),
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
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        color: '#1e293b',
    },
    modalDescription: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        color: '#4b5563',
    },
    nameInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    skipButton: {
        backgroundColor: '#f3f4f6',
    },
    skipButtonText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#22c55e',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});
