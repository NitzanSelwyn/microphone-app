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
import { IconSymbol } from './ui/IconSymbol';
import { COLORS, API_URL } from '@/constants/voiceAnalyticsConstants';
import { calculateAudioLevel, calculateMovingAverage, calculateBaseline, getVolumeColor, getSpeakerDisplayName, getBackgroundIconName } from '@/lib/voiceAnalyticsHelpers';
import AudioLevelIndicator from './voiceAnalytics/AudioLevelIndicator';
import SoundLevelLegend from './voiceAnalytics/SoundLevelLegend';
import type { Transcript, VolumeNotification } from '@/types/voiceAnalytics';
import Sidebar from './voiceAnalytics/Sidebar';

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
    const [transcriptionHistory, setTranscriptionHistory] = useState<Transcript[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarAnim = useRef(new Animated.Value(-300)).current;

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [volumeNotification, setVolumeNotification] = useState<{ message: string, type: 'high' | 'low' | 'ok' | 'background', color?: string } | null>(null);
    const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const speakerLevelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Add useEffect to clear transcripts on mount
    useEffect(() => {
        setTranscripts([]);
        setCurrentConversationId(null);
    }, []);

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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                chunksRef.current = [];
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setError('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
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
            // Start recording audio
            await startRecording();

            // Generate a new conversation ID
            const newConversationId = uuidv4();
            setCurrentConversationId(newConversationId);
            setTranscripts([]); // Clear previous transcripts

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
                    const displaySpeaker = getSpeakerDisplayName(speaker, userName);

                    if (!firstSpeakerRef.current) {
                        firstSpeakerRef.current = speaker;
                        setActiveSpeakers([displaySpeaker]);

                        const newBaseline = calculateBaseline(recentNoiseLevelsRef.current);
                        if (newBaseline === 0 || newBaseline > 5) {
                            baselineNoiseRef.current = newBaseline;
                            setBackgroundLevel(newBaseline);
                            console.log('New baseline established:', newBaseline);
                        }
                    }

                    if (speaker === firstSpeakerRef.current) {
                        setCurrentSpeaker(displaySpeaker);

                        // Get the raw audio level
                        const currentNoise = calculateMovingAverage(recentNoiseLevelsRef.current);
                        setSpeakerLevel(currentNoise);
                        // Reset speaker level after 5 seconds
                        if (speakerLevelTimeoutRef.current) {
                            clearTimeout(speakerLevelTimeoutRef.current);
                        }
                        speakerLevelTimeoutRef.current = setTimeout(() => {
                            setSpeakerLevel(0);
                        }, 5000);

                        // Save transcription to server with conversation ID
                        if (!currentConversationId) {
                            console.error('No conversation ID available');
                            return;
                        }

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
                                    conversationId: currentConversationId,
                                }),
                            });

                            if (!response.ok) {
                                throw new Error('Failed to save transcription');
                            }

                            const lineDB = await response.json();

                            // Update local state
                            const newTranscription = {
                                _id: lineDB._id,
                                text: text,
                                timestamp: new Date(),
                                speakerId: speakerId,
                                conversationId: currentConversationId,
                                userId: user?.id || '',
                            };

                            setTranscriptionHistory(prev => [...prev, newTranscription]);
                            setTranscripts(prev => [...prev, {
                                speaker: displaySpeaker,
                                text: text
                            }]);

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

                        setTimeout(() => {
                            setCurrentSpeaker(null);
                            const newBaseline = calculateBaseline(recentNoiseLevelsRef.current);
                            if (newBaseline === 0 || newBaseline > 5) {
                                baselineNoiseRef.current = newBaseline;
                                setBackgroundLevel(newBaseline);
                                console.log('New baseline established:', newBaseline);
                            }
                            setSpeakerLevel(0);
                            setSaveStatus(null);
                        }, 8000);
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
        stopRecording();
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
                setTranscriptionHistory(data.map((item: any) => ({ ...item, userId: item.userId || user?.id || '' })));
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

    // Add useEffect for volume notifications
    useEffect(() => {
        // Clear any existing notification timeout
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }

        // Only show notification if the speaker level is significantly above the background (actual voice)
        const threshold = 8; // dB above background to consider as speaking
        const isSpeaking = speakerLevel - backgroundLevel > threshold;

        let notification: { message: string, type: 'high' | 'low' | 'ok' | 'background', color?: string } | null = null;
        if (isSpeaking) {
            if (speakerLevel > 40) {
                notification = { message: "Keep the volume down", type: 'high', color: COLORS.AUDIO.LOUD };
            } else if (speakerLevel < backgroundLevel + threshold + 5) {
                notification = { message: "Please speak louder", type: 'low', color: COLORS.AUDIO.MODERATE };
            } else {
                notification = { message: "Good speaking volume", type: 'ok', color: COLORS.AUDIO.QUIET };
            }
        }

        if (notification) {
            setVolumeNotification(notification);
            notificationTimeoutRef.current = setTimeout(() => {
                setVolumeNotification(null);
            }, 30000); // Show notification for 30 seconds
        } else {
            setVolumeNotification(null);
        }

        // Cleanup function
        return () => {
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
        };
    }, [speakerLevel, backgroundLevel]);

    const getVolumeColor = (speakerLevel: number): string => {
        if (speakerLevel > 40) {
            return COLORS.AUDIO.LOUD;
        } else if (speakerLevel > 25) {
            return COLORS.AUDIO.MODERATE;
        }
        return COLORS.AUDIO.QUIET;
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        Animated.timing(animatedHeight, {
            toValue: isCollapsed ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const getSpeakerDisplayName = (speakerId: string, userName: string): string => {
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

    const downloadConversations = () => {
        // Create text content from all conversations
        const conversations = transcriptionHistory.reduce((acc, item) => {
            if (!acc[item.conversationId]) {
                acc[item.conversationId] = [];
            }
            acc[item.conversationId].push(item);
            return acc;
        }, {} as Record<string, Array<{
            _id: string;
            text: string;
            timestamp: Date;
            speakerId: string;
            conversationId: string;
        }>>);

        const textContent = Object.entries(conversations)
            .map(([conversationId, items]) => {
                const date = new Date(items[0].timestamp).toLocaleDateString();
                const conversationText = items
                    .map(item => {
                        const time = new Date(item.timestamp).toLocaleTimeString();
                        return `[${time}] Speaker ${item.speakerId}: ${item.text}`;
                    })
                    .join('\n');
                return `Conversation from ${date}\n${conversationText}\n\n`;
            })
            .join('---\n\n');

        // Create and trigger download
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversations-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Helper to get background icon name based on volume
    const getBackgroundIconName = (level: number): any => {
        if (level >= 85) return 'airplanemode-active'; // Airplane
        if (level >= 70) return 'directions-car';      // Car/Busy street
        if (level >= 60) return 'vacuum';             // Vacuum cleaner
        return 'background.volume';                    // Quiet/normal
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
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                sidebarAnim={sidebarAnim}
                transcriptionHistory={transcriptionHistory}
                toggleSidebar={toggleSidebar}
                downloadConversations={downloadConversations}
            />

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

            {/* Volume Notification */}
            {volumeNotification && (
                <View style={[
                    styles.notificationContainer,
                    {
                        backgroundColor: volumeNotification.color || (volumeNotification.type === 'high' ? COLORS.AUDIO.LOUD : volumeNotification.type === 'low' ? COLORS.AUDIO.MODERATE : COLORS.AUDIO.QUIET),
                        borderColor: volumeNotification.color || (volumeNotification.type === 'high' ? '#ef4444' : volumeNotification.type === 'low' ? '#f97316' : '#22c55e'),
                    }
                ]}>
                    <Text style={[
                        styles.notificationText,
                        { color: '#fff' }
                    ]}>
                        {volumeNotification.message}
                    </Text>
                </View>
            )}

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainContent}>
                    <View style={styles.leftColumn}>
                        <View style={[
                            styles.statusCard,
                            currentSpeaker === getSpeakerDisplayName('Speaker Guest-1', userName) && {
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <IconSymbol
                                            name={getBackgroundIconName(backgroundLevel)}
                                            size={28 + Math.min(22, Math.max(0, backgroundLevel))}
                                            color={
                                                backgroundLevel > 50
                                                    ? COLORS.AUDIO.LOUD
                                                    : backgroundLevel > 35
                                                        ? COLORS.AUDIO.MODERATE
                                                        : COLORS.AUDIO.QUIET
                                            }
                                            style={{ marginRight: 8 }}
                                        />
                                        <AudioLevelIndicator
                                            level={backgroundLevel}
                                            label="Background"
                                            color="#64748b"
                                        />
                                    </View>
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
                                                color: transcript.speaker === getSpeakerDisplayName('Speaker Guest-1', userName) ?
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
