import React, { useRef, useEffect, useState } from 'react';
import { Mission, GameState } from '../types';
import { Activity, Radio, Cpu, Award, Zap, Terminal, AlertTriangle, ShieldAlert, Rocket, Globe, Gauge, Share2 } from 'lucide-react';

interface ControlPanelProps {
  gameState: GameState;
  missionImage: string | null;
  currentNarrative: string;
  isAiThinking: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ gameState, missionImage, currentNarrative, isAiThinking }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (currentNarrative) {
      setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${currentNarrative}`]);
    }
  }, [currentNarrative]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black border-l-2 border-green-900 p-6 w-full max-w-md shadow-2xl relative overflow-hidden font-mono">
      {/* Matrix Background */}
      <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/dummy/giphy.gif')] opacity-5 pointer-events-none"></div>

      {/* Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>

      {/* Header */}
      <div className="mb-6 border-b-2 border-green-900 pb-4 relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-green-500 tracking-tighter shadow-green-500/50 drop-shadow-md">
            SYS.CORE
          </h1>
          <div className="text-xs text-green-800 mt-1">MAINFRAME ACCESS // ROOT</div>
        </div>
        <div className={`px-2 py-1 border ${isAiThinking ? 'border-amber-500 text-amber-500 animate-pulse' : 'border-green-700 text-green-700'}`}>
          {isAiThinking ? "COMPUTING..." : "IDLE"}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="border border-green-900 bg-green-900/10 p-3">
          <div className="text-[10px] text-green-700 mb-1">DATA PACKETS (SCORE)</div>
          <div className="text-2xl text-green-400 font-bold">{gameState.score.toLocaleString()}</div>
        </div>

        <div className="border border-green-900 bg-green-900/10 p-3">
          <div className="text-[10px] text-green-700 mb-1">ACCESS LEVEL (RANK)</div>
          <div className="text-xl text-green-400 font-bold truncate">{gameState.rank}</div>
        </div>
      </div>

      {/* Warp & System Status */}
      <div className="mb-6 space-y-4 relative z-10">

        {/* Warp Drive */}
        <div className="border border-green-900 bg-green-900/5 p-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-green-400">
              <Rocket className="w-4 h-4" />
              <span className="text-xs font-bold tracking-widest">WARP DRIVE</span>
            </div>
            <span className={`text-[10px] font-bold ${gameState.galaxy.fuel >= 100 ? 'text-cyan-400 animate-pulse' : 'text-green-700'}`}>
              {gameState.galaxy.fuel >= 100 ? "READY" : "CHARGING"}
            </span>
          </div>
          <div className="w-full h-2 bg-green-900/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${gameState.galaxy.fuel >= 100 ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-green-600'}`}
              style={{ width: `${gameState.galaxy.fuel}%` }}
            />
          </div>
        </div>

        {/* Planet Info */}
        <div className="border border-green-900 bg-green-900/5 p-3">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest">SYSTEM DATA</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="text-green-600">SECTOR:</div>
            <div className="text-right text-green-300 truncate">{gameState.galaxy.currentPlanet.planetName}</div>
            <div className="text-green-600">GRAVITY:</div>
            <div className="text-right text-green-300">{gameState.galaxy.currentPlanet.physics.gravity.toFixed(1)} m/s²</div>
            <div className="text-green-600">BOUNCE:</div>
            <div className="text-right text-green-300">{gameState.galaxy.currentPlanet.physics.bumperBounce.toFixed(1)}x</div>
          </div>
        </div>

        {/* Artifact Inventory */}
        {gameState.galaxy.artifacts.length > 0 && (
          <div className="border border-green-900 bg-green-900/5 p-3">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-bold tracking-widest">ARTIFACTS</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
              {gameState.galaxy.artifacts.map((artifact) => (
                <div key={artifact.id} className="text-[10px] border-l border-green-700 pl-2">
                  <div className="text-green-300 font-bold">{artifact.name}</div>
                  <div className="text-green-600 leading-tight">{artifact.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Run & Game Control */}
        <div className="p-4 border-t border-green-900 space-y-2">
          <button
            onClick={handleShare}
            className="w-full py-2 bg-green-900/30 hover:bg-green-900/50 text-green-300 border border-green-700 rounded flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> SHARE RUN DATA
          </button>
          <button
            onClick={onStartGame}
            className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded shadow-[0_0_10px_rgba(0,255,0,0.5)]"
          >
            {gameState.status === GameStatus.IDLE ? "INITIALIZE SYSTEM" : "REBOOT SYSTEM"}
          </button>
        </div>

      </div>

      {/* System Log / Mission */}
      <div className="flex-1 flex flex-col min-h-0 border-2 border-green-900 bg-black relative p-4">
        <div className="absolute top-0 left-0 bg-green-900 text-black text-[10px] px-2 py-0.5 font-bold">
          TERMINAL_OUTPUT
        </div>

        {/* Dynamic Mission Image Background */}
        {missionImage && (
          <div className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-screen pointer-events-none grayscale" style={{ backgroundImage: `url(${missionImage})` }}></div>
        )}

        {/* Logs */}
        <div ref={logContainerRef} className="flex-1 overflow-y-auto font-mono text-xs space-y-2 mt-6 relative z-10 scrollbar-hide">
          {logs.map((log, i) => (
            <div key={i} className={`border-l-2 pl-2 ${log.includes("ALERT") ? "border-red-500 text-red-500" : "border-green-800 text-green-600"}`}>
              <span className="opacity-50 mr-2">{log.substring(0, 11)}</span>
              <span>{log.substring(11)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-4 border-t border-green-900 pt-2 flex justify-between text-[10px] text-green-800">
        <span>MEM: {Math.floor(Math.random() * 100)}TB</span>
        <span>CPU: {Math.floor(Math.random() * 100)}%</span>
        <span>UPTIME: {Math.floor(performance.now() / 1000)}s</span>
      </div>

    </div>
  );
};

export default ControlPanel;