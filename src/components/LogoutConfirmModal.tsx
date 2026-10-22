/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { User, UserRole } from "../types.js";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({
  isOpen,
  currentUser,
  onClose,
  onConfirm
}: LogoutConfirmModalProps) {
  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) {
    return null;
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return "bg-rose-100 text-rose-800 border-rose-300";
      case UserRole.SUPERINTENDENT:
        return "bg-amber-100 text-amber-800 border-amber-300";
      case UserRole.VESSEL_CREW:
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case UserRole.STAFF_GUDANG:
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const userInitials = currentUser.name 
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "US";

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
    >
      <div 
        className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
              <LogOut className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 id="logout-confirm-title" className="text-sm font-black uppercase tracking-wider font-display">
                Konfirmasi Keluar Sesi
              </h3>
              <p className="text-[11px] text-rose-100 font-mono">
                PT Pelayaran Bahtera Adhiguna (WMS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Active User Card Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center font-bold font-mono text-sm tracking-wider uppercase shrink-0 shadow-xs ring-2 ring-blue-500/20">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 truncate font-sans">
                  {currentUser.name}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                Username: <span className="font-semibold text-slate-700">@{currentUser.username}</span>
                {currentUser.warehouse_name && (
                  <span className="text-slate-400"> • {currentUser.warehouse_name}</span>
                )}
              </p>
            </div>
          </div>

          {/* Warning / Prompt text */}
          <div className="space-y-2">
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              Apakah Anda yakin ingin <strong className="text-rose-600 font-bold">keluar (logout)</strong> dari sistem Warehouse Management?
            </p>
            <div className="flex items-start gap-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Pastikan seluruh transaksi atau penginputan formulir Anda saat ini telah disimpan agar tidak ada perubahan data yang hilang.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Batal</span>
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-600/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>Ya, Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
