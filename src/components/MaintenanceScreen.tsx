/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Wrench, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  Lock, 
  Anchor, 
  CheckCircle2, 
  AlertTriangle,
  User,
  KeyRound,
  X,
  Radio,
  ServerOff
} from "lucide-react";
import { MaintenanceConfig } from "../types.js";

interface MaintenanceScreenProps {
  config: MaintenanceConfig;
  onCheckStatus: () => Promise<MaintenanceConfig>;
  onSuperAdminLogin: (username: string, password?: string) => Promise<boolean>;
}

export default function MaintenanceScreen({
  config,
  onCheckStatus,
  onSuperAdminLogin
}: MaintenanceScreenProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // Super Admin Login Modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleRefresh = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const latest = await onCheckStatus();
      if (!latest.is_maintenance) {
        setCheckResult("Sistem sudah online! Memuat ulang...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setCheckResult("Sistem masih dalam mode pemeliharaan.");
        setTimeout(() => setCheckResult(null), 4000);
      }
    } catch (err: any) {
      setCheckResult("Gagal memeriksa status: " + (err.message || "Network Error"));
    } finally {
      setIsChecking(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    if (!adminUsername.trim()) {
      setAdminError("Silakan masukkan username Super Admin.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const success = await onSuperAdminLogin(adminUsername.trim(), adminPassword);
      if (!success) {
        setAdminError("Akses Ditolak: Hanya akun dengan role Super Admin yang dapat masuk selama masa maintenance.");
      }
    } catch (err: any) {
      setAdminError(err.message || "Gagal melakukan otorisasi Super Admin.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const formattedDate = config.updated_at 
    ? new Date(config.updated_at).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) + " WIB"
    : "-";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Insignia */}
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800/80 pb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-lg border border-blue-400/30">
            <Anchor className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-widest text-slate-200 uppercase font-mono">
              PT. PELAYARAN BAHTERA ADHIGUNA
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">
              Warehouse Management System (WMS Maritime)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            <span>Mode Maintenance</span>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="w-full max-w-2xl my-auto py-8 z-10 flex flex-col items-center text-center">
        
        {/* Animated Badge Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-2xl shadow-amber-500/10 flex items-center justify-center relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent" />
            <Wrench className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-rose-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-md">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Status */}
        <div className="space-y-2 mb-6">
          <span className="text-[11px] font-mono uppercase font-black tracking-widest text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block">
            Sistem Sedang Dalam Perawatan Berkala
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-display leading-tight">
            Sistem Sedang Ditutup Sementara
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto font-normal leading-relaxed pt-1">
            Untuk memastikan integritas database, stabilitas inventaris suku cadang armada, dan peningkatan performa server, akses pengguna saat ini dinonaktifkan oleh Super Admin.
          </p>
        </div>

        {/* Dynamic Admin Notification Box */}
        <div className="w-full bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 mb-6 text-left shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Pesan Resmi dari Super Admin:
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-line">
                "{config.message || "Sistem WMS PT. Pelayaran Bahtera Adhiguna sedang dalam pemeliharaan berkala untuk peningkatan database dan optimasi sistem armada."}"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Estimasi Selesai: <strong className="text-slate-100 font-bold">{config.estimated_finish || "Segera"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Diperbarui Oleh: <strong className="text-slate-100 font-bold">{config.updated_by || "Superadmin"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isChecking}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Memeriksa Status..." : "Periksa Status Sistem Kembali"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Akses Khusus Super Admin</span>
          </button>
        </div>

        {checkResult && (
          <div className="mt-4 px-4 py-2 rounded-lg bg-slate-800/90 border border-slate-700 text-xs font-mono text-amber-300 animate-in fade-in duration-200">
            {checkResult}
          </div>
        )}

      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-4xl text-center border-t border-slate-800/80 pt-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
        <div>
          Terakhir diaktifkan: <span className="text-slate-400 font-bold">{formattedDate}</span>
        </div>
        <div>
          Dukungan Teknis: <strong className="text-slate-400">Tim IT Logistik &amp; Armada PT. BAG</strong>
        </div>
      </footer>

      {/* SUPER ADMIN LOGIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-100 font-sans">
            
            <button
              type="button"
              onClick={() => {
                setShowAdminModal(false);
                setAdminError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Portal Masuk Super Admin
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Khusus verifikasi pemeliharaan sistem
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              ⚠️ Selama mode maintenance aktif, <strong>hanya akun Super Admin (Fikri Haikal)</strong> yang berhak masuk untuk mengonfigurasi atau menonaktifkan maintenance.
            </p>

            {adminError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs font-mono leading-relaxed">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Username Super Admin
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="superadmin"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-98 text-white font-bold text-xs uppercase font-mono tracking-wider shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoggingIn ? "Memverifikasi..." : "Masuk sebagai Super Admin"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
