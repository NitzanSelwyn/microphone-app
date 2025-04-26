import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/voiceAnalyticsConstants';
import { voiceAnalyticsStyles as styles } from '@/constants/StyleFroPage';

const SoundLevelLegend: React.FC = () => (
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

export default SoundLevelLegend; 