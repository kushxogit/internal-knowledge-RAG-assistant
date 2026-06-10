import React, { useRef, useEffect } from 'react';

/**
 * ConvexLensWrapper wraps any interactive component and applies a 3D magnifying glass/convex lens effect
 * that reacts physically to the user's cursor position.
 */
export default function ConvexLensWrapper({ children, className = "", maxDistance = 400 }) {
  const containerRef = useRef(null);
  const rectRef = useRef(null);

  const updateRect = () => {
    if (containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect();
    }
  };

  useEffect(() => {
    // Cache the rect position on mount, resize, and scroll for maximum performance
    updateRect();
    
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      // Recalculate rect if not cached yet
      if (!rectRef.current) {
        updateRect();
        if (!rectRef.current) return;
      }

      const rect = rectRef.current;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Element center in viewport coordinates
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from cursor to card center
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance) {
        // Non-linear intensity curve (creates a springy, convex responsiveness)
        const intensity = Math.pow(1 - distance / maxDistance, 1.5);

        // 1. Scale/Bulge (up to 8% larger)
        const scale = 1 + intensity * 0.08;

        // 2. 3D Tilt (facing the cursor)
        // dx > 0 means cursor is right, tilt card right (positive rotateY)
        // dy > 0 means cursor is down, tilt card down (negative rotateX)
        const rotX = (-dy / maxDistance) * intensity * 14;
        const rotY = (dx / maxDistance) * intensity * 14;

        // 3. Convex Refraction / Internal displacement
        // Translate the inner content slightly TOWARDS the cursor
        const shiftX = (distance > 0) ? (dx / distance) * intensity * 10 : 0;
        const shiftY = (distance > 0) ? (dy / distance) * intensity * 10 : 0;

        // 4. Specular shiny highlight coordinates relative to the card
        const cardX = mouseX - rect.left;
        const cardY = mouseY - rect.top;

        // Inject variables into style properties
        containerRef.current.style.setProperty('--lens-scale', `${scale}`);
        containerRef.current.style.setProperty('--lens-rot-x', `${rotX}deg`);
        containerRef.current.style.setProperty('--lens-rot-y', `${rotY}deg`);
        containerRef.current.style.setProperty('--lens-shift-x', `${shiftX}px`);
        containerRef.current.style.setProperty('--lens-shift-y', `${shiftY}px`);
        containerRef.current.style.setProperty('--card-mouse-x', `${cardX}px`);
        containerRef.current.style.setProperty('--card-mouse-y', `${cardY}px`);
        containerRef.current.style.setProperty('--lens-shine-opacity', `${0.25 + intensity * 0.5}`);
        containerRef.current.style.setProperty('--lens-glow-opacity', `${intensity * 0.6}`);
      } else {
        resetStyles();
      }
    };

    const handleMouseLeave = () => {
      resetStyles();
    };

    const resetStyles = () => {
      if (!containerRef.current) return;
      containerRef.current.style.setProperty('--lens-scale', '1');
      containerRef.current.style.setProperty('--lens-rot-x', '0deg');
      containerRef.current.style.setProperty('--lens-rot-y', '0deg');
      containerRef.current.style.setProperty('--lens-shift-x', '0px');
      containerRef.current.style.setProperty('--lens-shift-y', '0px');
      containerRef.current.style.setProperty('--lens-shine-opacity', '0');
      containerRef.current.style.setProperty('--lens-glow-opacity', '0');
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Periodically update rect coordinates when hovering to stay accurate to layouts
    containerRef.current.addEventListener('mouseenter', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseenter', updateRect);
      }
    };
  }, [maxDistance]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl transition-all duration-500 ease-out border border-outline-variant hover:border-outline bg-surface ${className}`}
      style={{
        transform: `perspective(1000px) scale(var(--lens-scale, 1)) rotateX(var(--lens-rot-x, 0deg)) rotateY(var(--lens-rot-y, 0deg))`,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        boxShadow: `0 4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
      }}
    >
      {/* 
        Aesthetic 1: Specular Glass Reflection Layer
        Moves dynamically across the card surface as the spotlight passes over.
      */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-20 transition-opacity duration-300 select-none mix-blend-overlay"
        style={{
          background: `radial-gradient(circle 220px at var(--card-mouse-x, 50%) var(--card-mouse-y, 50%), 
            rgba(255, 255, 255, 0.12) 0%, 
            rgba(255, 255, 255, 0.02) 60%, 
            transparent 100%)`,
          opacity: 'var(--lens-shine-opacity, 0)'
        }}
      />

      {/* 
        Aesthetic 2: Dynamic Eclipse Corona Glow
        Simulates the stark white-beige eclipse light ring bleeding onto the element's surface.
      */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-10 transition-opacity duration-300 select-none mix-blend-screen"
        style={{
          background: `radial-gradient(circle 200px at var(--card-mouse-x, 50%) var(--card-mouse-y, 50%), 
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 250, 0.25) 65%,
            rgba(229, 229, 210, 0.08) 85%,
            transparent 100%)`,
          opacity: 'var(--lens-glow-opacity, 0)'
        }}
      />

      {/* 
        Aesthetic 3: Subtle specula outline accent
        Highlights the luxury 'beige/sand' borders on proximity
      */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-30 transition-all duration-300 border border-[#e5e5dc]/10"
        style={{
          opacity: 'var(--lens-glow-opacity, 0)'
        }}
      />

      {/* 
        Foreground Content
        Displaces slightly (translateX, translateY) relative to the cursor direction,
        creating the refractive 3D convex lens magnification effect.
      */}
      <div 
        className="relative z-10 w-full h-full flex flex-col justify-center transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(var(--lens-shift-x, 0px), var(--lens-shift-y, 0px), 10px)`,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  );
}
