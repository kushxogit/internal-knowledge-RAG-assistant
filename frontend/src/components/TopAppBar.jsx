import React from 'react';

export default function TopAppBar() {
  return (
    <header className="md:hidden flex justify-between items-center w-full px-margin-mobile h-16 bg-black/20 backdrop-blur-2xl border-b border-white/10 z-40 sticky top-0">
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary drop-shadow-md">NEXUS AI</h1>
      <button className="p-xs rounded-full hover:bg-white/10 transition-colors text-on-surface">
        <span className="material-symbols-outlined">menu</span>
      </button>
    </header>
  );
}
