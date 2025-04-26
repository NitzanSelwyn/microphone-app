import React from 'react';
import { View, Text } from 'react-native';
import { voiceAnalyticsStyles as styles } from '@/constants/StyleFroPage';

interface AudioLevelIndicatorProps {
    level: number;
    label: string;
    color: string;
    baseline?: number | null;
}

const AudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({ level, label, color, baseline = null }) => (
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

export default AudioLevelIndicator; 