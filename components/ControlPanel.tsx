import React from 'react';
import { Mission, GameState } from '../types';
import { Activity, Radio, Cpu, Award } from 'lucide-react';

interface ControlPanelProps {
  gameState: GameState;
  missionImage: string | null;
  currentNarrative: string;
  isAiThinking: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ gameState, missionImage, currentNarrative, isAiThinking }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 p-6 w-full max-w-md shadow-2xl">
      {/* Header */}
      <div className="mb-8 border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 brand-font">
          HYPERSPACE<br/>CADET AI
        </h1>
        <div className="flex items-center gap-2 mt-2 text-emerald-400 text-sm font-mono">
          <div className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></div>
          {isAiThinking ? "AI NEURAL LINK ACTIVE..." : "SYSTEM ONLINE"}
        </div>
      </div>

      {/* Score & Rank */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-1">
            <Award size={14} /> Score
          </div>
          <div className="text-2xl font-mono text-white">{gameState.score.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-1">
            <Cpu size={14} /> Rank
          </div>
          <div className="text-lg font-mono text-yellow-400 truncate">{gameState.rank}</div>
        </div>
        <div className="col-span-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
             <div className="text-slate-400 text-xs uppercase">Balls Remaining</div>
             <div className="flex gap-2">
                 {[...Array(gameState.balls)].map((_, i) => (
                     <div key={i} className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                 ))}
             </div>
        </div>
      </div>

      {/* Current Mission - AI GENERATED */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-800 rounded-xl border border-blue-900/50 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 pointer-events-none"></div>
        
        {/* Dynamic Image */}
        <div className="h-48 w-full bg-black relative overflow-hidden">
           {missionImage ? (
             <img src={missionImage} alt="Mission Sector" className="w-full h-full object-cover opacity-80 transition-opacity duration-1000" />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700 font-mono text-xs">
                AWAITING SECTOR VISUALIZATION...
             </div>
           )}
           <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-900 to-transparent">
              <span className="text-xs font-mono text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-800">
                 SECTOR: {gameState.currentMission?.name || "UNCHARTED"}
              </span>
           </div>
        </div>

        {/* Narrative Log */}
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3 text-blue-400 text-sm font-bold uppercase tracking-wider">
            <Radio size={16} /> Mission Log
          </div>
          <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {gameState.currentMission?.description || "Standby for mission directives..."}
          </p>
          
          <div className="mt-6 border-t border-slate-700 pt-4">
            <div className="flex items-center gap-2 mb-2 text-purple-400 text-xs font-bold uppercase">
               <Activity size={14} /> AI Comms
            </div>
            <p className="text-slate-400 italic text-sm">"{currentNarrative}"</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center">
         <p className="text-[10px] text-slate-600 uppercase tracking-widest">
            Powered by Google Gemini 2.5 Flash & TTS
         </p>
      </div>
    </div>
  );
};

export default ControlPanel;