import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameScene, { PhysicsState } from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import VoiceControl from './components/VoiceControl';
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

  const [fuel, setFuel] = useState(100);

  const [physicsState, setPhysicsState] = useState<PhysicsState>(DEFAULT_PHYSICS);
  const [activeAnomaly, setActiveAnomaly] = useState<PhysicsAnomaly | null>(null);

  const [missionImage, setMissionImage] = useState<string | null>(null);
  const [narrativeLog, setNarrativeLog] = useState<string>("System Safe. No Intruders.");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // AI Connection
  const gmRef = useRef<GameMasterConnection | null>(null);

  const handleAnomaly = (anomaly: PhysicsAnomaly) => {
    setActiveAnomaly(anomaly);

    // Handle SHIP_SYSTEM events (Positive)
    if (anomaly.type === 'SHIP_SYSTEM') {
      const cost = anomaly.cost || 20;
      if (fuel >= cost) {
        setFuel(prev => prev - cost);
        setNarrativeLog(`COMMAND ACCEPTED: ${anomaly.action}`);

        if (anomaly.action === 'SHIELDS_UP') {
          // Concept: Raise a "saver" post or just visual for now, or ensure ball doesn't drain?
          // For now, let's just make the physics engine safer (gravity lower?) or bounce higher
          setPhysicsState(prev => ({ ...prev, bumperBounce: 5 })); // Super bounce
          setTimeout(() => setPhysicsState(DEFAULT_PHYSICS), 10000);
        } else if (anomaly.action === 'FLIPPER_BOOST') {
          setPhysicsState(prev => ({ ...prev, flipperStrength: 2.0 }));
          setTimeout(() => setPhysicsState(DEFAULT_PHYSICS), 10000);
        } else if (anomaly.action === 'REFUEL') {
          setFuel(prev => Math.min(100, prev + 50));
        }
      } else {
        setNarrativeLog(`COMMAND FAILED: INSUFFICIENT FUEL`);
      }
      return;
    }

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
  }, [fuel]); // Re-bind if fuel needed in closure, actually handleAnomaly closes over current state? 
  // No, handleAnomaly is defined once? No, it uses setFuel setter, which is fine.
  // But usage of `fuel` in the `if(fuel >= cost)` check inside handleAnomaly:
  // Since handleAnomaly is defined in the component render scope, it captures `fuel` from that render.
  // We need to be careful. The gmRef.current.onAnomaly is assigned once. 
  // We should use a ref for fuel or update onAnomaly on render.

  // Better approach: Use a ref for fuel to access current value in callback
  const fuelRef = useRef(100);
  useEffect(() => { fuelRef.current = fuel; }, [fuel]);

  // Re-define handleAnomaly to use ref or dependency?
  // Actually, easiest is to let onAnomaly calls update state functionally if possible, 
  // but we need to check condition `fuel >= cost`.
  // Let's just update the callback in the useEffect when fuel changes? 
  // Or better: gmRef.current.onAnomaly calls a stable wrapper.

  const handleAnomalyWrapper = useCallback((anomaly: PhysicsAnomaly) => {
    // Use functional state to check fuel? No, need return value or immediate logic.
    // Use ref.
    if (anomaly.type === 'SHIP_SYSTEM') {
      const currentFuel = fuelRef.current;
      const cost = anomaly.cost || 20;

      if (currentFuel >= cost) {
        setFuel(prev => prev - cost);
        setNarrativeLog(`COMMAND ACCEPTED: ${anomaly.action}`);

        if (anomaly.action === 'SHIELDS_UP') {
          setPhysicsState(prev => ({ ...prev, bumperBounce: 5 }));
          setTimeout(() => setPhysicsState(DEFAULT_PHYSICS), 10000);
        } else if (anomaly.action === 'FLIPPER_BOOST') {
          setPhysicsState(prev => ({ ...prev, flipperStrength: 2.0 }));
          setTimeout(() => setPhysicsState(DEFAULT_PHYSICS), 10000);
        } else if (anomaly.action === 'REFUEL') {
          setFuel(prev => Math.min(100, prev + 50));
        }
      } else {
        setNarrativeLog(`COMMAND FAILED: INSUFFICIENT FUEL`);
      }
      return;
    }

    // ... existing anomaly logic ...
    setActiveAnomaly(anomaly);
    setNarrativeLog(`ALERT: ${anomaly.message}`);
    if (anomaly.type === 'GRAVITY') setPhysicsState(prev => ({ ...prev, gravity: anomaly.value }));
    else if (anomaly.type === 'BOUNCE') setPhysicsState(prev => ({ ...prev, bumperBounce: anomaly.value }));
    else if (anomaly.type === 'FLIPPER_GLITCH') setPhysicsState(prev => ({ ...prev, flipperStrength: anomaly.value }));

    if (anomaly.duration > 0) {
      setTimeout(() => {
        setPhysicsState(DEFAULT_PHYSICS);
        setActiveAnomaly(null);
        setNarrativeLog("System Stabilized.");
      }, anomaly.duration);
    }
  }, []);

  useEffect(() => {
    if (gmRef.current) {
      gmRef.current.onAnomaly = handleAnomalyWrapper;
    }
  }, [handleAnomalyWrapper]);


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
    setFuel(100); // Reset Fuel

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

  // ... rest of handlers ...

  const handleAudioData = (base64: string) => {
    if (gmRef.current) {
      gmRef.current.sendAudioChunk(base64);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-black text-white overflow-hidden font-mono">

      {/* Left: 3D Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-center relative transition-colors duration-500 ${activeAnomaly ? 'bg-red-900/20' : 'bg-black'}`}>

        {/* Anomaly Overlay */}
        {activeAnomaly && (
          <div className="absolute top-10 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <div className={`font-bold px-6 py-2 rounded text-2xl animate-pulse border-2 shadow-[0_0_20px_rgba(220,38,38,0.8)] ${activeAnomaly.type === 'SHIP_SYSTEM' ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500' : 'bg-red-600 text-black border-red-500'}`}>
              ⚠ {activeAnomaly.message} ⚠
            </div>
          </div>
        )}

        {/* ... Game Title ... */}

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
          <VoiceControl onAudioData={handleAudioData} fuel={fuel} />
        </div>
      </div>

    </div>
  );
};

export default App;