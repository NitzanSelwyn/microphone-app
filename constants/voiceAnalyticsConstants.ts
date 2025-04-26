export const COLORS = {
    AUDIO: {
        QUIET: '#22c55e',    // Green - quiet levels
        MODERATE: '#f97316', // Orange - moderate levels
        LOUD: '#ef4444',     // Red - loud levels
    },
    SPEAKER: {
        ACTIVE: '#22c55e',   // Green - active speaker
        INACTIVE: '#94a3b8', // Gray - inactive speaker
        OTHER: '#ef4444',    // Red - other speakers
    },
    UI: {
        BACKGROUND: '#ffffff',
        TEXT: '#000000',
        BORDER: '#e5e7eb',
    }
} as const;

export const API_URL = 'https://microphone-server-2617c5e1bee8.herokuapp.com/api'; 