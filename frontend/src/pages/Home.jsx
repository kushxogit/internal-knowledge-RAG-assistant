import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlowingBeamBackground from '../components/GlowingBeamBackground';
import HeroHeading from '../components/HeroHeading';

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate('/chat/session-1', { state: { initialQuery: query } });
    }
  };

  return (
    <>
      <GlowingBeamBackground />
      
      {/* Minimal Cursive Branding */}
      <div className="absolute top-8 left-10 z-50 pointer-events-none">
        <span 
          style={{ fontFamily: "'La Belle Aurore', cursive" }} 
          className="text-white/40 text-2xl tracking-widest opacity-80 drop-shadow-sm"
        >
          Salt & Pepper
        </span>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen relative w-full font-sans text-white">
        
        {/* Center Hero Section */}
        <main className="flex flex-col items-center justify-center w-full max-w-3xl px-6 z-10 -mt-16">
          
          {/* Small Pill Badge */}
          <div className="flex items-center gap-3 px-3 py-1 mb-5 rounded-full bg-[#16122b] border border-[#2d2454] shadow-md text-[10px] font-light text-[#b4a9db]">
            <span className="opacity-50">—</span>
            <span className="tracking-wide">Secure Knowledge Engine</span>
            <span className="opacity-50">—</span>
          </div>

          {/* Large Heading */}
          <HeroHeading 
            texts={[
              "Analyze complex\nlegal contracts.",
              "Synthesize internal\nengineering docs.",
              "Extract insights from\nfinancial reports.",
              "Chat instantly with\nyour team wiki."
            ]} 
          />

          {/* Subtitle */}
          <p 
            className="text-[11px] md:text-xs text-white/30 font-thin tracking-tight max-w-lg text-center mb-8"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, sans-serif' }}
          >
            Vectorize, index, and recall documents from your secure private database. Experience instant semantic precision powered by Salt & Pepper.
          </p>

          {/* Sleek Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="w-full max-w-md bg-[#0b0616]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center p-1 shadow-lg transition-all duration-300 hover:border-white/20 focus-within:border-white/30 focus-within:bg-[#0b0616]"
          >
            <span className="material-symbols-outlined text-white/40 ml-3 mr-1 text-[16px]">search</span>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your mind..." 
              className="flex-1 bg-transparent border-none text-white text-[11px] placeholder:text-white/30 focus:ring-0 outline-none px-2 py-1.5 font-light"
            />
            <button 
              type="submit" 
              className="h-7 px-5 rounded-full bg-white text-black font-medium text-[10px] hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
            >
              Search
            </button>
          </form>

        </main>
      </div>
    </>
  );
}
