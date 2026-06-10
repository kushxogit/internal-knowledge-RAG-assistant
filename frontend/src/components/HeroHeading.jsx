import React, { useEffect, useState } from 'react';

export default function HeroHeading({ texts = [], cycleInterval = 4500 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!texts || texts.length === 0) return;

    // Initial mount
    const initialTimer = setTimeout(() => setMounted(true), 200);

    // Cycle logic
    const cycleTimer = setInterval(() => {
      // Trigger fade out
      setMounted(false);
      
      // Wait 1 second for the fade-out transition to complete, then swap text and mount
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setMounted(true);
      }, 1000);

    }, cycleInterval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(cycleTimer);
    };
  }, [texts, cycleInterval]);

  if (!texts || texts.length === 0) return null;

  const currentText = texts[currentIndex];
  const parsedText = typeof currentText === 'string' ? currentText.replace(/\\n/g, '\n') : currentText;
  
  let globalCharIndex = 0;
  const elements = [];

  const lines = parsedText.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const words = line.split(' ');
    
    words.forEach((word, wordIndex) => {
      const wordChars = word.split('');
      const wordElements = wordChars.map((char) => {
        const charIndex = globalCharIndex++;
        const delay = charIndex * 0.045; 

        return (
          <span
            key={`char-${charIndex}`}
            className="inline-block transition-all duration-[1000ms] ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              filter: mounted ? 'blur(0px)' : 'blur(4px)',
              // Only stagger on the way in. On the way out (mounted=false), fade out all at once.
              transitionDelay: mounted ? `${delay}s` : '0s',
            }}
          >
            {char}
          </span>
        );
      });

      elements.push(
        <span key={`word-${lineIndex}-${wordIndex}`} className="inline-block whitespace-nowrap">
          {wordElements}
        </span>
      );

      if (wordIndex < words.length - 1) {
        globalCharIndex++; 
        elements.push(
          <span key={`space-${lineIndex}-${wordIndex}`} className="inline-block w-[0.25em]">
            &nbsp;
          </span>
        );
      }
    });

    if (lineIndex < lines.length - 1) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
  });

  return (
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extralight tracking-tight text-white mb-4 text-center leading-tight">
      {elements}
    </h1>
  );
}
