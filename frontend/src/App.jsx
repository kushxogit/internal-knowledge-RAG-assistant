import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// Layout Components
import BottomGlassBar from './components/BottomGlassBar';

// Pages
import Home from './pages/Home';
import Library from './pages/Library';
import ActiveSession from './pages/ActiveSession';

function AppContent() {
  return (
    <div className="flex h-screen overflow-hidden text-on-background font-sans w-full bg-transparent">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative bg-transparent">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/chat/:id" element={<ActiveSession />} />
        </Routes>
      </main>
      
      {/* Apple Liquid Glass Bottom Bar */}
      <BottomGlassBar />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
