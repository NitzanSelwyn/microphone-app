import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Animated } from 'react-native';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { SPEECH_KEY, SPEECH_REGION } from '@/env';
import { voiceAnalyticsStyles as styles } from '@/constants/StyleFroPage';

export const VoiceAnalytics: React.FC = () => {
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [transcripts, setTranscripts] = useState<{ speaker: string, text: string }[]>([]);
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
    const [backgroundLevel, setBackgroundLevel] = useState<number>(0);
    const [speakerLevel, setSpeakerLevel] = useState<number>(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const animatedHeight = useRef(new Animated.Value(1)).current;
    const firstSpeakerRef = useRef<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const baselineNoiseRef = useRef<number>(0);
    const recentNoiseLevelsRef = useRef<number[]>([]);

    const calculateAudioLevel = (dataArray: Uint8Array): number => {
        // Check if all values are very low (likely microphone is off)
        const maxValue = Math.max(...Array.from(dataArray));
        if (maxValue < 5) { // Threshold for silent/off microphone
            return 0;
        }
        
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
                        //setSpeakerLevel(0);
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
            SPEECH_KEY,
            SPEECH_REGION
        );

        speechConfig.speechRecognitionLanguage = "en-US";
        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const transcriber = new speechsdk.ConversationTranscriber(speechConfig, audioConfig);

        transcriber.transcribed = (s, e) => {
            const speakerId = e.result.speakerId || 'unknown';
            const text = e.result.text;

            if (text.trim()) {
                const speaker = `Speaker ${speakerId}`;
                
                // Only set the first speaker if not already set
                if (!firstSpeakerRef.current) {
                    firstSpeakerRef.current = speaker;
                    setActiveSpeakers([speaker]);
                    
                    if (speaker === 'Speaker Guest-1') {
                        calculateBaseline();
                    }
                }
                
                // Only process transcripts from the first speaker
                if (speaker === firstSpeakerRef.current) {
                    setCurrentSpeaker(speaker);
                    
                    console.log(speaker, text);

                    setTranscripts(prev => [...prev, {
                        speaker: speaker,
                        text: text
                    }]);

                    // Set a timeout to reset speaker and update baseline
                    setTimeout(() => {
                        setCurrentSpeaker(null);
                        calculateBaseline(); // Update baseline after speech ends
                        setSpeakerLevel(0); // Reset speaker level explicitly
                    }, 5000);
                }
            }
        };

        transcriber.sessionStarted = () => {
            startAudioMonitoring();
            // Reset the first speaker when starting a new session
            firstSpeakerRef.current = null;
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

    const SoundLevelLegend = () => (
        <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Sound Level Reference</Text>
            
            {/* Sound level visual representation */}
            <View style={styles.soundLevelBar}>
                <View style={styles.soundLevelGradient}>
                    <View style={[styles.soundLevelSegment, { backgroundColor: '#22c55e' }]} />
                    <View style={[styles.soundLevelSegment, { backgroundColor: '#f97316' }]} />
                    <View style={[styles.soundLevelSegment, { backgroundColor: '#ef4444' }]} />
                </View>
                <View style={styles.tickMarksContainer}>
                    <View style={styles.tickMark} />
                    <View style={styles.tickMark} />
                    <View style={styles.tickMark} />
                    <View style={styles.tickMark} />
                </View>
                <View style={styles.soundLevelLabels}>
                    <Text style={styles.soundLevelLabel}>-60dB</Text>
                    <Text style={styles.soundLevelLabel}>-30dB</Text>
                    <Text style={styles.soundLevelLabel}>-10dB</Text>
                    <Text style={styles.soundLevelLabel}>0dB</Text>
                </View>
            </View>
            
            <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.legendText}>Quiet (-60 to -30dB)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#f97316' }]} />
                    <Text style={styles.legendText}>Moderate (-30 to -10dB)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.legendText}>Loud (-10 to 0dB)</Text>
                </View>
            </View>
        </View>
    );

    const getVolumeColor = (speakerLevel: number): string => {
        if (speakerLevel > 50) return '#ef4444';    // > -40dB (very loud)
        if (speakerLevel > 30) return '#f97316';    // > -50dB (moderately loud)
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

                    <View style={styles.metricsContainer}>
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

export default VoiceAnalytics;
