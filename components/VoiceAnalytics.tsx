import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Animated } from 'react-native';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export const VoiceAnalytics: React.FC = () => {
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [transcripts, setTranscripts] = useState<{ speaker: string, text: string }[]>([]);
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
    const [backgroundLevel, setBackgroundLevel] = useState<number>(0);
    const [speakerLevel, setSpeakerLevel] = useState<number>(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const animatedHeight = useRef(new Animated.Value(1)).current;

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const baselineNoiseRef = useRef<number>(0);
    const recentNoiseLevelsRef = useRef<number[]>([]);

    const calculateAudioLevel = (dataArray: Uint8Array): number => {
        // Calculate RMS (Root Mean Square) of the audio data
        const rms = Math.sqrt(
            dataArray.reduce((sum, val) => sum + (val * val), 0) / dataArray.length
        );

        // Convert to dB, using a reference level
        // Adding 1 to avoid Math.log(0)
        const db = 20 * Math.log10((rms + 1) / 255);

        // Normalize dB value to a reasonable range (-60dB to 0dB)
        const normalizedDb = Math.max(-60, Math.min(0, db));

        // Convert to positive range (0-60)
        return Math.round(normalizedDb + 60);
    };

    const calculateMovingAverage = (values: number[], windowSize: number = 10): number => {
        if (values.length === 0) return 0;
        const window = values.slice(-windowSize);
        return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
    };

    const calculateBaseline = () => {
        const windowSize = 30; // Use last 0.5 seconds of data (assuming 60fps)
        if (recentNoiseLevelsRef.current.length > 0) {
            const newBaseline = calculateMovingAverage(recentNoiseLevelsRef.current, windowSize);
            baselineNoiseRef.current = newBaseline;
            setBackgroundLevel(newBaseline); // Update the background level state
            console.log('New baseline established:', newBaseline);
        }
    };

    const startAudioMonitoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

            analyserRef.current.fftSize = 256;
            sourceRef.current.connect(analyserRef.current);

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const updateLevels = () => {
                if (analyserRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const currentLevel = calculateAudioLevel(dataArray);

                    // Store recent noise levels
                    recentNoiseLevelsRef.current.push(currentLevel);
                    if (recentNoiseLevelsRef.current.length > 120) { // 2 seconds at 60fps
                        recentNoiseLevelsRef.current.shift();
                    }

                    // Calculate moving average for more stable readings
                    const movingAverage = calculateMovingAverage(recentNoiseLevelsRef.current);

                    // Update background level when no one is speaking
                    if (currentSpeaker === null) {
                        setBackgroundLevel(movingAverage);
                        setSpeakerLevel(0);
                    } else {
                        debugger;
                        // When someone is speaking, calculate the differential from background
                        const differential = Math.max(0, movingAverage - backgroundLevel);
                        setSpeakerLevel(differential);
                    }
                }
                requestAnimationFrame(updateLevels);
            };

            updateLevels();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const startListening = () => {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(
            "EgkxRJu9uRMdvlG5dGJvVxka3C1j4E56Vt8cadgYODj61hG6qmJoJQQJ99BAACYeBjFXJ3w3AAAYACOGqjCf",  // Replace with your actual key
            "eastus"
        );

        speechConfig.speechRecognitionLanguage = "en-US";
        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const transcriber = new speechsdk.ConversationTranscriber(speechConfig, audioConfig);

        transcriber.transcribed = (s, e) => {
            const speakerId = e.result.speakerId || 'unknown';
            const text = e.result.text;

            if (text.trim()) {
                const speaker = `Speaker ${speakerId}`;
                if (speaker === 'Speaker Guest-1') {
                    calculateBaseline();
                }

                setCurrentSpeaker(speaker);
                if (!activeSpeakers.includes(speaker)) {
                    setActiveSpeakers(prev => [...prev, speaker]);
                }

                console.log(speaker, text);

                setTranscripts(prev => [...prev, {
                    speaker: speaker,
                    text: text
                }]);

                setTimeout(() => setCurrentSpeaker(null), 5000);
            }
        };

        transcriber.sessionStarted = () => {
            startAudioMonitoring();
        };

        transcriber.startTranscribingAsync(
            () => {
                setIsListening(true);
            },
            (err) => {
                console.error('Error starting transcription:', err);
                setIsListening(false);
            }
        );

        return () => {
            if (isListening) {
                transcriber.stopTranscribingAsync();
                setIsListening(false);
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                }
            }
        };
    };

    const AudioLevelIndicator = ({ level, label, color, baseline = null }: {
        level: number,
        label: string,
        color: string,
        baseline?: number | null
    }) => (
        <View style={styles.audioIndicator}>
            <Text style={styles.audioLabel}>
                {label}: {level}dB
                {baseline !== null && ` (Baseline: ${baseline}dB)`}
            </Text>
            <View style={styles.audioBar}>
                {baseline !== null && (
                    <>
                        <View style={[styles.baselineArea, { width: `${baseline}%` }]} />
                        <View style={[styles.baselineMark, { left: `${baseline}%` }]} />
                    </>
                )}
                <View
                    style={[
                        styles.audioLevel,
                        {
                            backgroundColor: color,
                            marginLeft: baseline !== null ? `${baseline}%` : 0,
                            width: baseline !== null ? `${Math.max(0, level - baseline)}%` : `${level}%`
                        }
                    ]}
                />
            </View>
        </View>
    );

    const getVolumeColor = (speakerLevel: number): string => {
        if (speakerLevel > 20) return '#ef4444';    // > -40dB (very loud)
        if (speakerLevel > 10) return '#f97316';    // > -50dB (moderately loud)
        return '#22c55e';                           // <= -50dB (normal)
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        Animated.timing(animatedHeight, {
            toValue: isCollapsed ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    return (
        <View style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.leftColumn}>
                    <View style={[
                        styles.statusCard,
                        currentSpeaker === 'Speaker Guest-1' && speakerLevel < backgroundLevel * 0.5 && {
                            backgroundColor: '#fee2e2' // Light red background
                        }
                    ]}>
                        <View style={[
                            styles.speakingIndicator,
                            {
                                backgroundColor: currentSpeaker ?
                                    (currentSpeaker === 'Speaker Guest-1' ? '#22c55e' : '#ef4444') :
                                    '#94a3b8'
                            }
                        ]} />

                        <Text style={styles.speakerStatus}>
                            {currentSpeaker || 'No one speaking'}
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: isListening ? '#ef4444' : '#22c55e' }]}
                            onPress={() => !isListening && startListening()}
                        >
                            <Text style={styles.buttonText}>
                                {isListening ? 'Stop Recording' : 'Start Recording'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metricsGrid}>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>Speaker Level</Text>
                            <AudioLevelIndicator
                                level={speakerLevel}
                                label="Speaker"
                                color={getVolumeColor(speakerLevel)}
                                baseline={backgroundLevel}
                            />
                        </View>

                        <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>Background Level</Text>
                            <AudioLevelIndicator
                                level={backgroundLevel}
                                label="Background"
                                color="#64748b"
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.transcriptContainer}>
                    <Text style={styles.transcriptTitle}>Conversation History</Text>

                    <TouchableOpacity onPress={toggleCollapse} style={styles.collapseHeader}>
                        <Text style={styles.collapseHeaderText}>Active Speakers</Text>
                        <Text style={styles.collapseIcon}>{isCollapsed ? '▼' : '▲'}</Text>
                    </TouchableOpacity>

                    <Animated.View style={[
                        styles.activeSpeakersContainer,
                        {
                            maxHeight: animatedHeight.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 200],
                            }),
                            opacity: animatedHeight,
                            overflow: 'hidden',
                        }
                    ]}>
                        {activeSpeakers.map((speaker, index) => (
                            <View key={index} style={styles.activeSpeakerChip}>
                                <Text style={styles.activeSpeakerText}>{speaker}</Text>
                            </View>
                        ))}
                    </Animated.View>

                    <ScrollView style={styles.transcriptsList}>
                        {transcripts.map((transcript, index) => (
                            <View key={index} style={styles.transcriptItem}>
                                <Text style={[
                                    styles.transcriptSpeaker,
                                    { color: transcript.speaker === 'Speaker Guest-1' ? '#22c55e' : '#ef4444' }
                                ]}>
                                    {transcript.speaker}
                                </Text>
                                <Text style={styles.transcriptText}>{transcript.text}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
});

export default VoiceAnalytics;
