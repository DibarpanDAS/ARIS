import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-64 md:h-96 overflow-y-auto font-mono text-sm bg-black/80 border border-cyber-gray p-4 rounded shadow-inner">
      {logs.length === 0 && (
        <div className="text-gray-600 italic text-center mt-20">Waiting for system init...</div>
      )}
      {logs.map((log) => (
        <div key={log.id} className="mb-2 break-words animate-in fade-in duration-300">
          <span className="text-gray-500 text-xs">[{log.timestamp}]</span>
          <span className={`ml-2 font-bold ${
            log.source === 'AI' ? 'text-cyber-blue' :
            log.source === 'SYSTEM' ? 'text-cyber-green' :
            'text-white'
          }`}>
            {log.source}:
          </span>
          <span className={`ml-2 ${
            log.type === 'error' ? 'text-cyber-red' :
            log.type === 'warning' ? 'text-yellow-400' :
            log.type === 'success' ? 'text-cyber-green' :
            'text-gray-300'
          }`}>
            {log.message}
          </span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default TerminalLog;