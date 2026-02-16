import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameScene, { PhysicsState } from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { GameState, GameStatus, GameEvent, Mission } from './types';
import { generateMissionContext, generateSectorImage, GameMasterConnection, PhysicsAnomaly, getApiKey } from './services/geminiService';
import { INITIAL_BALLS } from './constants';

const DEFAULT_PHYSICS: PhysicsState = {
  gravity: -30,
  bumperBounce: 2.5,
  flipperStrength: 1.0,
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    balls: INITIAL_BALLS,
    status: GameStatus.IDLE,
    currentMission: null,
    rank: "Hacker",
    stats: {
      leftRampHits: 0,
      rightRampHits: 0,
      bumperHits: 0,
      wormholeEnters: 0,
      drains: 0
    }
  });

  const [physicsState, setPhysicsState] = useState<PhysicsState>(DEFAULT_PHYSICS);
  const [activeAnomaly, setActiveAnomaly] = useState<PhysicsAnomaly | null>(null);

  const [missionImage, setMissionImage] = useState<string | null>(null);
  const [narrativeLog, setNarrativeLog] = useState<string>("System Safe. No Intruders.");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // AI Connection
  const gmRef = useRef<GameMasterConnection | null>(null);

  const handleAnomaly = (anomaly: PhysicsAnomaly) => {
    setActiveAnomaly(anomaly);
    setNarrativeLog(`ALERT: ${anomaly.message}`);

    // Apply Physics Change
    if (anomaly.type === 'GRAVITY') {
      setPhysicsState(prev => ({ ...prev, gravity: anomaly.value }));
    } else if (anomaly.type === 'BOUNCE') {
      setPhysicsState(prev => ({ ...prev, bumperBounce: anomaly.value }));
    } else if (anomaly.type === 'FLIPPER_GLITCH') {
      setPhysicsState(prev => ({ ...prev, flipperStrength: anomaly.value }));
    }

    // Reset after duration
    if (anomaly.duration > 0) {
      setTimeout(() => {
        setPhysicsState(DEFAULT_PHYSICS);
        setActiveAnomaly(null);
        setNarrativeLog("System Stabilized.");
      }, anomaly.duration);
    }
  };

  // Init GM on Mount
  useEffect(() => {
    gmRef.current = new GameMasterConnection();
    gmRef.current.onAnomaly = handleAnomaly;
    return () => {
      gmRef.current?.disconnect();
    };
  }, []);

  const startGame = useCallback(async () => {
    setGameState(prev => ({
      ...prev,
      score: 0,
      balls: INITIAL_BALLS,
      status: GameStatus.PLAYING,
      rank: "Script Kiddie",
      stats: { // Reset Stats
        leftRampHits: 0,
        rightRampHits: 0,
        bumperHits: 0,
        wormholeEnters: 0,
        drains: 0
      }
    }));

    const apiKey = getApiKey();
    if (gmRef.current && apiKey) {
      setIsAiThinking(true);
      await gmRef.current.connect();
      setIsAiThinking(false);
      // Initial probe
      gmRef.current.sendEvent("Hacker Accessing Mainframe.");
    }


    // Generate Mission
    const mission = await generateMissionContext(0, "Script Kiddie");
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
      const newDrains = prev.stats.drains + 1;
      return { ...prev, balls: newBalls, status: newStatus, stats: { ...prev.stats, drains: newDrains } };
    });

    if (gmRef.current) {
      gmRef.current.sendEvent("Packet Loss Detected (Ball Lost)");
    }
  }, []);

  // Game Event Handler
  const lastEventTime = useRef<number>(0);
  const handleGameEvent = useCallback(async (event: GameEvent) => {
    const now = Date.now();

    // Update Stats
    setGameState(prev => {
      const stats = { ...prev.stats };
      if (event === GameEvent.LEFT_RAMP_SHOT) stats.leftRampHits++;
      if (event === GameEvent.RIGHT_RAMP_SHOT) stats.rightRampHits++;
      if (event === GameEvent.BUMPER_HIT) stats.bumperHits++;
      if (event === GameEvent.WORMHOLE_ENTERED) stats.wormholeEnters++;

      return { ...prev, stats };
    });

    if (now - lastEventTime.current < 2000) return;
    lastEventTime.current = now;

    if (gmRef.current) {
      if (event === GameEvent.BUMPER_HIT) gmRef.current.sendEvent("Firewall Breach (Bumper Hit)");
      if (event === GameEvent.LEFT_RAMP_SHOT) gmRef.current.sendEvent("Data Stream Accessed (Left Ramp)");
      if (event === GameEvent.RIGHT_RAMP_SHOT) gmRef.current.sendEvent("Data Stream Accessed (Right Ramp)");
      if (event === GameEvent.WORMHOLE_ENTERED) gmRef.current.sendEvent("Wormhole Traversal");
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-black text-white overflow-hidden font-mono">

      {/* Left: 3D Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-center relative transition-colors duration-500 ${activeAnomaly ? 'bg-red-900/20' : 'bg-black'}`}>

        {/* Anomaly Overlay */}
        {activeAnomaly && (
          <div className="absolute top-10 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <div className="bg-red-600 text-black font-bold px-6 py-2 rounded text-2xl animate-pulse border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)]">
              ⚠ {activeAnomaly.message} ⚠
            </div>
          </div>
        )}

        {/* Game Title/Overlay */}
        {gameState.status === GameStatus.IDLE || gameState.status === GameStatus.GAME_OVER ? (
          <div className="absolute z-50 flex flex-col items-center inset-0 justify-center bg-black/80 backdrop-blur-sm">
            <h1 className="text-5xl lg:text-7xl font-bold text-green-500 mb-8 tracking-widest glitch-text text-center">
              SYSTEM<br />CRASH
            </h1>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-green-700 hover:bg-green-600 text-black font-bold rounded shadow-[0_0_30px_rgba(21,128,61,0.6)] transition-all transform hover:scale-105 text-xl border border-green-400 tracking-wider"
            >
              {gameState.status === GameStatus.GAME_OVER ? "REBOOT KERNEL" : "INJECT PAYLOAD"}
            </button>
          </div>
        ) : null}

        <GameScene
          status={gameState.status}
          onScore={handleScore}
          onEvent={handleGameEvent}
          onBallLost={handleBallLost}
          physics={physicsState}
        />

        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-green-800 font-mono pointer-events-none">
          <span>GRAVITY: {physicsState.gravity}</span>
          <span>BOUNCE: {physicsState.bumperBounce}</span>
        </div>
      </div>

      {/* Right: AI Control Panel */}
      <div className="w-full lg:w-[450px] h-[35vh] lg:h-full z-20 shadow-2xl relative border-l border-green-900">
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