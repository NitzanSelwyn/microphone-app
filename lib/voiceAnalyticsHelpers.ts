// Helper to calculate RMS (Root Mean Square) audio level and convert to dB
export function calculateAudioLevel(dataArray: Uint8Array): number {
    const rms = Math.sqrt(
        dataArray.reduce((sum, val) => sum + (val * val), 0) / dataArray.length
    );
    const db = 20 * Math.log10((rms + 1) / 255);
    const normalizedDb = Math.max(-60, Math.min(0, db));
    return Math.round(normalizedDb + 60);
}

export function calculateMovingAverage(values: number[], windowSize: number = 10): number {
    if (values.length === 0) return 0;
    const window = values.slice(-windowSize);
    return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
}

// Baseline calculation is context-dependent, so export a function that takes recentNoiseLevels and returns a baseline
export function calculateBaseline(recentNoiseLevels: number[], windowSize: number = 30): number {
    if (recentNoiseLevels.length > 0) {
        const newBaseline = calculateMovingAverage(recentNoiseLevels, windowSize);
        if (newBaseline === 0 || newBaseline > 5) {
            return newBaseline;
        }
    }
    return 0;
}

// Volume color helper (COLORS must be imported from constants)
import { COLORS } from '../constants/voiceAnalyticsConstants';
export function getVolumeColor(speakerLevel: number): string {
    if (speakerLevel > 40) {
        return COLORS.AUDIO.LOUD;
    } else if (speakerLevel > 25) {
        return COLORS.AUDIO.MODERATE;
    }
    return COLORS.AUDIO.QUIET;
}

// Speaker display name helper
export function getSpeakerDisplayName(speakerId: string, userName?: string): string {
    if (speakerId === 'Speaker Guest-1' && userName) {
        return `Speaker ${userName}`;
    }
    return speakerId;
}

// Helper to get background icon name based on volume
export function getBackgroundIconName(level: number): string {
    if (level >= 85) return 'airplanemode-active'; // Airplane
    if (level >= 70) return 'directions-car';      // Car/Busy street
    if (level >= 60) return 'vacuum';             // Vacuum cleaner
    return 'background.volume';                    // Quiet/normal
} 