import React from 'react';
import { View, Text } from 'react-native';
import { voiceAnalyticsStyles as styles } from '@/constants/StyleFroPage';

interface AudioLevelIndicatorProps {
    level: number;
    label: string;
    color: string;
    baseline?: number | null;
}

const AudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({ level, label, color, baseline = null }) => {
    // Clamp values to prevent overflow
    let barWidth = 0;
    let marginLeft = 0;
    if (baseline !== null) {
        marginLeft = Math.max(0, Math.min(100, baseline));
        barWidth = Math.max(0, Math.min(100 - marginLeft, level - marginLeft));
    } else {
        barWidth = Math.max(0, Math.min(100, level));
    }
    return (
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
                        <View style={[styles.baselineArea, { width: `${marginLeft}%` }]} />
                        <View style={[styles.baselineMark, { left: `${marginLeft}%` }]} />
                    </>
                )}
                <View
                    style={[
                        styles.audioLevel,
                        {
                            backgroundColor: color,
                            marginLeft: baseline !== null ? `${marginLeft}%` : 0,
                            width: `${barWidth}%`
                        }
                    ]}
                />
            </View>
        </View>
    );
};

export default AudioLevelIndicator; 