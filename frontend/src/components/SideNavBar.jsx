import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SideNavBar() {
  return (
    <nav className="hidden md:flex flex-col h-screen py-6 items-center fixed left-0 top-0 w-16 border-r border-white/5 bg-black/35 backdrop-blur-2xl z-50">
      <div className="mb-8">
        <div className="w-8 h-8 rounded-lg bg-slate-950/40 flex items-center justify-center overflow-hidden border border-white/5 shadow-sm icon-hover cursor-pointer">
          <img alt="Nexus Logo" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAszeOJQpepdnl2-0ZGtCzg7Co1z78RpobO0wvmvav6i9Jeh30mI9j10H9ow0oZhmfTO6QHSGjzYJofH2hPo_bIAvSM_fLkMStwUefUZ-HLnD0mb2qZNfpkoAISzfC_he5IxH_5VpxN7UYC8KhWUjf969_AHTxKktsV3qiTBRDr0d3VgPWLQHzkb2gPonmAwR4jc6fZuyiUghnEBT-X4-ujuPGqPiiRMPXfoGd_NO-oFe5D_zXP0997eusGZGWq-FJhP2UzzMho-Zs"/>
        </div>
      </div>
      <ul className="flex flex-col gap-4 mt-2 flex-1 w-full px-3">
        <li>
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex justify-center items-center py-3 transition-all duration-300 rounded-xl group ${isActive ? 'text-white bg-white/10 shadow-sm' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`
            }
            title="Home"
          >
            <span className="material-symbols-outlined icon-hover" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/chat/recent" 
            className={({ isActive }) => 
              `flex justify-center items-center py-3 transition-all duration-300 rounded-xl group ${isActive ? 'text-white bg-white/10 shadow-sm' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`
            }
            title="Active Chat"
          >
            <span className="material-symbols-outlined icon-hover">chat_bubble</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/library" 
            className={({ isActive }) => 
              `flex justify-center items-center py-3 transition-all duration-300 rounded-xl group ${isActive ? 'text-white bg-white/10 shadow-sm' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`
            }
            title="Library"
          >
            <span className="material-symbols-outlined icon-hover">auto_stories</span>
          </NavLink>
        </li>
      </ul>
      <div className="mt-auto flex flex-col items-center gap-6 pb-2 w-full px-3">
        <a className="flex justify-center items-center py-3 w-full text-on-surface-variant hover:text-white hover:bg-white/5 transition-all duration-300 rounded-xl cursor-pointer" title="Settings">
          <span className="material-symbols-outlined icon-hover">settings</span>
        </a>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" title="System Online"></div>
      </div>
    </nav>
  );
}
