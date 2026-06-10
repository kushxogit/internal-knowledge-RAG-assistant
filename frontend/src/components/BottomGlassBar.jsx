import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomGlassBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: 'home', path: '/' },
    { icon: 'chat_bubble', path: '/chat/session-1' },
    { icon: 'database', path: '/library' },
    { icon: 'settings', path: '/settings' },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path.split('/')[1] ? `/${item.path.split('/')[1]}` : item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              <span className="material-symbols-outlined text-[18px] font-light">{item.icon}</span>
            </button>
          )
        })}
      </div>
    </div>
  );
}
