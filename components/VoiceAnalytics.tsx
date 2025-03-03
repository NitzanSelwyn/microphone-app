import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Animated, TextInput, Modal } from 'react-native';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { SPEECH_KEY, SPEECH_REGION } from '../env';

export const VoiceAnalytics: React.FC = () => {
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [transcripts, setTranscripts] = useState<{ speaker: string, text: string }[]>([]);
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
    const [backgroundLevel, setBackgroundLevel] = useState<number>(0);
    const [speakerLevel, setSpeakerLevel] = useState<number>(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const animatedHeight = useRef(new Animated.Value(1)).current;
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [processingAudio, setProcessingAudio] = useState(false);
    const [audioChunks, setAudioChunks] = useState<Uint8Array[]>([]);
    const chunkInterval = useRef<NodeJS.Timeout | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const baselineNoiseRef = useRef<number>(0);
    const recentNoiseLevelsRef = useRef<number[]>([]);

    const [speakerLevelColor, setSpeakerLevelColor] = useState('#22c55e');
    const [recognizer, setRecognizer] = useState<speechsdk.SpeechRecognizer | null>(null);
    const [speakerSegments, setSpeakerSegments] = useState<{ speaker: string, startTime: number, endTime: number }[]>([]);

    const [profileIds, setProfileIds] = useState<string[]>([]);
    const [enrolledProfiles, setEnrolledProfiles] = useState<{ [profileId: string]: string }>({});
    const [speakerName, setSpeakerName] = useState('');
    const [enrollmentRecording, setEnrollmentRecording] = useState<Audio.Recording | null>(null);
    const [audioRecorder, setAudioRecorder] = useState<Audio.Recording | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<Blob[]>([]);

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
                if (analyserRef.current && isListening) {  // Only update when listening
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const currentLevel = calculateAudioLevel(dataArray);

                    // Store recent noise levels
                    recentNoiseLevelsRef.current.push(currentLevel);
                    if (recentNoiseLevelsRef.current.length > 120) {
                        recentNoiseLevelsRef.current.shift();
                    }

                    const movingAverage = calculateMovingAverage(recentNoiseLevelsRef.current);

                    // Update speaker level
                    setSpeakerLevel(movingAverage);

                    // If the level is significantly above background, consider it speech
                    if (movingAverage > backgroundLevel + 10) {
                        setSpeakerLevelColor('#22c55e');
                    } else {
                        // Update background level when there's no speech
                        setBackgroundLevel(prevLevel => {
                            const newLevel = (prevLevel * 0.95) + (movingAverage * 0.05);
                            return Math.round(newLevel);
                        });
                    }

                    requestAnimationFrame(updateLevels);
                }
            };

            updateLevels();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const startTranscription = () => {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
        speechConfig.speechRecognitionLanguage = "en-US";

        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizing = (s, e) => {
            console.log(`🎙️ Recognizing in progress: "${e.result.text}"`);
        };

        recognizer.recognized = async (s, e) => {
            if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                console.log(`✨ Speech recognized: "${e.result.text}"`);

                let speakerName = 'Unknown Speaker';

                // Try to identify speaker if we have audio buffer and enrolled profiles
                if (profileIds.length > 0 && audioBuffer.length > 0) {
                    const latestAudioBlob = audioBuffer[audioBuffer.length - 1];
                    try {
                        speakerName = await handleIdentifySpeakers(latestAudioBlob);
                        console.log(`🔄 Mapping speech to speaker: "${e.result.text}" => ${speakerName}`);

                        // Update current speaker
                        setCurrentSpeaker(speakerName);

                        // Update active speakers list
                        setActiveSpeakers(prev => {
                            if (!prev.includes(speakerName)) {
                                console.log(`➕ New active speaker added: ${speakerName}`);
                                return [...prev, speakerName];
                            }
                            return prev;
                        });
                    } catch (error) {
                        console.error('❌ Speaker identification failed:', error);
                    }
                }

                // Add transcript with identified speaker
                setTranscripts(prev => {
                    console.log(`📝 New transcript added: ${speakerName} - "${e.result.text}"`);
                    return [...prev, { speaker: speakerName, text: e.result.text }];
                });
            } else if (e.result.reason === speechsdk.ResultReason.NoMatch) {
                console.log("❌ NOMATCH: Speech could not be recognized.");
            }
        };

        recognizer.canceled = (s, e) => {
            console.log(`CANCELED: Reason=${e.reason}`);
            recognizer.stopContinuousRecognitionAsync();
        };

        recognizer.sessionStopped = (s, e) => {
            console.log("\n    Session stopped event.");
            recognizer.stopContinuousRecognitionAsync();
        };

        recognizer.startContinuousRecognitionAsync();
        setRecognizer(recognizer);
    };

    const stopTranscription = () => {
        if (recognizer) {
            recognizer.stopContinuousRecognitionAsync(() => {
                console.log("Recognition stopped.");
                setRecognizer(null);
            });
        }
    };

    const startAudioRecording = async () => {
        try {
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setAudioRecorder(recording);
            // Clear previous buffer
            setAudioBuffer([]);
        } catch (error) {
            console.error('Failed to start audio recording:', error);
        }
    };

    const stopAudioRecording = async () => {
        if (!audioRecorder) return;
        try {
            await audioRecorder.stopAndUnloadAsync();
            const uri = audioRecorder.getURI();
            if (uri) {
                const response = await fetch(uri);
                const blob = await response.blob();
                setAudioBuffer(prev => [...prev, blob]);
            }
        } catch (error) {
            console.error('Failed to stop audio recording:', error);
        }
        setAudioRecorder(null);
    };

    const startRecording = async () => {
        if (isListening) return;
        setIsListening(true);
        await startAudioRecording();
        startAudioMonitoring();
        startTranscription();
    };

    const stopRecording = async () => {
        if (!isListening) return;
        setIsListening(false);
        await stopAudioRecording();
        stopTranscription();
    };

    const toggleRecording = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
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

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        Animated.timing(animatedHeight, {
            toValue: isCollapsed ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleEnrollSpeaker = async (audioBlob: Blob, speakerName: string) => {
        try {
            console.log('Starting speaker enrollment for:', speakerName);
            const profileId = await createIdentificationProfile(speakerName);
            console.log('Created profile ID:', profileId);

            await enrollSpeakerAudio(profileId, audioBlob);
            console.log('Successfully enrolled audio for profile:', profileId);

            setProfileIds(prev => [...prev, profileId]);
            setEnrolledProfiles(prev => ({ ...prev, [profileId]: speakerName }));

            // Clear the speaker name input after successful enrollment
            setSpeakerName('');

            // Show some feedback to the user (you'll need to implement this UI)
            alert(`Successfully enrolled ${speakerName}`);
        } catch (error) {
            console.error('Failed to enroll speaker:', error);
            alert('Failed to enroll speaker. Please try again.');
        }
    };

    const handleIdentifySpeakers = async (audioBlob: Blob): Promise<string> => {
        try {
            if (profileIds.length === 0) {
                console.log('🎤 Speaker Identification: No enrolled profiles available');
                return 'Unknown Speaker';
            }

            const result = await identifySpeakers(audioBlob, profileIds);
            console.log("🎯 Speaker Identification Result:", {
                confidence: result?.identifiedProfile?.confidence,
                profileId: result?.identifiedProfile?.profileId
            });

            if (result?.identifiedProfile?.profileId) {
                const profileId = result.identifiedProfile.profileId;
                const speakerName = enrolledProfiles[profileId] || `Speaker ${profileId}`;
                console.log(`👤 Identified Speaker: ${speakerName} (Profile ID: ${profileId})`);
                return speakerName;
            }
        } catch (error) {
            console.error('❌ Speaker identification failed:', error);
        }
        return 'Unknown Speaker';
    };

    const startEnrollmentRecording = async () => {
        try {
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setEnrollmentRecording(recording);
        } catch (error) {
            console.error('Failed to start enrollment recording:', error);
        }
    };

    const stopEnrollmentRecording = async () => {
        if (!enrollmentRecording) return;
        try {
            await enrollmentRecording.stopAndUnloadAsync();
            const uri = enrollmentRecording.getURI();
            if (uri) {
                const audioBlob = await fetch(uri).then(res => res.blob());
                handleEnrollSpeaker(audioBlob, speakerName);
            }
        } catch (error) {
            console.error('Failed to stop enrollment recording:', error);
        }
        setEnrollmentRecording(null);
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
                                    (currentSpeaker === 'Speaker Guest-1' ? speakerLevelColor : '#ef4444') :
                                    '#94a3b8'
                            }
                        ]} />

                        <Text style={styles.speakerStatus}>
                            {currentSpeaker || 'No one speaking'}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                { backgroundColor: isListening ? '#ef4444' : '#22c55e' }
                            ]}
                            onPress={toggleRecording}
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
                                color={speakerLevelColor}
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

            <View style={styles.enrollmentContainer}>
                <Text style={styles.enrollmentTitle}>Enroll Speaker</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Speaker Name"
                    value={speakerName}
                    onChangeText={setSpeakerName}
                />
                <TouchableOpacity
                    style={styles.enrollButton}
                    onPress={enrollmentRecording ? stopEnrollmentRecording : startEnrollmentRecording}
                >
                    <Text style={styles.enrollButtonText}>
                        {enrollmentRecording ? 'Stop Enrollment Recording' : 'Start Enrollment Recording'}
                    </Text>
                </TouchableOpacity>

                {/* Enrollment modal displaying instructional text and a stop button */}
                {enrollmentRecording && (
                    <Modal
                        visible={true}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={stopEnrollmentRecording}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <ScrollView contentContainerStyle={styles.modalContent}>
                                    <Text style={styles.modalText}>
                                        Once upon a time in a land of endless sunshine, the trees whispered secrets of ancient days. The gentle breeze carried the scent of blooming flowers as birds sang in harmony, filling the air with vibrant melodies. I am recording this passage for my speaker enrollment to capture every nuance of my voice—its tone, pace, and clarity. I speak clearly and steadily to ensure that the system can model my unique sound characteristics accurately. Thank you for allowing me to share my voice.
                                    </Text>
                                    <TouchableOpacity style={styles.modalStopButton} onPress={stopEnrollmentRecording}>
                                        <Text style={styles.modalStopButtonText}>Stop Enrollment Recording</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        </View>
    );
};

export default VoiceAnalytics;
