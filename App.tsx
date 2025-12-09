import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionState, LogEntry } from './types';
import { GeminiLiveService } from './services/geminiLiveService';
import AudioVisualizer from './components/AudioVisualizer';
import SystemMonitor from './components/SystemMonitor';
import TerminalLog from './components/TerminalLog';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const addLog = useCallback((log: LogEntry) => {
    setLogs(prev => [...prev, log].slice(-50)); // Keep last 50 logs
  }, []);

  // Initialize Camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        addLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          source: 'SYSTEM',
          message: 'Camera access denied or unavailable.',
          type: 'error'
        });
      }
    };
    initCamera();
  }, [addLog]);

  const handleToggleConnection = async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      if (serviceRef.current) {
        await serviceRef.current.disconnect();
      }
    } else {
      serviceRef.current = new GeminiLiveService(
        addLog,
        (state) => setConnectionState(state as ConnectionState),
        setAudioLevel
      );
      await serviceRef.current.connect(isVideoEnabled ? videoRef.current : null);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black text-white font-mono p-4 md:p-8 flex flex-col relative">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6 border-b border-cyber-gray/50 pb-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-cyber-blue flex items-center justify-center text-black font-bold text-xl shadow-[0_0_15px_#00f3ff]">
             AI
           </div>
           <div>
             <h1 className="text-xl md:text-2xl font-bold tracking-widest text-white">JARVIS <span className="text-cyber-blue text-xs align-top">V.2.5</span></h1>
             <p className="text-xs text-gray-500">GEMINI POWERED • GPU ACCELERATED UI</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className={`px-3 py-1 rounded text-xs border ${
             connectionState === ConnectionState.CONNECTED ? 'border-cyber-green text-cyber-green bg-cyber-green/10' : 
             connectionState === ConnectionState.ERROR ? 'border-cyber-red text-cyber-red' : 
             'border-gray-600 text-gray-500'
           }`}>
             {connectionState}
           </div>
           <button 
             onClick={handleToggleConnection}
             className={`px-6 py-2 rounded font-bold uppercase tracking-wider transition-all duration-300 ${
                connectionState === ConnectionState.CONNECTED 
                ? 'bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-900/40' 
                : 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue hover:bg-cyber-blue/40 shadow-[0_0_15px_rgba(0,243,255,0.3)]'
             }`}
           >
             {connectionState === ConnectionState.CONNECTED ? 'Terminate' : 'Initialize'}
           </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Visuals */}
        <div className="md:col-span-8 flex flex-col gap-6">
          
          {/* Video Feed / HUD */}
          <div className="relative aspect-video bg-black rounded border border-cyber-gray overflow-hidden group">
             <video 
               ref={videoRef} 
               autoPlay 
               muted 
               playsInline 
               className={`w-full h-full object-cover opacity-80 transition-opacity ${!isVideoEnabled ? 'hidden' : ''}`}
             />
             
             {/* HUD Overlays */}
             <div className="absolute top-4 left-4 border-l-2 border-t-2 border-cyber-blue w-8 h-8 opacity-50"></div>
             <div className="absolute top-4 right-4 border-r-2 border-t-2 border-cyber-blue w-8 h-8 opacity-50"></div>
             <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-cyber-blue w-8 h-8 opacity-50"></div>
             <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-cyber-blue w-8 h-8 opacity-50"></div>
             
             {/* Center Reticle */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-cyber-blue/20 rounded-full flex items-center justify-center">
               <div className="w-1 h-1 bg-cyber-red rounded-full"></div>
             </div>

             <div className="absolute bottom-4 left-0 right-0 px-4">
                <AudioVisualizer level={audioLevel} />
             </div>

             {/* Controls overlay */}
             <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={`w-8 h-8 rounded border flex items-center justify-center text-xs ${isVideoEnabled ? 'border-cyber-blue text-cyber-blue' : 'border-gray-600 text-gray-600'}`}
                >
                  <i className={`fas ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'}`}></i>
                </button>
             </div>
          </div>

          {/* Terminal */}
          <div className="flex-1">
            <h3 className="text-cyber-blue text-sm mb-2 flex items-center gap-2">
              <i className="fas fa-terminal"></i> EVENT_LOG
            </h3>
            <TerminalLog logs={logs} />
          </div>
        </div>

        {/* Right Column: Status */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <SystemMonitor />
          
          <div className="bg-cyber-gray/40 border border-cyber-gray p-4 rounded">
            <h3 className="text-cyber-blue mb-4 text-xs border-b border-cyber-blue/30 pb-1">AVAILABLE_TOOLS</h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-green"></span>
                <span>SYSTEM_CONTROL (Simulated)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-green"></span>
                <span>GLOBAL_SEARCH (Grounding)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-green"></span>
                <span>VISION_ANALYSIS (Live)</span>
              </li>
            </ul>
          </div>

          <div className="bg-cyber-gray/40 border border-cyber-gray p-4 rounded flex-1">
             <h3 className="text-cyber-blue mb-4 text-xs border-b border-cyber-blue/30 pb-1">INSTRUCTIONS</h3>
             <p className="text-gray-400 text-xs leading-relaxed mb-4">
               1. Click "INITIALIZE" to connect to Neural Network.<br/>
               2. Speak naturally. The system can see and hear you.<br/>
               3. Try commands like:<br/>
               <span className="text-white block mt-1 ml-2">- "Close Spotify"</span>
               <span className="text-white block ml-2">- "Search for the latest GPU prices"</span>
               <span className="text-white block ml-2">- "What am I holding?"</span>
             </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;