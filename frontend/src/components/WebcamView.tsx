"use client";


import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { RecognitionWebSocket } from '@/lib/websocket';
import { registerFace, transcribeAudio, addMemory } from '@/lib/api';
import OverlayBox from './OverlayBox';
import MemoryCard from './MemoryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, UserPlus, Zap, ZapOff } from 'lucide-react';
import { toast } from 'sonner';

export default function WebcamView() {
    const webcamRef = useRef<Webcam>(null);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    const [faces, setFaces] = useState<any[]>([]);
    const [socket, setSocket] = useState<RecognitionWebSocket | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [newName, setNewName] = useState('');

    // WebSocket Setup
    useEffect(() => {
        const ws = new RecognitionWebSocket((data) => {
            if (Array.isArray(data)) {
                setFaces(data);
            }
        });
        setSocket(ws);
        return () => ws.close();
    }, []);

    // Frame Capture Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecognitionActive && socket) {
            socket.connect();
            interval = setInterval(() => {
                const imageSrc = webcamRef.current?.getScreenshot();
                if (imageSrc) {
                    socket.sendFrame(imageSrc);
                }
            }, 1500); // 1.5s interval as per spec
        } else {
            socket?.close();
        }
        return () => clearInterval(interval);
    }, [isRecognitionActive, socket]);

    // Audio Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                toast.info("Transcribing...");
                try {
                    const { transcript } = await transcribeAudio(audioBlob);
                    if (transcript) {
                        // Find the most confident face in view to link memory
                        const bestFace = faces.find(f => f.name !== 'Unknown');
                        if (bestFace) {
                            await addMemory(bestFace.person_id, transcript);
                            toast.success(`Memory added for ${bestFace.name}`);
                        } else {
                            toast.error("No recognized person in view to link memory.");
                        }
                    }
                } catch (error) {
                    toast.error("Transcription/Storage failed");
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = () => {
        mediaRecorder?.stop();
        setIsRecording(false);
        mediaRecorder?.stream.getTracks().forEach(track => track.stop());
    };

    // Face Registration
    const handleRegister = async () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc || !newName) return;

        setIsRegistering(true);
        try {
            await registerFace(newName, imageSrc);
            toast.success(`${newName} registered successfully!`);
            setNewName('');
        } catch (err) {
            toast.error("Registration failed. No face detected?");
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl">
            <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                    className="w-full h-full object-cover"
                />

                {/* Overlay Rendering */}
                <div className="absolute inset-0 pointer-events-none">
                    {faces.map((face, i) => (
                        <OverlayBox key={i} face={face} />
                    ))}
                </div>

                {/* Floating Memory Cards */}
                {faces.filter(f => f.name !== 'Unknown').map((face, i) => (
                    <div
                        key={i}
                        className="absolute z-50 pointer-events-none"
                        style={{
                            top: `${face.bbox[2] + 10}px`,
                            left: `${face.bbox[3]}px`,
                            transition: 'all 0.3s ease-out'
                        }}
                    >
                        <MemoryCard face={face} />
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5">
                <div className="flex gap-2 items-center">
                    <Button
                        variant={isRecognitionActive ? "destructive" : "default"}
                        onClick={() => setIsRecognitionActive(!isRecognitionActive)}
                        className="w-full"
                    >
                        {isRecognitionActive ? <ZapOff className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
                        {isRecognitionActive ? "Stop AI" : "Start Recognition"}
                    </Button>

                    <Button
                        variant={isRecording ? "destructive" : "outline"}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={!isRecognitionActive}
                        className="w-full"
                    >
                        {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {isRecording ? "Stop Note" : "Voice Memory"}
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Person Name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-white/5 border-white/10"
                    />
                    <Button onClick={handleRegister} disabled={isRegistering || !newName} className="whitespace-nowrap">
                        <UserPlus className="mr-2 h-4 w-4" /> Register
                    </Button>
                </div>
            </div>
        </div>
    );
}
