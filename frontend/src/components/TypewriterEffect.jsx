import React, { useState, useEffect } from 'react';

const phrases = [
  "Local Vector Search.",
  "Secure Document Indexing.",
  "Private Semantic Pipelines.",
  "Cognitive Library Retrieval.",
  "Instant Knowledge Recall."
];

export default function TypewriterEffect() {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timeout;

    if (isDeleting) {
      // Deletion speed
      timeout = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length - 1));
      }, 40); 
    } else {
      // Typing speed
      timeout = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length + 1));
      }, 90); 
    }

    if (!isDeleting && text === currentPhrase) {
      // Pause when full phrase is typed
      timeout = setTimeout(() => setIsDeleting(true), 2500); 
    } else if (isDeleting && text === '') {
      // Move to next phrase when fully deleted
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[160px] my-8">
      <div className="flex items-center justify-center flex-wrap max-w-5xl text-center px-4">
        <span className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter chrome-text">
          {text}
        </span>
        
        {/* The glowing cursor with the Sage and Purple drop shadow trail */}
        <span 
          className="inline-block w-[6px] md:w-[8px] h-12 md:h-[60px] ml-2 md:ml-4 bg-on-background animate-pulse"
          style={{
            borderRadius: "4px",
            boxShadow: `
              0 0 20px 8px rgba(168, 85, 247, 0.8), /* Purple glow */
              0 0 40px 15px rgba(132, 204, 22, 0.6) /* Sage green glow extending outwards */
            `
          }}
        ></span>
      </div>
    </div>
  );
}
