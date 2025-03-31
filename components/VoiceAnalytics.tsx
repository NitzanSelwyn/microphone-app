import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Animated, useWindowDimensions, TextInput, Modal } from 'react-native';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { SPEECH_KEY, SPEECH_REGION } from '@/env';
import { voiceAnalyticsStyles as styles } from '@/constants/StyleFroPage';
import { useAuth } from '@/hooks/useAuth';
import { connectDB, disconnectDB } from '@/lib/db/mongodb';
import Transcription from '@/lib/db/models/Transcription';

// Color constants
const COLORS = {
    // Audio level colors
    AUDIO: {
        QUIET: '#22c55e',    // Green - quiet levels
        MODERATE: '#f97316', // Orange - moderate levels
        LOUD: '#ef4444',     // Red - loud levels
    },
    // Speaker status colors
    SPEAKER: {
        ACTIVE: '#22c55e',   // Green - active speaker
        INACTIVE: '#94a3b8', // Gray - inactive speaker
        OTHER: '#ef4444',    // Red - other speakers
    },
    // UI elements
    UI: {
        BACKGROUND: '#ffffff',
        TEXT: '#000000',
        BORDER: '#e5e7eb',
    }
} as const;

// Add this constant at the top of the file
const API_URL = 'https://microphone-server-2617c5e1bee8.herokuapp.com/api';

