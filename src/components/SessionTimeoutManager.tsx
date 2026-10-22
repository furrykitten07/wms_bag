/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock, ShieldAlert, AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { User } from "../types.js";

interface SessionTimeoutManagerProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  onLogout: (reason: string) => void;
  /** Timeout in milliseconds (default: 30 minutes = 1,800,000 ms) */
  timeoutMs?: number;
  /** Warning countdown window in milliseconds before logout (default: 2 minutes = 120,000 ms) */
  warningMs?: number;
}

const STORAGE_KEY = "wms_last_activity";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_MS = 2 * 60 * 1000;  // 2 minutes warning countdown

export default function SessionTimeoutManager({
  isAuthenticated,
  currentUser,
  onLogout,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS
}: SessionTimeoutManagerProps) {
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(Math.floor(warningMs / 1000));
  
  // Track last activity timestamp in ref and state
  const lastActivityRef = useRef<number>(Date.now());
  const lastWriteRef = useRef<number>(0);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  // Record user activity and update localStorage (throttled)
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Dismiss warning if currently showing
    setShowWarning(prev => {
      if (prev) return false;
      return false;
    });

    // Throttle writing to localStorage to once every 2 seconds
    if (now - lastWriteRef.current > 2000) {
      lastWriteRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, now.toString());
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  // Listen to cross-tab activity synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
          setShowWarning(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Attach user interaction listeners when authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setShowWarning(false);
      return;
    }

    // Initialize last activity timestamp
    const initialNow = Date.now();
    lastActivityRef.current = initialNow;
    lastWriteRef.current = initialNow;
    try {
      localStorage.setItem(STORAGE_KEY, initialNow.toString());
    } catch {
      // ignore
    }

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
      "click"
    ];

    const handleEvent = () => {
      recordActivity();
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleEvent, { passive: true });
    });

    // Check inactivity status every 1 second
    const intervalId = setInterval(() => {
      const now = Date.now();
      
      // Also check localStorage in case another tab had more recent activity
      let effectiveLastActivity = lastActivityRef.current;
      try {
        const storedStr = localStorage.getItem(STORAGE_KEY);
        if (storedStr) {
          const storedNum = parseInt(storedStr, 10);
          if (!isNaN(storedNum) && storedNum > effectiveLastActivity) {
            effectiveLastActivity = storedNum;
            lastActivityRef.current = storedNum;
          }
        }
      } catch {
        // ignore
      }

      const elapsed = now - effectiveLastActivity;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // 30 Minutes Inactivity Exceeded -> Auto Logout
        clearInterval(intervalId);
        setShowWarning(false);
        onLogoutRef.current("AFK_TIMEOUT_30M");
      } else if (remaining <= warningMs) {
        // Inactivity nearing 30 minutes -> Show Warning with countdown
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remaining / 1000)));
      } else {
        // User is active, keep warning hidden
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleEvent);
      });
      clearInterval(intervalId);
    };
  }, [isAuthenticated, currentUser, timeoutMs, warningMs, recordActivity]);

  if (!isAuthenticated || !showWarning) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const totalWarningSeconds = Math.max(1, Math.floor(warningMs / 1000));
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalWarningSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="w-full max-w-md bg-white border border-amber-300 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 id="session-warning-title" className="text-sm font-black uppercase tracking-wider font-display">
              Peringatan Keamanan Sesi (AFK)
            </h3>
            <p className="text-[11px] text-amber-100 font-mono">
              PT Pelayaran Bahtera Adhiguna (WMS)
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tidak Ada Aktivitas Selama 28 Menit</span>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed font-sans px-2">
              Akun <strong className="text-slate-900 font-bold">{currentUser?.name || currentUser?.username}</strong> terdeteksi tidak aktif. Demi menjaga keamanan data logistik &amp; sistem, akun Anda akan otomatis logout dalam:
            </p>
          </div>

          {/* Big Countdown Timer Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-inner flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Waktu Tersisa
            </span>
            <div className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-amber-300 drop-shadow-md">
              {formattedCountdown}
            </div>
            <span className="text-[10px] text-slate-400 font-sans mt-1">
              Menit : Detik
            </span>

            {/* Countdown Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Gerakkan kursor mouse, tekan tombol keyboard, atau klik tombol di bawah untuk melanjutkan sesi.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onLogoutRef.current("MANUAL_LOGOUT_FROM_WARNING")}
              className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Logout Sekarang</span>
            </button>
            <button
              type="button"
              onClick={recordActivity}
              className="w-full sm:w-auto flex-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/25 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Tetap Masuk (Lanjutkan Sesi)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
