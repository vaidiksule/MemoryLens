// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function registerFace(name: string, imageBase64: string) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image_base64', imageBase64);

    const response = await fetch(`${API_URL}/register-face`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to register face');
    }

    return response.json();
}

export async function transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Transcription failed');
    }

    return response.json();
}

export async function addMemory(personId: string, transcript: string, imageBase64?: string) {
    const formData = new FormData();
    if (personId) formData.append('person_id', personId);
    formData.append('transcript', transcript);
    if (imageBase64) formData.append('image_base64', imageBase64);

    const response = await fetch(`${API_URL}/add-memory`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to add memory');
    }

    return response.json();
}

export async function getPeople() {
    const response = await fetch(`${API_URL}/people`);
    if (!response.ok) throw new Error('Failed to fetch people');
    return response.json();
}

export async function getPersonMemories(personId: string) {
    const response = await fetch(`${API_URL}/people/${personId}/memories`);
    if (!response.ok) throw new Error('Failed to fetch memories');
    return response.json();
}
