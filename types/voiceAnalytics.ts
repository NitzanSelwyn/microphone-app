export interface Transcript {
    _id?: string;
    userId: string;
    text: string;
    timestamp: Date | string;
    speakerId: string;
    conversationId?: string;
    audioUrl?: string;
}

export interface VolumeNotification {
    message: string;
    type: 'high' | 'low' | 'ok' | 'background';
    color?: string;
} 