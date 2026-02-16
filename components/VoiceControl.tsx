
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Battery, Zap } from 'lucide-react';

interface VoiceControlProps {
    onAudioData: (base64: string) => void;
    fuel: number;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onAudioData, fuel }) => {
    const [isListening, setIsListening] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const intervalRef = useRef<any>(null);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Use a lower sample rate if possible, or just default
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Chrome supports webm/opus usually

            mediaRecorder.current = recorder;

            recorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    const buffer = await event.data.arrayBuffer();
                    // Convert to base64. 
                    // Note: Gemini Live API expects PCM usually, but can handle specific encodings. 
                    // For simplicity in this demo, we might need a converter or check if Gemini handles webm containers directly in inlineData.
                    // *Correction*: The previous system instruction said "audio/pcm;rate=16000". Sending raw webm might fail.
                    // However, browsers don't record raw PCM easily without AudioContext.
                    // Let's assume for this "Prompt Wars" demo we try to send the chunk and see, 
                    // OR we use a simple AudioContext processor to get Float32 data, downsample, and send.

                    // For this specific implementation, let's use a simpler approach: 
                    // We'll rely on the server (Gemini) hopefully handling standard formats or we'd implement a processor.
                    // GIVEN the complexity of valid PCM conversion in strict React without external libs,
                    // we will try to just send the base64 of the blob. If Gemini complains, we'd need a processor worklet.
                    // Re-reading docs: Gemini 2.0 Flash Live API often accepts "audio/pcm" (Linear 16-bit).

                    // Let's implement a quick AudioContext based recorder instead of MediaRecorder to get PCM.
                }
            };

            recorder.start(500); // 500ms chunks
            setIsListening(true);
        } catch (e) {
            console.error("Mic Error:", e);
        }
    };

    const stopListening = () => {
        mediaRecorder.current?.stop();
        setIsListening(false);
    };

    // Revised approach: AudioContext for PCM
    // We need to provide the "onAudioData" with base64 PCM 16-bit 16khz ideally.

    const [usePCM, setUsePCM] = useState(true);
    const audioContext = useRef<AudioContext | null>(null);
    const processor = useRef<ScriptProcessorNode | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);

    const toggleMic = async () => {
        if (isListening) {
            // Stop
            source.current?.disconnect();
            processor.current?.disconnect();
            audioContext.current?.close();
            setIsListening(false);
        } else {
            // Start
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        validResthttps: true,
                        sampleRate: 16000,
                        channelCount: 1
                    }
                });

                audioContext.current = new window.AudioContext({ sampleRate: 16000 });
                source.current = audioContext.current.createMediaStreamSource(stream);

                // 512 buffer size = very frequent updates. 4096 is safer.
                processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

                processor.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert Float32 to Int16
                    const buffer = new ArrayBuffer(inputData.length * 2);
                    const view = new DataView(buffer);
                    for (let i = 0; i < inputData.length; i++) {
                        // Clamp and scale
                        let s = Math.max(-1, Math.min(1, inputData[i]));
                        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        view.setInt16(i * 2, s, true); // Little endian
                    }

                    // Base64 encode
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                    onAudioData(base64);
                };

                source.current.connect(processor.current);
                processor.current.connect(audioContext.current.destination); // destination is mute usually in this path if not connected to speakers

                setIsListening(true);
            } catch (e) {
                console.error("Audio Start Failed", e);
            }
        }
    };

    return (
        <div className="flex items-center gap-4 bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-lg">
            <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
                {isListening ? <Mic className="w-8 h-8 text-white relative z-10" /> : <MicOff className="w-8 h-8 text-gray-400" />}
            </button>

            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <Battery className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400 tracking-widest">AUX POWER (FUEL)</span>
                </div>
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                    <div
                        className={`h-full transition-all duration-500 ${fuel < 20 ? 'bg-red-500' : 'bg-yellow-400'}`}
                        style={{ width: `${Math.min(100, fuel)}%` }}
                    />
                </div>
                {isListening && <div className="text-[10px] text-green-400 mt-1 animate-pulse">VOICE UPLINK ACTIVE // TRANSMITTING...</div>}
            </div>

            <div className="text-right">
                <div className="text-xs text-gray-500">CMDS</div>
                <div className="text-xs font-mono text-cyan-400">"SHIELDS"</div>
                <div className="text-xs font-mono text-cyan-400">"BOOST"</div>
            </div>
        </div>
    );
};

export default VoiceControl;
