import React, { useEffect, useState } from 'react';
import { SystemResource } from '../types';

const SystemMonitor: React.FC = () => {
  const [resources, setResources] = useState<SystemResource[]>([
    { name: 'GPU 0 (RTX 4090)', usage: 0, temp: 45 },
    { name: 'CPU (Core i9)', usage: 0, temp: 40 },
    { name: 'VRAM', usage: 0 },
    { name: 'RAM', usage: 0 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setResources(prev => prev.map(res => ({
        ...res,
        usage: Math.min(100, Math.max(5, res.usage + (Math.random() * 20 - 10))),
        temp: res.temp ? Math.min(90, Math.max(30, res.temp + (Math.random() * 5 - 2.5))) : undefined
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-cyber-gray/40 border border-cyber-gray p-4 rounded text-xs font-mono">
      <h3 className="text-cyber-blue mb-4 border-b border-cyber-blue/30 pb-1 flex justify-between">
        <span>SYSTEM_DIAGNOSTICS</span>
        <span className="animate-pulse">● LIVE</span>
      </h3>
      <div className="space-y-4">
        {resources.map((res) => (
          <div key={res.name}>
            <div className="flex justify-between mb-1 text-gray-400">
              <span>{res.name}</span>
              <span>{Math.round(res.usage)}% {res.temp ? `[${Math.round(res.temp)}°C]` : ''}</span>
            </div>
            <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${res.usage > 90 ? 'bg-cyber-red' : 'bg-cyber-green'} shadow-[0_0_5px_currentColor] transition-all duration-500`}
                style={{ width: `${res.usage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemMonitor;