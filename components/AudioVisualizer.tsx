import React from 'react';

interface AudioVisualizerProps {
  level: number; // 0-255
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ level }) => {
  // Create stylized bars
  const bars = Array.from({ length: 20 }, (_, i) => {
    // Calculate height based on level, with some randomness and falloff from center
    const distanceFromCenter = Math.abs(i - 10);
    const falloff = 1 - (distanceFromCenter / 15);
    const baseHeight = (level / 255) * 100 * falloff;
    const height = Math.max(5, Math.min(100, baseHeight));
    
    return (
      <div
        key={i}
        className="w-2 mx-0.5 bg-cyber-blue transition-all duration-75 ease-out shadow-[0_0_10px_#00f3ff]"
        style={{ 
          height: `${height}%`,
          opacity: 0.5 + (height / 200)
        }}
      />
    );
  });

  return (
    <div className="h-24 w-full flex items-center justify-center bg-cyber-black/50 border border-cyber-gray rounded overflow-hidden p-2 relative">
       {/* Grid background */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>
      
      <div className="flex items-end h-full z-10">
        {bars}
      </div>
    </div>
  );
};

export default AudioVisualizer;