import { SPEECH_KEY, SPEECH_REGION } from '@/env';

/**
 * Creates a new identification profile in Azure for the given speaker name.
 */
export async function createIdentificationProfile(speakerName: string): Promise<string> {
    const response = await fetch(`https://${SPEECH_REGION}.api.cognitive.microsoft.com/speaker/identification/v2.0/text-independent/profiles`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale: 'en-us', displayName: speakerName }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating identification profile:', errorText);
        throw new Error(`API error: ${response.status}`);
    }
    const result = await response.json();
    console.log(`Created identification profile for ${speakerName}:`, result.profileId);
    return result.profileId;
}

/**
 * Enrolls the provided audio blob for the given profile ID.
 */
export async function enrollSpeakerAudio(profileId: string, audioBlob: Blob): Promise<void> {
    const response = await fetch(`https://${SPEECH_REGION}.api.cognitive.microsoft.com/speaker/identification/v2.0/text-independent/profiles/${profileId}/enrollments`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY,
            'Content-Type': 'application/octet-stream',
        },
        body: audioBlob,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error enrolling speaker for profile ${profileId}:`, errorText);
        throw new Error(`API error: ${response.status}`);
    }
    console.log(`Enrollment successful for profile ${profileId}`);
}

/**
 * Identifies the speaker from the audio blob by comparing against the specified profile IDs.
 */
export async function identifySpeakers(audioBlob: Blob, profileIds: string[]): Promise<any> {
    if (profileIds.length === 0) {
        throw new Error('No speaker profiles available for identification');
    }
    
    // Update the API endpoint URL to use the correct path and version
    const url = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/speaker/identification/v2.0/text-independent/identify?profileIds=${profileIds.join(',')}&shortAudio=true`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY,
            'Content-Type': 'application/octet-stream',
        },
        body: audioBlob,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Speaker identification error:', errorText);
        throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
} 