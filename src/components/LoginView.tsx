/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  Building2,
  Sparkles
} from "lucide-react";
import { api } from "../api.js";

interface LoginViewProps {
  onLoginSuccess: (username: string) => void;
  loading: boolean;
}

const BahteraCorporateLogo = () => {
  return (
    <div className="flex flex-col items-center justify-center select-none group" id="bag-uploaded-logo">
      <div className="relative flex items-center justify-center p-3 rounded-2xl">
        {/* Minimalist monochrome ambient glow */}
        <div className="absolute inset-0 bg-slate-200/40 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-700 ease-in-out" />
        {/* Subtle minimalist monochrome border frame */}
        <div className="absolute inset-0 rounded-2xl border border-slate-200/70 group-hover:border-slate-350 transition duration-500" />
        <img
          src="/bag-logo.jpg"
          alt="PT Pelayaran Bahtera Adhiguna (BAg)"
          className="w-56 h-36 object-contain drop-shadow-xs mb-1 relative transform transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      </div>
    </div>
  );
};

export default function LoginView({ onLoginSuccess, loading: appLoading }: LoginViewProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [isSuccessState, setIsSuccessState] = useState<boolean>(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg("Harap masukkan Username.");
      return;
    }

    if (!password) {
      setErrorMsg("Harap masukkan Password.");
      return;
    }

    setLocalLoading(true);
    try {
      const res = await api.login(cleanUsername, password);
      if (res.success) {
        setIsSuccessState(true);
        setTimeout(() => {
          onLoginSuccess(cleanUsername);
        }, 750);
      } else {
        setErrorMsg("Username atau Password salah.");
        setLocalLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Username atau Password yang Anda masukkan salah.");
      setLocalLoading(false);
    }
  };

  const isLoading = appLoading || localLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative overflow-hidden font-sans text-slate-800" id="login-container">

      {/* Dynamic Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Floating Animated Ambient Glow Spheres */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Main Centered Login Panel with Scale-in Animation */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10 animate-fade-in">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-300/40 overflow-hidden transform transition-all duration-300 relative">

          {/* Success Overlay Animation on Successful Login */}
          {isSuccessState && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-300 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-lg shadow-emerald-200/50">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider mb-1 font-display">
                Otentikasi Berhasil!
              </h3>
              <p className="text-xs text-slate-500 font-mono font-medium">
                Selamat datang kembali, <span className="font-bold text-indigo-600">{username}</span>.
              </p>
              <div className="w-48 bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full animate-pulse transition-all duration-700 w-full" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-2 uppercase font-bold tracking-widest">
                Mengalihkan ke System WMS...
              </span>
            </div>
          )}

          {/* Header of the Card */}
          <div className="bg-slate-50/70 border-b border-slate-100 p-8 pb-6 text-center flex flex-col items-center">
            <BahteraCorporateLogo />
            <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-widest mt-3 leading-none font-display">
              Warehouse Management System
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 font-mono">
              PT. Pelayaran Bahtera Adhiguna
            </p>
          </div>

          {/* Form Area */}
          <form onSubmit={handleFormSubmit} className="p-8 space-y-5">

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-sans block">
                Username
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 pl-10 py-3 text-xs text-slate-900 focus:outline-none transition-all placeholder-slate-400 font-mono font-bold"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-sans block">
                Password
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 pl-10 pr-10 py-3 text-xs text-slate-900 focus:outline-none transition-all placeholder-slate-400 font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Alerts */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="font-bold tracking-tight leading-normal">{errorMsg}</span>
              </div>
            )}

              {/* Click to authentication trigger button with animation */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none font-sans shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.99] mt-6 group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Memproses Otentikasi...</span>
                  </div>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

        </div>
      </div>

      {/* Bottom Legal Footer */}
      <div className="w-full max-w-7xl mx-auto px-6 py-5 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-2.5 text-[9px] text-slate-400 font-mono font-bold shrink-0 z-10">
        <span>© 2026 PT. PELAYARAN BAHTERA ADHIGUNA (MEMBER OF PLN INDONESIA POWER). ALL RIGHTS RESERVED.</span>
      </div>

    </div>
  );
}
