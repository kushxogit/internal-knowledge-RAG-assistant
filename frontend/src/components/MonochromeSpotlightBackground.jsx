import React, { useEffect, useRef } from 'react';

/**
 * MonochromeSpotlightBackground uses an HTML5 Canvas to render a high-density, animated film grain texture
 * and projects a high-contrast eclipse corona spotlight that tracks the mouse with LERP.
 * It features a particle physics system that generates a shimmery grain trail overflowing behind the cursor on movement.
 */
export default function MonochromeSpotlightBackground() {
  const canvasRef = useRef(null);
  
  // Mouse coordinates (target and LERP current values)
  const targetX = useRef(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const targetY = useRef(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  const currX = useRef(targetX.current);
  const currY = useRef(targetY.current);
  
  // Track previous frame LERP coordinates to calculate mouse speed & spawn trail particles
  const lastX = useRef(targetX.current);
  const lastY = useRef(targetY.current);
  
  // Track static grain offsets and morphing time
  const noiseOffsetX = useRef(0);
  const noiseOffsetY = useRef(0);
  const time = useRef(0);
  
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Pre-generate a 256x256 high-contrast noise texture canvas for high-performance tiling
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 256;
    noiseCanvas.height = 256;
    const noiseCtx = noiseCanvas.getContext('2d');
    const noiseImgData = noiseCtx.createImageData(256, 256);
    const noiseData = noiseImgData.data;
    
    for (let i = 0; i < noiseData.length; i += 4) {
      // 55% chance of light speckle, 45% dark speckle for extreme grain texture
      const isLight = Math.random() > 0.45;
      const val = isLight ? 255 : 0;
      
      noiseData[i] = val;
      noiseData[i + 1] = val;
      noiseData[i + 2] = val;
      // High contrast alpha speckles
      noiseData[i + 3] = isLight 
        ? Math.floor(Math.random() * 45) + 15 
        : Math.floor(Math.random() * 35) + 10;
    }
    noiseCtx.putImageData(noiseImgData, 0, 0);
    const noisePattern = ctx.createPattern(noiseCanvas, 'repeat');

    // Particle array for the trail
    let particles = [];
    const maxParticles = 600;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      targetX.current = e.clientX;
      targetY.current = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Main render loop
    const render = () => {
      // 1. Draw base deep black
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // 2. LERP coordinates for smooth cursor lag
      currX.current += (targetX.current - currX.current) * 0.04;
      currY.current += (targetY.current - currY.current) * 0.04;

      // Inject coordinates into document root for ConvexLensWrapper CSS cards to use
      document.documentElement.style.setProperty('--spot-x', `${currX.current}px`);
      document.documentElement.style.setProperty('--spot-y', `${currY.current}px`);

      // 3. Spawn trailing grain particles proportional to movement speed
      const dx = currX.current - lastX.current;
      const dy = currY.current - lastY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0.2) {
        // Higher speed means more trail speckles generated
        const spawnCount = Math.min(12, Math.floor(dist * 0.65) + 1);
        for (let i = 0; i < spawnCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          
          particles.push({
            x: currX.current + Math.cos(angle) * (Math.random() * 50), // spawn close to spotlight center
            y: currY.current + Math.sin(angle) * (Math.random() * 50),
            // Particles flow backward (opposite to direction of movement) + drift
            vx: -dx * 0.35 + (Math.random() - 0.5) * 1.5,
            vy: -dy * 0.35 + (Math.random() - 0.5) * 1.5,
            size: Math.random() * 2.2 + 0.6,
            color: Math.random() > 0.6 ? 229 : 255, // Sand-beige vs Pure white
            alpha: Math.random() * 0.85 + 0.15,
            life: Math.random() * 80 + 40,
            maxLife: 120
          });
        }
      }

      // 4. Draw Eclipse Spotlight Corona (Soft Morphing Blob Shape)
      // Layer 3 overlapping offset radial gradients that morph slowly to form a liquid blob
      time.current += 0.008;
      
      const cx = currX.current;
      const cy = currY.current;
      
      const blobLayers = [
        {
          x: cx + Math.sin(time.current) * 35,
          y: cy + Math.cos(time.current) * 25,
          r: 440
        },
        {
          x: cx + Math.sin(time.current * 0.7 + 2) * 30,
          y: cy + Math.cos(time.current * 0.8) * 35,
          r: 420
        },
        {
          x: cx + Math.cos(time.current * 1.2 - 1) * 25,
          y: cy + Math.sin(time.current * 1.4) * 30,
          r: 480 // Wide radius to leak light & noise
        }
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      blobLayers.forEach((layer) => {
        const grad = ctx.createRadialGradient(layer.x, layer.y, 10, layer.x, layer.y, layer.r);
        
        // Very soft, diffuse transitions for corona ring
        grad.addColorStop(0, 'rgba(5, 5, 5, 0)');
        grad.addColorStop(0.35, 'rgba(5, 5, 5, 0)');
        grad.addColorStop(0.55, 'rgba(255, 255, 250, 0.32)'); // Soft white corona segment
        grad.addColorStop(0.78, 'rgba(229, 229, 215, 0.15)'); // Soft beige transition halo
        grad.addColorStop(1, 'rgba(5, 5, 5, 0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      });
      
      ctx.restore();

      // 5. Draw and update trailing grain particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97; // air resistance
        p.vy *= 0.97;
        p.life -= 1;

        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * lifeRatio;
        
        ctx.fillStyle = p.color === 229 
          ? `rgba(229, 229, 220, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`;
        
        ctx.fillRect(p.x, p.y, p.size, p.size);
        
        // Specular glow trail effect for larger speckles
        if (p.size > 1.3 && Math.random() > 0.7) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.18})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.life <= 0) {
          particles.splice(idx, 1);
        }
      });

      // Keep particles array size capped for performance
      if (particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
      }

      // 6. Draw high-density noise pattern OVER EVERYTHING (including spotlight)
      // Offset ONLY changes if cursor is in motion (dist > 0.1), preventing continuous TV static
      ctx.save();
      ctx.globalCompositeOperation = 'overlay'; 
      
      if (dist > 0.05) {
        // Shift grain coordinates proportional to mouse movement speed
        noiseOffsetX.current = (noiseOffsetX.current + Math.floor(dist * 0.75)) % 256;
        noiseOffsetY.current = (noiseOffsetY.current + Math.floor(dist * 0.75)) % 256;
      }
      
      ctx.translate(noiseOffsetX.current, noiseOffsetY.current);
      ctx.fillStyle = noisePattern;
      ctx.fillRect(-noiseOffsetX.current, -noiseOffsetY.current, width, height);
      ctx.restore();
      
      // Update coordinates history
      lastX.current = currX.current;
      lastY.current = currY.current;

      // 7. Soft ambient beige underglow at the viewport edges
      const cornersGrad = ctx.createRadialGradient(width/2, height/2, width/4, width/2, height/2, width);
      cornersGrad.addColorStop(0, 'rgba(5, 5, 5, 0)');
      cornersGrad.addColorStop(1, 'rgba(229, 229, 220, 0.025)');
      ctx.fillStyle = cornersGrad;
      ctx.fillRect(0, 0, width, height);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-[-1] overflow-hidden"
    />
  );
}