export const VoiceAnalytics: React.FC = () => {
    const { width } = useWindowDimensions();
    const isNarrowScreen = width < 700;
    const { user, signOut } = useAuth();

    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [transcripts, setTranscripts] = useState<{ speaker: string, text: string }[]>([]);
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
    const [backgroundLevel, setBackgroundLevel] = useState<number>(0);
    const [speakerLevel, setSpeakerLevel] = useState<number>(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const animatedHeight = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const firstSpeakerRef = useRef<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const baselineNoiseRef = useRef<number>(0);
    const recentNoiseLevelsRef = useRef<number[]>([]);

    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    // Modify the name modal logic to use Clerk user info
    const [nameModalVisible, setNameModalVisible] = useState<boolean>(!user?.fullName);
    const [userName, setUserName] = useState<string>(user?.fullName || '');
    const [tempName, setTempName] = useState<string>(user?.fullName || '');

    // Add new state for save status
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<Array<{
        _id: string;
        text: string;
        timestamp: Date;
        speakerId: string;
    }>>([]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarAnim = useRef(new Animated.Value(-300)).current;

    // Create pulsing animation when speaking
    useEffect(() => {
        if (currentSpeaker) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            // Reset animation when not speaking
            pulseAnim.setValue(1);
        }
    }, [currentSpeaker, pulseAnim]);

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

            // Only update baseline if it's a meaningful value (above 5) or actually 0
            if (newBaseline === 0 || newBaseline > 5) {
                baselineNoiseRef.current = newBaseline;
                setBackgroundLevel(newBaseline); // Update the background level state
                console.log('New baseline established:', newBaseline);
            }
        }
    };

    const cleanupAudioResources = () => {
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const cleanupTranscriber = () => {
        if (cleanupRef.current) {
            const transcriber = cleanupRef.current;
            cleanupRef.current = null;
            transcriber();
        }
    };

    const startAudioMonitoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Clean up any existing audio context
            cleanupAudioResources();

            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;
            sourceRef.current.connect(analyserRef.current);

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const updateLevels = () => {
                if (!analyserRef.current) {
                    return;
                }

                analyserRef.current.getByteFrequencyData(dataArray);
                const currentLevel = calculateAudioLevel(dataArray);

                // Update recent noise levels
                recentNoiseLevelsRef.current.push(currentLevel);
                if (recentNoiseLevelsRef.current.length > 120) {
                    recentNoiseLevelsRef.current.shift();
                }

                // Calculate moving average for smoother updates
                const movingAverage = calculateMovingAverage(recentNoiseLevelsRef.current);

                // Always update background level
                setBackgroundLevel(prevLevel => {
                    // Smooth transitions by averaging with previous value
                    return Math.round((prevLevel + movingAverage) / 2);
                });

                // Ensure continuous updates regardless of isListening state
                requestAnimationFrame(updateLevels);
            };

            // Start the update loop
            updateLevels();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setError('Failed to access microphone. Please check permissions and try again.');
            setIsListening(false);
        }
    };

    const startListening = async () => {
        if (isInitializing) return;

        setIsInitializing(true);
        setError(null);

        try {
            const speechConfig = speechsdk.SpeechConfig.fromSubscription(
                SPEECH_KEY,
                SPEECH_REGION
            );

            speechConfig.speechRecognitionLanguage = "en-US";
            const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
            const transcriber = new speechsdk.ConversationTranscriber(speechConfig, audioConfig);

            // Store cleanup function
            cleanupRef.current = () => {
                transcriber.stopTranscribingAsync();
                setIsListening(false);
                // Only cleanup audio resources when stopping
                cleanupAudioResources();
            };

            transcriber.transcribed = async (s, e) => {
                try {
                    // Add null checks for required properties
                    if (!e?.result) {
                        console.warn('Received transcription event without result');
                        return;
                    }

                    const speakerId = e.result.speakerId || 'unknown';
                    const text = e.result.text;

                    // Skip if text is null, undefined, or empty after trimming
                    if (!text?.trim()) {
                        return;
                    }

                    const speaker = `Speaker ${speakerId}`;
                    const displaySpeaker = getSpeakerDisplayName(speaker);

                    if (!firstSpeakerRef.current) {
                        firstSpeakerRef.current = speaker;
                        setActiveSpeakers([displaySpeaker]);

                        if (speaker === 'Speaker Guest-1') {
                            calculateBaseline();
                        }
                    }

                    if (speaker === firstSpeakerRef.current) {
                        setCurrentSpeaker(displaySpeaker);

                        // Get the raw audio level
                        const currentNoise = calculateMovingAverage(recentNoiseLevelsRef.current);

                        // Make sure we have a meaningful differential value
                        // Using max with a minimum value to ensure we display something
                        const minDisplayValue = 15; // Ensure we have at least a small visible bar
                        let differential = Math.max(0, currentNoise - baselineNoiseRef.current);

                        // If we're actually speaking, ensure a minimum level is shown
                        if (currentNoise > 0) {
                            differential = Math.max(differential, minDisplayValue);
                        }

                        console.log('Speaker levels:', {
                            currentNoise,
                            baseline: baselineNoiseRef.current,
                            differential
                        });

                        // Update speaker level
                        setSpeakerLevel(differential);

                        // Save transcription to server
                        try {
                            const response = await fetch(`${API_URL}/transcriptions`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    userId: user?.id,
                                    text: text,
                                    speakerId: speakerId,
                                }),
                            });

                            if (!response.ok) {
                                throw new Error('Failed to save transcription');
                            }

                            setSaveStatus({
                                type: 'success',
                                message: 'Transcription saved successfully'
                            });
                        } catch (error) {
                            console.error('Error saving transcription:', error);
                            setSaveStatus({
                                type: 'error',
                                message: 'Failed to save transcription'
                            });
                        }

                        setTranscripts(prev => [...prev, {
                            speaker: displaySpeaker,
                            text: text
                        }]);

                        setTimeout(() => {
                            setCurrentSpeaker(null);
                            calculateBaseline();
                            setSpeakerLevel(0);
                            setSaveStatus(null);
                        }, 5000);
                    }
                } catch (error) {
                    console.error('Error in transcription handler:', error);
                    setError('An error occurred while processing the transcription');
                }
            };

            transcriber.sessionStarted = () => {
                firstSpeakerRef.current = null;
            };

            await transcriber.startTranscribingAsync();
            setIsListening(true);

            // Start audio monitoring immediately after starting transcription
            startAudioMonitoring();
        } catch (error) {
            console.error('Error starting transcription:', error);
            setError('Failed to start recording. Please try again.');
            cleanupTranscriber();
        } finally {
            setIsInitializing(false);
        }
    };

    const stopListening = async () => {
        cleanupTranscriber();
    };

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            cleanupTranscriber();
        };
    }, []);

    // Replace the MongoDB connection useEffect with this
    useEffect(() => {
        let mounted = true;

        const checkConnection = async () => {
            try {
                const response = await fetch(`${API_URL}/transcriptions?userId=${user?.id}`);
                if (!response.ok) throw new Error('Failed to connect to server');
                const data = await response.json();
                setTranscriptionHistory(data);
                if (mounted) {
                    setTranscripts(data);
                    setSaveStatus({
                        type: 'success',
                        message: 'Connected to server'
                    });
                }
            } catch (error) {
                console.error('Error connecting to server:', error);
                if (mounted) {
                    setSaveStatus({
                        type: 'error',
                        message: 'Failed to connect to server'
                    });
                }
            }
        };

        if (user?.id) {
            checkConnection();
        }

        return () => {
            mounted = false;
        };
    }, [user?.id]);

    // Add this after the existing useEffect hooks
    useEffect(() => {
        Animated.timing(sidebarAnim, {
            toValue: isSidebarOpen ? 0 : -300,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isSidebarOpen]);

    const AudioLevelIndicator = ({ level, label, color, baseline = null }: {
        level: number,
        label: string,
        color: string,
        baseline?: number | null
    }) => (
        <View style={styles.audioIndicator}>
            <View style={styles.audioLabelContainer}>
                <Text style={styles.audioLabel}>
                    {label}: {level}dB
                </Text>
                {baseline !== null && (
                    <Text style={styles.audioLabelSmall}>
                        Baseline: {baseline}dB
                    </Text>
                )}
            </View>
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

    const SoundLevelLegend = () => (
        <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Sound Level Reference</Text>
            <Text style={styles.legendDescription}>
                Showing relative audio level in decibels (dB)
            </Text>

            <View style={styles.soundLevelBar}>
                <View style={styles.soundLevelGradient}>
                    <View style={[styles.soundLevelSegment, { backgroundColor: COLORS.AUDIO.QUIET }]} />
                    <View style={[styles.soundLevelSegment, { backgroundColor: COLORS.AUDIO.MODERATE }]} />
                    <View style={[styles.soundLevelSegment, { backgroundColor: COLORS.AUDIO.LOUD }]} />
                </View>

                <View style={styles.tickMarksContainer}>
                    <View style={styles.tickMark} />
                    <View style={styles.tickMark} />
                    <View style={styles.tickMark} />
                    <View style={styles.tickMark} />
                </View>

                <View style={styles.soundLevelLabels}>
                    <Text style={styles.soundLevelLabel}>0dB</Text>
                    <Text style={styles.soundLevelLabel}>20dB</Text>
                    <Text style={styles.soundLevelLabel}>40dB</Text>
                    <Text style={styles.soundLevelLabel}>60dB</Text>
                </View>
            </View>

            <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.AUDIO.QUIET }]} />
                    <Text style={styles.legendText}>Quiet (0dB to 10dB)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.AUDIO.MODERATE }]} />
                    <Text style={styles.legendText}>Moderate (10dB to 30dB)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.AUDIO.LOUD }]} />
                    <Text style={styles.legendText}>Loud (30dB to 60dB)</Text>
                </View>
            </View>
        </View>
    );

    const getVolumeColor = (speakerLevel: number): string => {
        if (speakerLevel > 30) return COLORS.AUDIO.LOUD;      // Red for very loud (>30dB)
        if (speakerLevel > 15) return COLORS.AUDIO.MODERATE;  // Orange for moderate (15-30dB)
        return COLORS.AUDIO.QUIET;                           // Green for quiet (<15dB)
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        Animated.timing(animatedHeight, {
            toValue: isCollapsed ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const getSpeakerDisplayName = (speakerId: string): string => {
        if (speakerId === 'Speaker Guest-1' && userName) {
            return `Speaker ${userName}`;
        }
        return speakerId;
    };

    const handleNameSubmit = () => {
        if (tempName.trim()) {
            setUserName(tempName.trim());
        }
        setNameModalVisible(false);
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (err) {
            console.error('Error signing out:', err);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <View style={styles.container}>
            {/* Add hamburger button */}
            <TouchableOpacity 
                style={styles.hamburgerButton}
                onPress={toggleSidebar}
            >
                <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>

            {/* Add sidebar */}
            <Animated.View 
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: sidebarAnim }],
                    }
                ]}
            >
                <View style={styles.sidebarHeader}>
                    <Text style={styles.sidebarTitle}>Transcription History</Text>
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={toggleSidebar}
                    >
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.sidebarContent}>
                    {transcriptionHistory.map((item, index) => (
                        <View key={index} style={styles.historyItem}>
                            <Text style={styles.historyDate}>
                                {new Date(item.timestamp).toLocaleDateString()}
                            </Text>
                            <Text style={styles.historyText}>{item.text}</Text>
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

            {/* Add save status display */}
            {/* {saveStatus && (
                <View style={[
                    styles.saveStatusContainer,
                    { backgroundColor: saveStatus.type === 'success' ? '#dcfce7' : '#fee2e2' }
                ]}>
                    <Text style={[
                        styles.saveStatusText,
                        { color: saveStatus.type === 'success' ? '#166534' : '#991b1b' }
                    ]}>
                        {saveStatus.message}
                    </Text>
                </View>
            )} */}

            {/* Name Input Modal */}
            <Modal
                transparent={true}
                visible={nameModalVisible}
                animationType="fade"
                onRequestClose={() => setNameModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Welcome to Voice Analytics</Text>
                        <Text style={styles.modalDescription}>
                            Please enter your name to personalize your experience
                        </Text>

                        <TextInput
                            style={styles.nameInput}
                            placeholder="Enter your name"
                            value={tempName}
                            onChangeText={setTempName}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            {/* <TouchableOpacity 
                                style={[styles.modalButton, styles.skipButton]} 
                                onPress={() => setNameModalVisible(false)}
                            >
                                <Text style={styles.skipButtonText}>Skip</Text>
                            </TouchableOpacity> */}

                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handleNameSubmit}
                            >
                                <Text style={styles.submitButtonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainContent}>
                    <View style={styles.leftColumn}>
                        <View style={[
                            styles.statusCard,
                            currentSpeaker === getSpeakerDisplayName('Speaker Guest-1') && {
                                backgroundColor: getVolumeColor(speakerLevel)
                            }
                        ]}>
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}
                            {user && (
                                <View style={styles.userInfo}>
                                    <Text style={styles.welcomeText}>
                                        Welcome, {user.fullName || user.firstName || 'User'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.signOutButton}
                                        onPress={handleSignOut}
                                    >
                                        <Text style={styles.signOutText}>Sign Out</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <Animated.View style={[
                                styles.speakingIndicator,
                                {
                                    backgroundColor: currentSpeaker ?
                                        (currentSpeaker === 'Speaker Guest-1' ? COLORS.SPEAKER.INACTIVE : COLORS.SPEAKER.INACTIVE) :
                                        COLORS.SPEAKER.INACTIVE,
                                    transform: [{ scale: currentSpeaker ? pulseAnim : 1 }]
                                }
                            ]}>
                                {currentSpeaker && (
                                    <View style={styles.speakingBadge}>
                                        <Text style={styles.speakingBadgeText}>LIVE</Text>
                                    </View>
                                )}
                            </Animated.View>

                            <Text style={styles.speakerStatus}>
                                {currentSpeaker || 'No one speaking'}
                            </Text>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: isListening ? COLORS.AUDIO.LOUD : COLORS.AUDIO.QUIET },
                                    isInitializing && styles.buttonDisabled
                                ]}
                                onPress={() => isListening ? stopListening() : startListening()}
                                disabled={isInitializing}
                            >
                                <Text style={styles.buttonText}>
                                    {isInitializing ? 'Initializing...' : isListening ? 'Stop Recording' : 'Start Recording'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.metricsContainer, isNarrowScreen ? styles.metricsContainerNarrow : {}]}>
                            <View style={[styles.metricsGrid, isNarrowScreen ? styles.metricsGridNarrow : {}]}>
                                <View style={[styles.metricCard, isNarrowScreen ? styles.metricCardNarrow : {}]}>
                                    <Text style={styles.metricLabel}>Speaker Level</Text>
                                    <AudioLevelIndicator
                                        level={speakerLevel}
                                        label="Speaker"
                                        color={getVolumeColor(speakerLevel)}
                                        baseline={backgroundLevel}
                                    />
                                </View>

                                <View style={[styles.metricCard, isNarrowScreen ? styles.metricCardNarrow : {}]}>
                                    <Text style={styles.metricLabel}>Background Level</Text>
                                    <AudioLevelIndicator
                                        level={backgroundLevel}
                                        label="Background"
                                        color="#64748b"
                                    />
                                </View>
                            </View>

                            <View style={[styles.legendWrapper, isNarrowScreen ? styles.legendWrapperNarrow : {}]}>
                                <SoundLevelLegend />
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

                            <View style={styles.transcriptsList}>
                                {transcripts.map((transcript, index) => (
                                    <View key={index} style={styles.transcriptItem}>
                                        <Text style={[
                                            styles.transcriptSpeaker,
                                            {
                                                color: transcript.speaker === getSpeakerDisplayName('Speaker Guest-1') ?
                                                    COLORS.SPEAKER.ACTIVE : COLORS.SPEAKER.OTHER
                                            }
                                        ]}>
                                            {transcript.speaker}
                                        </Text>
                                        <Text style={styles.transcriptText}>{transcript.text}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default VoiceAnalytics;
