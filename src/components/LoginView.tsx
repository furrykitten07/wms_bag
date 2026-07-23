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
  EyeOff
} from "lucide-react";
import { api } from "../api.js";

interface LoginViewProps {
  onLoginSuccess: (username: string) => void;
  loading: boolean;
}

// Integrated component that attempts to load the uploaded /logo.png first,
// with a beautiful vector fallback of PT. Pelayaran Bahtera Adhiguna's logo (BAg)
const BahteraCorporateLogo = () => {
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  if (imgFailed) {
    return (
      <div className="flex flex-col items-center justify-center select-none" id="bag-high-fidelity-logo-fallback">
        <svg className="w-48 h-40 drop-shadow-md" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Flagpole: tilted slightly to the right with top loop */}
          <path d="M 102 142 L 102 44" stroke="#253580" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="102" cy="40" r="5" fill="none" stroke="#253580" strokeWidth="3" />
          
          {/* Waving Flag Body */}
          <g>
            {/* White Top Triangle */}
            <path d="M 104 46 C 130 40, 160 52, 204 44 L 154 84 Z" fill="#ffffff" />
            
            {/* Left Red Triangle */}
            <path d="M 104 46 L 154 84 L 104 114 Z" fill="#dc2626" />
            
            {/* Bottom Red Area */}
            <path d="M 104 114 L 154 84 L 204 114 C 160 118, 130 110, 104 114 Z" fill="#dc2626" />
            
            {/* Right Red Triangle */}
            <path d="M 154 84 L 204 44 C 208 64, 210 88, 204 114 Z" fill="#dc2626" />

            {/* Flag Outline Contour */}
            <path d="M 104 46 C 130 40, 160 52, 204 44 C 208 64, 210 88, 204 114 C 160 118, 130 110, 104 114 Z" stroke="#253580" strokeWidth="3.5" strokeLinejoin="round" />
            
            {/* Inside Dividing Cross Lines */}
            <path d="M 104 46 L 204 114" stroke="#253580" strokeWidth="2.5" />
            <path d="M 104 114 L 204 44" stroke="#253580" strokeWidth="2.5" />
          </g>
          
          {/* Corporate Letters "BAg" */}
          <text x="12" y="152" fontFamily="system-ui, -apple-system, sans-serif" fontSize="80" fontWeight="900" fill="#253580" letterSpacing="-4">BA</text>
          <text x="136" y="168" fontFamily="system-ui, -apple-system, sans-serif" fontSize="90" fontWeight="900" fill="#253580" letterSpacing="-1">g</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center select-none" id="bag-uploaded-logo">
      <img 
        src="/logo.png" 
        alt="PT Pelayaran Bahtera Adhiguna" 
        className="w-56 h-36 object-contain drop-shadow-sm mb-2"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
};

export default function LoginView({ onLoginSuccess, loading: appLoading }: LoginViewProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState<boolean>(false);

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
        onLoginSuccess(cleanUsername);
      } else {
        setErrorMsg("Username atau Password salah.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Username atau Password yang Anda masukkan salah.");
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = appLoading || localLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative overflow-hidden font-sans text-slate-800" id="login-container">
      
      {/* Decorative clean subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Main Beautiful Centered Login Panel */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden transform transition-all hover:shadow-2xl duration-350">
          
          {/* Header of the Card with High Fidelity Custom Logo */}
          <div className="bg-slate-50/50 border-b border-slate-100 p-8 pb-6 text-center flex flex-col items-center">
            <BahteraCorporateLogo />
            <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-widest mt-3 leading-none">
              Warehouse Management System
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 font-mono">
              PT. Pelayaran Bahtera Adhiguna - BAg
            </p>
          </div>

          {/* Form Area */}
          <form onSubmit={handleFormSubmit} className="p-8 space-y-5">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-sans block">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 pl-10 py-3 text-xs text-slate-900 focus:outline-none transition-all placeholder-slate-400 font-mono font-bold"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-sans block">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 pl-10 pr-10 py-3 text-xs text-slate-900 focus:outline-none transition-all placeholder-slate-400 font-mono font-bold"
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
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="font-bold tracking-tight leading-normal">{errorMsg}</span>
              </div>
            )}

            {/* Click to authentication trigger */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none font-sans shadow-md shadow-blue-100 mt-6"
            >
              {isLoading ? (
                <span>Memproses Verifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Auto-Fill Account Helper */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("demo-credentials-list");
                if (el) {
                  el.classList.toggle("hidden");
                }
              }}
              className="w-full flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-colors cursor-pointer"
            >
              <span>📁 PANDUAN AKUN OPERATOR (CLICK UNTUK PILIH)</span>
              <span className="text-[9px] text-slate-400">Tampilkan / Sembunyikan</span>
            </button>
            
            <div id="demo-credentials-list" className="space-y-2 pt-1 hidden">
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-3">
                Klik salah satu akun di bawah ini untuk mengisi formulir login secara otomatis:
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {[
                  { user: "superadmin", label: "Fikri Haikal (Superadmin)", role: "Super Admin" },
                  { user: "staff_gudang_1", label: "Ahmad Subarjo (Staff 1)", role: "Staff Gudang (Inbound)" },
                  { user: "staff_gudang_2", label: "Taufik Hidayat (Staff 2)", role: "Staff Gudang (Outbound)" },
                  { user: "supt_marine", label: "Capt. H. Wijaya", role: "Superintendent" },
                  { user: "crew_voyager", label: "Anto Wijaya", role: "Vessel Crew (MV Ocean Voyager)" },
                  { user: "admin", label: "System Admin Alias", role: "Admin" }
                ].map((account) => (
                  <button
                    key={account.user}
                    type="button"
                    onClick={() => {
                      setUsername(account.user);
                      setPassword("admin123");
                      setErrorMsg(null);
                    }}
                    className="w-full text-left p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all flex flex-col gap-0.5 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-slate-700 font-mono group-hover:text-blue-700">
                        {account.user}
                      </span>
                      <span className="text-[9px] bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-95">
                        {account.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      Nama: {account.label} • Pass: <code className="font-mono bg-slate-50 px-1 rounded text-slate-600">admin123</code>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Legal Footer */}
      <div className="w-full max-w-7xl mx-auto px-6 py-5 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-2.5 text-[9px] text-slate-400 font-mono font-bold shrink-0 z-10">
        <span>© 2026 PT. PELAYARAN BAHTERA ADHIGUNA (MEMBER OF PLN INDONESIA POWER). ALL RIGHTS RESERVED.</span>
      </div>

    </div>
  );
}
