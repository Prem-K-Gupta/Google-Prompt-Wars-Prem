import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameScene from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import VoiceControl from './components/VoiceControl';
import { GameState, GameStatus, GameEvent, LevelConfig, GalaxyState, WarpState } from './types';
import { generateMissionContext, generateSectorImage, GameMasterConnection, PhysicsAnomaly, getApiKey, generateLevelConfig } from './services/geminiService';
import { INITIAL_BALLS } from './constants';

const INITIAL_LEVEL_CONFIG: LevelConfig = {
  planetName: "Terra Prime (Home Base)",
  visualTheme: {
    backgroundPrompt: "Retro sci-fi arcade, neon blue and orange, z-stars",
    primaryColor: "#00ffff",
    secondaryColor: "#ff00ff",
    hazardColor: "#ff0000"
  },
  physics: {
    gravity: -30,
    friction: 0.1,
    bumperBounce: 2.5,
    flipperStrength: 1.0
  },
  boss: {
    name: "System Core",
    description: "The central CPU of the arcade simulation.",
    weakness: "CENTER",
    shieldStrength: 100
  },
  musicMood: "Synthwave, Upbeat"
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
    },
    galaxy: {
      currentLevel: 1,
      currentPlanet: INITIAL_LEVEL_CONFIG,
      fuel: 100,
      artifacts: [],
      warpState: WarpState.IDLE
    }
  });

  const [activeAnomaly, setActiveAnomaly] = useState<PhysicsAnomaly | null>(null);
  const [missionImage, setMissionImage] = useState<string | null>(null);
  const [narrativeLog, setNarrativeLog] = useState<string>("System Safe. No Intruders.");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isWarping, setIsWarping] = useState(false);

  // AI Connection
  const gmRef = useRef<GameMasterConnection | null>(null);
  const fuelRef = useRef(100);

  // Sync fuel ref
  useEffect(() => {
    fuelRef.current = gameState.galaxy.fuel;
  }, [gameState.galaxy.fuel]);

  const handleAnomalyWrapper = useCallback((anomaly: PhysicsAnomaly) => {
    if (anomaly.type === 'SHIP_SYSTEM') {
      const currentFuel = fuelRef.current;
      const cost = anomaly.cost || 20;

      if (currentFuel >= cost) {
        setGameState(prev => ({
          ...prev,
          galaxy: { ...prev.galaxy, fuel: prev.galaxy.fuel - cost }
        }));
        setNarrativeLog(`COMMAND ACCEPTED: ${anomaly.action}`);
      } else {
        setNarrativeLog(`COMMAND FAILED: INSUFFICIENT FUEL`);
      }
      return;
    }

    setActiveAnomaly(anomaly);
    setNarrativeLog(`ALERT: ${anomaly.message}`);

    if (anomaly.duration > 0) {
      setTimeout(() => {
        setActiveAnomaly(null);
        setNarrativeLog("System Stabilized.");
      }, anomaly.duration);
    }
  }, []);

  useEffect(() => {
    if (!gmRef.current) {
      gmRef.current = new GameMasterConnection();
    }
    gmRef.current.onAnomaly = handleAnomalyWrapper;
    return () => {
      gmRef.current?.disconnect();
    };
  }, [handleAnomalyWrapper]);


  const startGame = useCallback(async () => {
    setGameState(prev => ({
      ...prev,
      score: 0,
      balls: INITIAL_BALLS,
      status: GameStatus.PLAYING,
      rank: "Script Kiddie",
      stats: {
        leftRampHits: 0,
        rightRampHits: 0,
        bumperHits: 0,
        wormholeEnters: 0,
        drains: 0
      },
      galaxy: {
        currentLevel: 1,
        currentPlanet: INITIAL_LEVEL_CONFIG,
        fuel: 100,
        artifacts: [],
        warpState: WarpState.IDLE
      }
    }));

    const apiKey = getApiKey();
    if (gmRef.current && apiKey) {
      setIsAiThinking(true);
      await gmRef.current.connect();
      setIsAiThinking(false);
      gmRef.current.sendEvent("Hacker Accessing Mainframe.");
    }

    const mission = await generateMissionContext(0, "Script Kiddie");
    setGameState(prev => ({ ...prev, currentMission: { id: '1', ...mission, targetScore: 1000 }, rank: mission.rank }));
    generateSectorImage(mission.name).then(img => setMissionImage(img));
  }, []);

  const handleScore = useCallback((points: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + points }));
  }, []);

  const handleGameEvent = useCallback((event: GameEvent) => {
    if (gmRef.current) gmRef.current.sendEvent(event.replace('_', ' '));

    setGameState(prev => {
      const newStats = { ...prev.stats };
      if (event === GameEvent.LEFT_RAMP_SHOT) newStats.leftRampHits++;
      if (event === GameEvent.RIGHT_RAMP_SHOT) newStats.rightRampHits++;
      if (event === GameEvent.BUMPER_HIT) newStats.bumperHits++;
      if (event === GameEvent.WORMHOLE_ENTERED) newStats.wormholeEnters++;
      if (event === GameEvent.BALL_LOST) newStats.drains++;
      return { ...prev, stats: newStats };
    });
  }, []);

  const handleBallLost = useCallback(() => {
    setGameState(prev => {
      const newBalls = prev.balls - 1;
      if (newBalls <= 0) {
        return { ...prev, balls: 0, status: GameStatus.GAME_OVER };
      }
      return { ...prev, balls: newBalls };
    });
    handleGameEvent(GameEvent.BALL_LOST);
  }, [handleGameEvent]);

  // WARP MECHANIC
  const handleWarp = useCallback(async () => {
    if (isWarping) return;
    setIsWarping(true);
    setNarrativeLog("INITIATING WARP JUMP...");
    setIsAiThinking(true);

    const nextLevelConfig = await generateLevelConfig(gameState.galaxy.currentLevel + 1, gameState.stats);
    generateSectorImage(nextLevelConfig.planetName).then(img => setMissionImage(img));

    setIsAiThinking(false);

    setGameState(prev => ({
      ...prev,
      galaxy: {
        ...prev.galaxy,
        currentLevel: prev.galaxy.currentLevel + 1,
        currentPlanet: nextLevelConfig
      }
    }));

    setNarrativeLog(`ARRIVED AT: ${nextLevelConfig.planetName}`);
    setIsWarping(false);
  }, [gameState.galaxy.currentLevel, gameState.stats, isWarping]);

  const handleAudioData = (base64: string) => {
    if (gmRef.current) {
      gmRef.current.sendAudioChunk(base64);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-black text-white overflow-hidden font-mono">

      {/* Left: 3D Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-center relative transition-colors duration-1000 ${isWarping ? 'animate-pulse bg-indigo-900' : ''}`}
        style={{ backgroundColor: isWarping ? '#000' : gameState.galaxy.currentPlanet.visualTheme.secondaryColor + '20' }}>

        {/* Anomaly Overlay */}
        {activeAnomaly && (
          <div className="absolute top-10 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <div className={`font-bold px-6 py-2 rounded text-2xl animate-pulse border-2 shadow-[0_0_20px_rgba(220,38,38,0.8)] ${activeAnomaly.type === 'SHIP_SYSTEM' ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500' : 'bg-red-600 text-black border-red-500'}`}>
              ⚠ {activeAnomaly.message} ⚠
            </div>
          </div>
        )}

        {/* Warp Overlay */}
        {isWarping && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-4xl font-bold text-cyan-400 animate-bounce">WARPING TO NEXT SECTOR...</div>
          </div>
        )}

        {/* Game Title Overlay (when idle) */}
        {gameState.status === GameStatus.IDLE && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
              VOID CADET
            </h1>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-xl rounded shadow-[0_0_15px_rgba(22,163,74,0.6)] transition-all transform hover:scale-105"
            >
              INITIALIZE SYSTEM
            </button>
          </div>
        )}

        <GameScene
          status={gameState.status}
          // @ts-ignore
          levelConfig={gameState.galaxy.currentPlanet}
          onScore={handleScore}
          onEvent={handleGameEvent}
          onBallLost={handleBallLost}
          // @ts-ignore
          onWarp={handleWarp}
        />

        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs font-mono pointer-events-none" style={{ color: gameState.galaxy.currentPlanet.visualTheme.primaryColor }}>
          <span>PLANET: {gameState.galaxy.currentPlanet.planetName}</span>
          <span>GRAVITY: {gameState.galaxy.currentPlanet.physics.gravity}</span>
        </div>
      </div>

      {/* Right: AI Control Panel */}
      <div className="w-full lg:w-[450px] h-[35vh] lg:h-full z-20 shadow-2xl relative border-l border-green-900 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ControlPanel
            gameState={gameState}
            missionImage={missionImage}
            currentNarrative={narrativeLog}
            isAiThinking={isAiThinking}
          />
        </div>

        {/* Voice Control at Bottom */}
        <div className="p-4 bg-black border-t border-green-900">
          <VoiceControl onAudioData={handleAudioData} fuel={gameState.galaxy.fuel} />
        </div>
      </div>

    </div>
  );
};

export default App;