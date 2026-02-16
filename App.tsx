import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameScene from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import VoiceControl from './components/VoiceControl';
import { GameState, GameStatus, GameEvent, LevelConfig, GalaxyState, WarpState, Artifact, PhysicsState } from './types';
import { generateMissionContext, generateSectorImage, GameMasterConnection, PhysicsAnomaly, getApiKey, generateLevelConfig, generateArtifact } from './services/geminiService';
import { soundManager } from './services/soundManager';
import { INITIAL_BALLS } from './constants';

const DEFAULT_PHYSICS: PhysicsState = {
  gravity: -30,
  bumperBounce: 2.5,
  flipperStrength: 1.0,
};

const INITIAL_LEVEL_CONFIG: LevelConfig = {
  planetName: "Sector 0 (Training Sim)",
  visualTheme: {
    backgroundPrompt: "Standard space station interior, neutral lighting",
    primaryColor: "#00ff00",
    secondaryColor: "#004400",
    hazardColor: "#ff0000"
  },
  physics: DEFAULT_PHYSICS,
  boss: {
    name: "Training Drone",
    description: "A basic target for target practice.",
    weakness: "CENTER",
    shieldStrength: 50
  },
  musicMood: "Calm, ambient"
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
      warpState: WarpState.IDLE,
      fuel: 0,
      artifacts: []
    }
  });

  const [physicsState, setPhysicsState] = useState<PhysicsState>(DEFAULT_PHYSICS);
  const [activeAnomaly, setActiveAnomaly] = useState<PhysicsAnomaly | null>(null);

  const [missionImage, setMissionImage] = useState<string | null>(null);
  const [narrativeLog, setNarrativeLog] = useState<string>("System Safe. No Intruders.");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // AI Connection
  const gmRef = useRef<GameMasterConnection | null>(null);
  const gameStateRef = useRef(gameState); // Ref for accessing current state in callbacks

  // Sync ref
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);


  const handleAnomaly = useCallback((anomaly: PhysicsAnomaly) => {
    // Handle SHIP_SYSTEM events (Positive)
    if (anomaly.type === 'SHIP_SYSTEM') {
      const currentFuel = gameStateRef.current.galaxy.fuel;
      const cost = anomaly.cost || 20;

      if (currentFuel >= cost) {
        setGameState(prev => ({
          ...prev,
          galaxy: { ...prev.galaxy, fuel: prev.galaxy.fuel - cost }
        }));
        setNarrativeLog(`COMMAND ACCEPTED: ${anomaly.action}`);

        if (anomaly.action === 'SHIELDS_UP') {
          setPhysicsState(prev => ({ ...prev, bumperBounce: 5 })); // Super bounce
          setTimeout(() => setPhysicsState(gameStateRef.current.galaxy.currentPlanet.physics), 10000);
        } else if (anomaly.action === 'FLIPPER_BOOST') {
          setPhysicsState(prev => ({ ...prev, flipperStrength: 2.0 }));
          setTimeout(() => setPhysicsState(gameStateRef.current.galaxy.currentPlanet.physics), 10000);
        } else if (anomaly.action === 'REFUEL') {
          setGameState(prev => ({
            ...prev,
            galaxy: { ...prev.galaxy, fuel: Math.min(100, prev.galaxy.fuel + 50) }
          }));
        }
      } else {
        setNarrativeLog(`COMMAND FAILED: INSUFFICIENT FUEL`);
      }
      return;
    }

    setActiveAnomaly(anomaly);
    setNarrativeLog(`ALERT: ${anomaly.message}`);

    // Apply Physics Change (Negative/Anomalies)
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
        // Restore to current planet physics
        setPhysicsState(gameStateRef.current.galaxy.currentPlanet.physics);
        setActiveAnomaly(null);
        setNarrativeLog("System Stabilized.");
      }, anomaly.duration);
    }
  }, []);

  // Init GM on Mount
  useEffect(() => {
    gmRef.current = new GameMasterConnection();
    gmRef.current.onAnomaly = handleAnomaly;
    return () => {
      gmRef.current?.disconnect();
    };
  }, [handleAnomaly]);


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
      },
      galaxy: {
        ...prev.galaxy,
        currentLevel: 1,
        warpState: WarpState.IDLE,
        fuel: 0 // Reset Fuel
      }
    }));

    // Reset Physics to Default/Initial
    setPhysicsState(INITIAL_LEVEL_CONFIG.physics);

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


  // --- Game Event Handlers ---

  const handleScore = useCallback((points: number) => {
    setGameState(prev => {
      // Apply Artifact Multipliers
      const multipliers = prev.galaxy.artifacts
        .filter(a => a.effectType === 'SCORE_MULTIPLIER')
        .reduce((acc, a) => acc * a.value, 1);

      return { ...prev, score: prev.score + Math.round(points * multipliers) };
    });
  }, []);

  const handleGameEvent = useCallback((event: GameEvent) => {
    setGameState(prev => {
      const stats = { ...prev.stats };
      let fuelGain = 0;
      let balls = prev.balls;

      // Artifact Effects
      if (event === GameEvent.LEFT_RAMP_SHOT || event === GameEvent.RIGHT_RAMP_SHOT) {
        // Multiball Capacitor
        const hasMultiball = prev.galaxy.artifacts.some(a => a.effectType === 'MULTIBALL');
        if (hasMultiball && Math.random() < 0.05) {
          balls += 1; // Instant Multi-ball!
          // Note: In a real physics engine we'd trigger a spawn event, here we just add life/ball count or logic
          // For this R3F setup, adding a ball requires spawning a new RigidBody. 
          // The current GameScene handles 1 ball. We will just simulate "Extra Life" for now or 
          // properly implement multiball later. Let's make it an "Extra Ball" reserve.
        }
      }

      switch (event) {
        case GameEvent.LEFT_RAMP_SHOT:
          stats.leftRampHits++;
          fuelGain = 10;
          soundManager.playRamp();
          break;
        case GameEvent.RIGHT_RAMP_SHOT:
          stats.rightRampHits++;
          fuelGain = 10;
          soundManager.playRamp();
          break;
        case GameEvent.BUMPER_HIT:
          stats.bumperHits++;
          fuelGain = 2;
          soundManager.playBumper();
          break;
        case GameEvent.WORMHOLE_ENTERED:
          stats.wormholeEnters++;
          break;
        case GameEvent.DRAIN: // DRAIN is used in types.ts
          stats.drains++;
          soundManager.playDrain();
          break;
      }

      const newFuel = Math.min(100, prev.galaxy.fuel + fuelGain);
      const newWarpState = newFuel >= 100 && prev.galaxy.warpState === WarpState.IDLE
        ? WarpState.READY
        : prev.galaxy.warpState;

      // Notify GM
      gmRef.current?.sendEvent(event.replace ? event.replace('_', ' ') : event);

      return {
        ...prev,
        stats,
        balls,
        galaxy: {
          ...prev.galaxy,
          fuel: newFuel,
          warpState: newWarpState
        }
      };
    });
  }, []);

  const handleBallLost = useCallback(() => {
    setGameState(prev => {
      const newBalls = prev.balls - 1;
      return {
        ...prev,
        balls: newBalls,
        status: newBalls <= 0 ? GameStatus.GAME_OVER : GameStatus.PLAYING
      };
    });
  }, []);

  // --- Warp Logic ---

  const handleWarp = useCallback(async () => {
    const currentGalaxy = gameStateRef.current.galaxy;

    // Only warp if ready
    if (currentGalaxy.warpState === WarpState.READY) {

      // 1. Lock State
      setGameState(prev => ({
        ...prev,
        galaxy: { ...prev.galaxy, warpState: WarpState.WARPING }
      }));
      setNarrativeLog("INITIATING WARP JUMP...");
      setIsAiThinking(true);
      soundManager.playWarp();

      // 2. Generate Next Level & Artifact
      const nextLevel = await generateLevelConfig(currentGalaxy.currentLevel + 1, gameStateRef.current.stats);
      const newArtifact = await generateArtifact(gameStateRef.current.rank);

      // 3. Wait a bit for effect

      // 4. Update Game State
      setGameState(prev => {
        const updatedArtifacts = newArtifact ? [...prev.galaxy.artifacts, newArtifact] : prev.galaxy.artifacts;
        return {
          ...prev,
          galaxy: {
            ...prev.galaxy,
            currentLevel: prev.galaxy.currentLevel + 1,
            currentPlanet: nextLevel,
            warpState: WarpState.IDLE,
            fuel: 0,
            artifacts: updatedArtifacts
          }
        };
      });

      // 5. Update Physics & Visuals
      // Apply Artifact Modifiers
      let newPhysics = { ...nextLevel.physics };
      const artifacts = gameStateRef.current.galaxy.artifacts;
      const allArtifacts = newArtifact ? [...artifacts, newArtifact] : artifacts;

      allArtifacts.forEach(a => {
        if (a.effectType === 'GRAVITY') newPhysics.gravity *= a.value;
        if (a.effectType === 'BOUNCE') newPhysics.bumperBounce *= a.value;
        if (a.effectType === 'FLIPPER') newPhysics.flipperStrength *= a.value;
      });

      setPhysicsState(newPhysics);
      setNarrativeLog(`ARRIVED AT: ${nextLevel.planetName}`);
      if (newArtifact) {
        setTimeout(() => setNarrativeLog(`ARTIFACT FOUND: ${newArtifact.name}`), 2000);
      }
      setIsAiThinking(false);

      // 6. Generate new background image
      generateSectorImage(nextLevel.planetName).then(img => setMissionImage(img));

    } else {
      // Just a normal wormhole hit
      handleScore(5000);
      handleGameEvent(GameEvent.WORMHOLE_ENTERED);
      setNarrativeLog("Wormhole unstable. Insufficient fuel.");
    }
  }, [handleGameEvent, handleScore]);


  const handleAudioData = (base64: string) => {
    if (gmRef.current) {
      gmRef.current.sendAudioChunk(base64);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-black text-white overflow-hidden font-mono">

      {/* Left: 3D Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-center relative transition-colors duration-1000 
        ${activeAnomaly ? 'bg-red-900/20' : ''} 
        ${gameState.galaxy.warpState === WarpState.WARPING ? 'animate-pulse bg-indigo-900' : 'bg-black'}
      `}>

        {/* Anomaly Overlay */}
        {activeAnomaly && (
          <div className="absolute top-10 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <div className={`font-bold px-6 py-2 rounded text-2xl animate-pulse border-2 shadow-[0_0_20px_rgba(220,38,38,0.8)] ${activeAnomaly.type === 'SHIP_SYSTEM' ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500' : 'bg-red-600 text-black border-red-500'}`}>
              ⚠ {activeAnomaly.message} ⚠
            </div>
          </div>
        )}

        {/* Warp Overlay */}
        {gameState.galaxy.warpState === WarpState.WARPING && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="text-6xl font-black text-cyan-400 animate-ping">WARPING...</div>
          </div>
        )}

        <GameScene
          status={gameState.status}
          onScore={handleScore}
          onEvent={handleGameEvent}
          onBallLost={handleBallLost}
          onWarp={handleWarp}
          levelConfig={gameState.galaxy.currentPlanet}
          physics={physicsState}
          visualTheme={gameState.galaxy.currentPlanet.visualTheme}
        />

        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-green-800 font-mono pointer-events-none">
          <span>GRAVITY: {physicsState.gravity}</span>
          <span>PLANET: {gameState.galaxy.currentPlanet.planetName}</span>
          <span>WARP: {gameState.galaxy.warpState} ({gameState.galaxy.fuel}%)</span>
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
          <div className="p-4 border-t border-green-900">
            <button
              onClick={startGame}
              className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded shadow-[0_0_10px_rgba(0,255,0,0.5)]"
            >
              {gameState.status === GameStatus.IDLE ? "INITIALIZE SYSTEM" : "REBOOT SYSTEM"}
            </button>
          </div>
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