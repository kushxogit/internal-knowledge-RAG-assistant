import React from 'react';

export default function GalaxyBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#050505]">
      {/* Top Left Deep Purple Glow */}
      <div 
        className="galaxy-glow bg-[#b76dff] w-[800px] h-[800px] opacity-30" 
        style={{ top: '-20%', left: '-10%', animationDelay: '0s' }} 
      />
      
      {/* Bottom Right Electric Blue Glow */}
      <div 
        className="galaxy-glow bg-[#0566d9] w-[900px] h-[900px] opacity-20" 
        style={{ bottom: '-30%', right: '-15%', animationDelay: '-7s' }} 
      />
      
      {/* Center Soft White/Purple Core Glow */}
      <div 
        className="galaxy-glow bg-[#ddb7ff] w-[600px] h-[600px] opacity-10" 
        style={{ top: '20%', left: '30%', animationDelay: '-15s' }} 
      />
    </div>
  );
}
