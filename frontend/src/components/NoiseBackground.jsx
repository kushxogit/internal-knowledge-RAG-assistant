import React, { useEffect, useState } from 'react';

export default function NoiseBackground() {
  const [noiseUrl, setNoiseUrl] = useState('');

  useEffect(() => {
    // Generate the noise texture dynamically using HTML5 Canvas
    // This is 100% reliable across all browsers unlike SVG filters
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Create sparse dark noise (like moving pixel dust/galaxy)
      if (Math.random() > 0.95) { 
        // 5% of pixels are dark dots
        data[i] = 15;     // R
        data[i + 1] = 23; // G
        data[i + 2] = 42; // B
        data[i + 3] = Math.floor(Math.random() * 155) + 40; // Random opacity 40-195
      } else {
        // The rest is fully transparent
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 0; 
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    // Convert to a base64 PNG and use it as our background image
    setNoiseUrl(`url(${canvas.toDataURL('image/png')})`);
  }, []);

  if (!noiseUrl) return <div className="fixed inset-0 z-[-1] bg-white"></div>;

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-white overflow-hidden">
      
      {/* Background layer (slow) */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: noiseUrl,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          animation: 'galaxyDrift 90s linear infinite'
        }}
      ></div>
      
      {/* Foreground layer (faster, larger pixels for parallax) */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: noiseUrl,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          animation: 'galaxyDrift 45s linear infinite reverse'
        }}
      ></div>
      
      {/* Soft gradient overlay to blend the corners */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/90 via-transparent to-white/90"></div>
    </div>
  );
}
