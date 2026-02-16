import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameScene from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { GameState, GameStatus, GameEvent, Mission } from './types';
import { generateMissionContext, generateSectorImage, AdmiralLiveConnection, getApiKey } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { INITIAL_BALLS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    balls: INITIAL_BALLS,
    status: GameStatus.IDLE,
    currentMission: null,
    rank: "Cadet"
  });

  const [missionImage, setMissionImage] = useState<string | null>(null);
  const [narrativeLog, setNarrativeLog] = useState<string>("Initializing systems...");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Audio Context & Admiral
  const audioContextRef = useRef<AudioContext | null>(null);
  const admiralRef = useRef<AdmiralLiveConnection | null>(null);

  // Audio Playback Queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);

  const processAudioQueue = async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;

    isPlayingAudioRef.current = true;
    const chunk = audioQueueRef.current.shift();

    if (chunk) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const pcmBytes = decode(chunk);
        // Assuming 24kHz mono from Gemini Live/TTS defaults often
        const audioBuffer = await decodeAudioData(pcmBytes, ctx, 24000, 1);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          isPlayingAudioRef.current = false;
          processAudioQueue();
        };
        source.start();
      } catch (e) {
        console.error(e);
        isPlayingAudioRef.current = false;
        processAudioQueue(); // Skip corrupt chunk
      }
    } else {
      isPlayingAudioRef.current = false;
    }
  };

  const handleAdmiralAudio = (base64: string) => {
    audioQueueRef.current.push(base64);
    processAudioQueue();
  };

  const handleAdmiralTranscript = (text: string) => {
    setNarrativeLog(text);
  };

  // Init Admiral on Mount
  useEffect(() => {
    admiralRef.current = new AdmiralLiveConnection();
    admiralRef.current.onAudioData = handleAdmiralAudio;
    admiralRef.current.onTranscript = handleAdmiralTranscript;
    return () => {
      admiralRef.current?.disconnect();
    };
  }, []);

  const startGame = useCallback(async () => {
    // Resume Audio Context on user interaction
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const apiKey = getApiKey();

    // Check API Key
    if (!apiKey) {
      console.warn("API_KEY not found. AI features disabled.");
    }

    // Connect Live API
    if (admiralRef.current && apiKey) {
      setIsAiThinking(true);
      await admiralRef.current.connect();
      setIsAiThinking(false);
      admiralRef.current.sendEvent("New Game Started. Welcome the recruit.");
    }

    setGameState(prev => ({
      ...prev,
      score: 0,
      balls: INITIAL_BALLS,
      status: GameStatus.PLAYING,
      rank: "Recruit"
    }));

    // Generate Mission Text (Static GenAI)
    const mission = await generateMissionContext(0, "Recruit");
    setGameState(prev => ({ ...prev, currentMission: { id: '1', ...mission, targetScore: 1000 }, rank: mission.rank }));

    // Generate Image
    generateSectorImage(mission.name).then(img => setMissionImage(img));

  }, []);

  const handleScore = (points: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + points }));
  };

  const handleBallLost = useCallback(async () => {
    setGameState(prev => {
      const newBalls = prev.balls - 1;
      const newStatus = newBalls <= 0 ? GameStatus.GAME_OVER : GameStatus.PLAYING;
      return { ...prev, balls: newBalls, status: newStatus };
    });

    if (admiralRef.current) {
      if (gameState.balls <= 1) {
        admiralRef.current.sendEvent("Game Over. Final Report.");
        setNarrativeLog("MISSION FAILED. RETURN TO BASE.");
      } else {
        admiralRef.current.sendEvent("Ball Lost. Reprimand them.");
      }
    }
  }, [gameState.balls]);

  // Game Event Handler
  const lastEventTime = useRef<number>(0);
  const handleGameEvent = useCallback(async (event: GameEvent) => {
    const now = Date.now();
    // Throttle events
    if (now - lastEventTime.current < 2000) return;
    lastEventTime.current = now;

    if (admiralRef.current) {
      if (event === GameEvent.BUMPER_HIT) admiralRef.current.sendEvent("Bumper Hit.");
      if (event === GameEvent.RAMP_SHOT) admiralRef.current.sendEvent("Ramp Shot.");
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-950 text-white overflow-hidden">

      {/* Left: 3D Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-b from-slate-900 to-black">

        {/* Game Title/Overlay */}
        {gameState.status === GameStatus.IDLE || gameState.status === GameStatus.GAME_OVER ? (
          <div className="absolute z-50 flex flex-col items-center inset-0 justify-center bg-black/60 backdrop-blur-sm">
            <h1 className="text-5xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-8 brand-font neon-glow text-center">
              HYPERSPACE<br />CADET
            </h1>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all transform hover:scale-105 brand-font text-xl border-2 border-blue-400 tracking-wider"
              aria-label={gameState.status === GameStatus.GAME_OVER ? "Restart Game" : "Start Game"}
            >
              {gameState.status === GameStatus.GAME_OVER ? "RE-INITIALIZE SYSTEM" : "INITIATE LAUNCH SEQUENCE"}
            </button>
          </div>
        ) : null}

        <GameScene
          status={gameState.status}
          onScore={handleScore}
          onEvent={handleGameEvent}
          onBallLost={handleBallLost}
        />

        {/* Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-slate-500 font-mono pointer-events-none">
          <span className="bg-black/50 p-2 rounded">FLIPPERS: A / D / ARROWS</span>
          <span className="bg-black/50 p-2 rounded">LAUNCH: SPACE / ENTER</span>
        </div>
      </div>

      {/* Right: AI Control Panel */}
      <div className="w-full lg:w-[450px] h-[35vh] lg:h-full z-20 shadow-2xl relative border-l border-slate-800">
        <ControlPanel
          gameState={gameState}
          missionImage={missionImage}
          currentNarrative={narrativeLog}
          isAiThinking={isAiThinking}
        />
      </div>

    </div>
  );
};

export default App;