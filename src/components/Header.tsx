/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Anchor, LogOut } from "lucide-react";
import { User, UserRole } from "../types.js";

interface HeaderProps {
  currentUser: User;
  onLogout?: () => void;
}

export default function Header({ currentUser, onLogout }: HeaderProps) {
  return (
    <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 font-sans shadow-md border-b border-slate-800">
      
      {/* Brand & Vessel Identity Icon */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center font-display font-black text-xl text-white shadow-md shadow-blue-500/10">
          <Anchor className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight font-display uppercase text-white flex items-center gap-1.5">
            BAG - LOGISTICS
            <span className="bg-blue-500/20 text-blue-400 text-[8px] font-mono px-1 rounded font-bold">WMS</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Maritime Stock & Supplies Backup</span>
        </div>
      </div>

      {/* Authenticated Crew / Superintendent Member Info Bar */}
      <div className="flex items-center gap-4 text-xs font-semibold">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-white font-display text-xs tracking-tight">{currentUser.name}</span>
          <span className="text-[10px] text-zinc-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === UserRole.SUPER_ADMIN ? 'bg-red-500' : currentUser.role === UserRole.SUPERINTENDENT ? 'bg-amber-400' : 'bg-green-400'}`}></span>
            {currentUser.role}
          </span>
        </div>

        {/* User initials circular avatar */}
        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold font-mono tracking-tighter uppercase ring-2 ring-blue-500/20 ring-offset-2 ring-offset-slate-900 shadow-sm shadow-black/80">
          {currentUser.name ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "OP"}
        </div>

        {/* Beautiful minimalist Logout action */}
        {onLogout && (
          <button 
            onClick={onLogout}
            title="Keluar (Logout)"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-850 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-750 hover:border-rose-900/40 transition-all rounded text-[10px] uppercase font-mono tracking-wider cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-400" />
            <span className="hidden md:inline">Keluar</span>
          </button>
        )}
      </div>

    </header>
  );
}
