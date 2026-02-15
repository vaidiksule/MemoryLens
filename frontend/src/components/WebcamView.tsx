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
import { toast } from "sonner";

export default function WebcamView() {
    const webcamRef = useRef<Webcam>(null);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    const [faces, setFaces] = useState<any[]>([]);
    const [socket, setSocket] = useState<RecognitionWebSocket | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const silenceTimer = useRef<NodeJS.Timeout | null>(null);
    const [transcript, setTranscript] = useState("");
    const [showTranscript, setShowTranscript] = useState(true);

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
            }, 300); // Increased to ~3fps for smoother tracking
        } else {
            socket?.close();
            stopRecording();
            setFaces([]); // Clear overlay on stop
            setTranscript("");
        }
        return () => clearInterval(interval);
    }, [isRecognitionActive, socket]);

    // Audio Streaming Logic for Real-time Identity
    useEffect(() => {
        let audioWs: WebSocket | null = null;
        let audioContext: AudioContext | null = null;
        let processor: AudioNode | null = null;
        let source: MediaStreamAudioSourceNode | null = null;
        let globalStream: MediaStream | null = null;

        if (isRecognitionActive) {
            // 1. Connect to /ws/listen
            try {
                // Determine WS URL
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const wsUrl = `ws://${window.location.hostname}:8000/ws/listen`;

                audioWs = new WebSocket(wsUrl);
                audioWs.binaryType = 'arraybuffer';

                audioWs.onopen = async () => {
                    console.log("Connected to Real-time Audio Stream");

                    // 2. Start Audio Capture
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        globalStream = stream;
                        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        source = audioContext.createMediaStreamSource(stream);

                        // Use modern AudioWorklet
                        try {
                            await audioContext.audioWorklet.addModule('/audio-processor.js');
                            const node = new AudioWorkletNode(audioContext, 'audio-processor');

                            node.port.onmessage = (event) => {
                                if (audioWs && audioWs.readyState === WebSocket.OPEN) {
                                    const inputData = event.data;
                                    if (inputData) {
                                        const buffer = new ArrayBuffer(inputData.length * 2);
                                        const view = new DataView(buffer);
                                        for (let i = 0; i < inputData.length; i++) {
                                            const s = Math.max(-1, Math.min(1, inputData[i]));
                                            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                                        }
                                        audioWs.send(buffer);
                                    }
                                }
                            };

                            source.connect(node);
                            node.connect(audioContext.destination);
                            processor = node;
                        } catch (err) {
                            console.error("AudioWorklet Error:", err);
                        }
                    } catch (err) {
                        console.error("Error accessing microphone:", err);
                    }
                };

                audioWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);

                    if (data.type === 'identity_update') {
                        toast.success(`Identity Updated: ${data.name}`);
                        console.log("Real-time Identity Update:", data);
                    } else if (data.type === 'transcript') {
                        setTranscript(data.text);
                    }
                };

            } catch (e) {
                console.error("WS Setup Error", e);
            }
        }

        return () => {
            // Cleanup
            if (processor) processor.disconnect();
            if (source) source.disconnect();
            if (audioContext) audioContext.close();
            if (globalStream) globalStream.getTracks().forEach(track => track.stop());
            if (audioWs) audioWs.close();
        };
    }, [isRecognitionActive]);


    // Auto-Recording Logic (Legacy/Backup for summary)
    // We KEEP this for the "Session Summary" logic, as requested.
    useEffect(() => {
        if (!isRecognitionActive) return;

        const hasFace = faces.length > 0;
        if (hasFace && !isRecording) {
            startRecording();
        } else if (!hasFace && isRecording) {
            stopRecording();
        }
    }, [faces, isRecognitionActive, isRecording]);

    const startRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                    if (silenceTimer.current) clearTimeout(silenceTimer.current);
                    silenceTimer.current = setTimeout(() => {
                        console.log("Silence detected, stopping recording...");
                        recorder.stop();
                    }, 3000);
                }
            };

            recorder.onstop = async () => {
                setIsRecording(false);
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                if (audioBlob.size > 1000) {
                    try {
                        const { transcript } = await transcribeAudio(audioBlob);
                        if (transcript) {
                            // Only link to a person if exactly ONE face is visible to avoid misattribution.
                            // If multiple people are present, let the backend try to identify by voice/context or store as generic.
                            const unambiguousPersonId = faces.length === 1 && faces[0].name !== 'Unknown' ? faces[0].person_id : '';
                            const currentImage = webcamRef.current?.getScreenshot();

                            await addMemory(
                                unambiguousPersonId,
                                transcript,
                                currentImage || undefined
                            );
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            };

            recorder.start(500);
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };

    return (
        <div className="relative w-full h-full">
            {/* NO outer border/shadow here as it's in a window frame now */}
            <div className="relative w-full h-full bg-slate-900 overflow-hidden transform scale-x-[-1]">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                    className="w-full h-full object-cover"
                />

                {/* Overlay Rendering */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Sort faces by X-coordinate to maintain consistent DOM order */}
                    {[...faces].sort((a, b) => a.bbox[1] - b.bbox[1]).map((face) => (
                        <OverlayBox
                            key={face.bbox.join('-')}
                            face={face}
                        />
                    ))}
                </div>

                {/* Floating Memory Cards */}
                {[...faces]
                    .filter(f => f.name !== 'Unknown')
                    .sort((a, b) => a.bbox[1] - b.bbox[1])
                    .map((face) => (
                        <div
                            key={`card-${face.bbox.join('-')}`}
                            className="absolute z-50 pointer-events-none transform scale-x-[-1]"
                            style={{
                                top: `${face.bbox[0]}px`,
                                left: `${face.bbox[1] + 20}px`,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            <MemoryCard face={face} />
                        </div>
                    ))}

                {/* Live Transcript Overlay */}
                {showTranscript && transcript && (
                    <div className="absolute top-4 left-4 z-50 max-w-sm pointer-events-auto transform scale-x-[-1] animate-in fade-in slide-in-from-top-2">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Mic className="h-3 w-3 text-red-400 animate-pulse" />
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Transcript</span>
                            </div>
                            <p className="text-sm font-medium text-white leading-relaxed">
                                {transcript}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Layer (Outside video transform) */}
            <div className="absolute bottom-6 left-0 right-0 z-50 flex items-center justify-center gap-4 px-4 pointer-events-none">
                <Button
                    size="lg"
                    variant={isRecognitionActive ? "destructive" : "default"}
                    onClick={() => setIsRecognitionActive(!isRecognitionActive)}
                    className="pointer-events-auto shadow-xl hover:scale-105 transition-all font-bold tracking-tight h-12 text-sm backdrop-blur-md bg-white/90 text-slate-900 hover:bg-white"
                >
                    {isRecognitionActive ? (
                        <>
                            <ZapOff className="mr-2 h-4 w-4 text-red-500" />
                            End Session
                        </>
                    ) : (
                        <>
                            <Zap className="mr-2 h-4 w-4 text-blue-500" />
                            Start MemoryLens
                        </>
                    )}
                </Button>

                {/* Toggle Transcript Button */}
                {isRecognitionActive && (
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="pointer-events-auto h-12 w-12 rounded-full shadow-xl bg-black/50 text-white hover:bg-black/70 border border-white/10 backdrop-blur-md"
                        title="Toggle Transcript"
                    >
                        {showTranscript ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                )}
            </div>
        </div>
    );
}
