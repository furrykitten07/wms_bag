/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
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
  ServerOff,
  Eye,
  EyeOff,
  Database,
  ShieldCheck,
  Zap,
  Ship,
  PhoneCall,
  Mail,
  HelpCircle,
  ExternalLink,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Repeat,
  Disc,
  Sparkles,
  RotateCcw,
  Sliders
} from "lucide-react";
import { MaintenanceConfig } from "../types.js";

// Royalty-free calm ambient stream or fallback procedural chord synthesizer
const DEFAULT_AUDIO_STREAM_URL = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3";
const DEFAULT_TRACK_TITLE = "PT. BAG Maritime Chill Lounge (Lo-Fi Ambient Loop)";

// Offline Procedural Web Audio Ambient Chords Synthesizer (infinite loop backup)
class ProceduralLoFiSynth {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private masterGain: GainNode | null = null;
  private timer: any = null;

  start(volume = 0.5) {
    if (this.isRunning || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(volume * 0.18, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isRunning = true;
      this.runLoop();
    } catch (e) {
      console.warn("Synth start error:", e);
    }
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx && this.isRunning) {
      try {
        this.masterGain.gain.setTargetAtTime(vol * 0.18, this.ctx.currentTime, 0.05);
      } catch {}
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  private playHarmonics(notes: number[], length: number) {
    if (!this.ctx || !this.masterGain || !this.isRunning) return;
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      try {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(700, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.05 / (idx + 1), now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + length + 0.3);
      } catch {}
    });
  }

  private runLoop() {
    // Soothing corporate maritime ambient chords: Cmaj9 -> Am9 -> Fmaj7 -> Gsus4
    const chords = [
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00]
    ];
    let step = 0;
    const stepDuration = 5;
    const tick = () => {
      if (!this.isRunning) return;
      this.playHarmonics(chords[step % chords.length], stepDuration);
      step++;
    };
    tick();
    this.timer = setInterval(tick, stepDuration * 1000);
  }
}

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
  const [checkResult, setCheckResult] = useState<{ message: string; isSuccess?: boolean } | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Super Admin Login Modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // IT Support Contact Modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  // System Online Celebration State
  const [isOnlineRedirecting, setIsOnlineRedirecting] = useState(false);

  // --- MAINTENANCE BACKGROUND MUSIC & UPLOAD PLAYER ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true); // Loop terus menerus jika habis
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [songTitle, setSongTitle] = useState(DEFAULT_TRACK_TITLE);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const synthRef = useRef<ProceduralLoFiSynth | null>(null);

  // Initialize synth instance
  useEffect(() => {
    synthRef.current = new ProceduralLoFiSynth();
    return () => {
      synthRef.current?.stop();
    };
  }, []);

  // Restore saved custom song if previously uploaded
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("wms_maintenance_custom_song_data");
      const savedName = localStorage.getItem("wms_maintenance_custom_song_name");
      if (savedData && savedName) {
        setAudioSource(savedData);
        setSongTitle(savedName);
        setIsCustomUpload(true);
      }
    } catch {}
  }, []);

  // Audio Playback Orchestrator (HTML Audio vs Fallback Ambient Synth)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;

    if (isPlaying) {
      if (audioSource) {
        // User uploaded custom song
        synthRef.current?.stop();
        audio.src = audioSource;
        audio.play().catch(err => {
          console.warn("Custom audio play blocked:", err);
          setIsPlaying(false);
        });
      } else {
        // Default chill song: Play default audio stream, or fallback to offline synth
        audio.src = DEFAULT_AUDIO_STREAM_URL;
        audio.play().catch(() => {
          // Fallback to procedural synth if audio stream blocked or offline
          synthRef.current?.start(isMuted ? 0 : volume);
        });
      }
    } else {
      audio.pause();
      synthRef.current?.stop();
    }
  }, [isPlaying, audioSource]);

  // Synchronize volume across audio element and synth
  useEffect(() => {
    const audio = audioRef.current;
    const effectiveVol = isMuted ? 0 : volume;
    if (audio) {
      audio.volume = effectiveVol;
    }
    synthRef.current?.setVolume(effectiveVol);
  }, [volume, isMuted]);

  // Handle Song End -> Enforce Continuous Infinite Loop
  const handleAudioEnded = () => {
    if (isLooping && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Custom Song File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioSource && audioSource.startsWith("blob:")) {
      URL.revokeObjectURL(audioSource);
    }

    const objUrl = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
    setAudioSource(objUrl);
    setSongTitle(cleanTitle);
    setIsCustomUpload(true);
    setIsPlaying(true);
    setCurrentTime(0);

    setUploadToast(`🎵 Berhasil memuat lagu: "${cleanTitle}". Mode loop aktif (akan diulang terus menerus).`);
    setTimeout(() => setUploadToast(null), 5000);

    // Save in localStorage if under 5MB
    if (file.size < 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem("wms_maintenance_custom_song_data", reader.result as string);
          localStorage.setItem("wms_maintenance_custom_song_name", cleanTitle);
        } catch {}
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset to Default Relaxing Track
  const handleResetToDefault = () => {
    try {
      localStorage.removeItem("wms_maintenance_custom_song_data");
      localStorage.removeItem("wms_maintenance_custom_song_name");
    } catch {}
    if (audioSource && audioSource.startsWith("blob:")) {
      URL.revokeObjectURL(audioSource);
    }
    setAudioSource(null);
    setSongTitle(DEFAULT_TRACK_TITLE);
    setIsCustomUpload(false);
    setCurrentTime(0);
    setUploadToast("Kembali ke trek musik santai bawaan sistem.");
    setTimeout(() => setUploadToast(null), 3000);
  };

  // Time format helper (00:00)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Auto-refresh countdown effect (every 30 seconds)
  useEffect(() => {
    if (!autoRefreshEnabled || isOnlineRedirecting) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, isOnlineRedirecting]);

  const handleRefresh = async (isAuto = false) => {
    if (isChecking || isOnlineRedirecting) return;
    setIsChecking(true);
    setCheckResult(null);

    try {
      const latest = await onCheckStatus();
      if (!latest.is_maintenance) {
        setIsOnlineRedirecting(true);
        setCheckResult({
          message: "🎉 Sistem WMS telah online kembali! Mengalihkan ke halaman utama...",
          isSuccess: true
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        if (!isAuto) {
          setCheckResult({
            message: "Sistem masih dalam mode pemeliharaan berkala.",
            isSuccess: false
          });
          setTimeout(() => setCheckResult(null), 4000);
        }
        setCountdown(30);
      }
    } catch (err: any) {
      if (!isAuto) {
        setCheckResult({
          message: "Gagal memeriksa status: " + (err.message || "Network Error"),
          isSuccess: false
        });
      }
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
        setAdminError("Akses Ditolak: Hanya akun dengan role Super Admin (Fikri Haikal) yang dapat masuk selama masa maintenance.");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden select-none">
      
      {/* Background Animated Maritime Grid & Ambient Aura */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Ambient Lighting Spheres */}
      <div className="absolute top-10 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* SUCCESS OVERLAY REDIRECT */}
      {isOnlineRedirecting && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-5 animate-bounce shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 font-display">
            Pemeliharaan Selesai!
          </h2>
          <p className="text-sm text-slate-300 max-w-md font-sans">
            Sistem WMS PT. Pelayaran Bahtera Adhiguna telah kembali online. Mengalihkan Anda secara otomatis...
          </p>
          <div className="w-48 bg-slate-800 h-1.5 rounded-full mt-6 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* TOP HEADER WITH OFFICIAL PT. BAG LOGO & MARITIME BADGE */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Corporate Identity */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-200/20 flex items-center justify-center transition-transform hover:scale-105 duration-200">
              <img 
                src="/bag-logo.jpg" 
                alt="Logo PT. Pelayaran Bahtera Adhiguna" 
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase font-display">
                  PT. Pelayaran Bahtera Adhiguna
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-400/30">
                  WMS MARITIME
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono tracking-wider hidden sm:block">
                Warehouse &amp; Vessel Spare Parts Management System
              </span>
            </div>
          </div>

          {/* Right Status Badge & Auto-refresh status */}
          <div className="flex items-center gap-3">
            {/* Auto-refresh indicator badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[11px] font-mono">
              <RefreshCw className={`w-3 h-3 text-amber-400 ${isChecking ? "animate-spin" : ""}`} />
              <span>Auto-cek: <strong className="text-amber-300 font-bold">{countdown}s</strong></span>
            </div>

            {/* Maintenance Mode Live Beacon */}
            <div className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm shadow-amber-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Maintenance Mode</span>
            </div>
          </div>

        </div>
      </header>

      {/* MAIN HERO CONTENT */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 z-10 flex flex-col items-center justify-center text-center">
        
        {/* CENTERPIECE BRANDING & MAINTENANCE ICON */}
        <div className="relative mb-6 sm:mb-8 group">
          {/* Subtle Ambient Pulse behind logo card */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-orange-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition duration-700 pointer-events-none" />

          {/* Main Card with Logo & Floating Maintenance Tool Badges */}
          <div className="relative flex flex-col items-center">
            
            {/* Elegant PT. BAG Logo Showcase Card */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-2xl shadow-black/60 border-2 border-slate-700/40 relative">
              <img 
                src="/bag-logo.jpg" 
                alt="PT. Pelayaran Bahtera Adhiguna" 
                className="w-44 sm:w-56 h-auto object-contain"
              />
            </div>

            {/* Floating Wrench & Lock Badge */}
            <div className="absolute -bottom-3 sm:-bottom-4 flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-950 border-2 border-amber-500/50 px-4 py-1.5 rounded-full shadow-xl shadow-amber-500/20">
              <Wrench className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-amber-300 uppercase tracking-widest">
                PERAWATAN SISTEM BERKALA
              </span>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
            </div>

          </div>
        </div>

        {/* HEADLINE & EXPLANATION */}
        <div className="space-y-3 mb-8 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase font-display leading-tight">
            Sistem Sedang Ditutup Sementara
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-[15px] font-normal leading-relaxed text-balance">
            Untuk memastikan integritas basis data inventaris suku cadang armada kapal, sinkronisasi transaksi pergudangan, serta peningkatan keandalan server WMS, akses umum saat ini dinonaktifkan sementara oleh <strong>Super Admin</strong>.
          </p>
        </div>

        {/* ENTERPRISE MAINTENANCE CHECKLIST / REAL-TIME ACTIVITIES */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6 text-left">
          
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 backdrop-blur-sm hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[9px] font-mono font-bold uppercase text-blue-300">Database</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-200 leading-tight">
              Optimasi Indeks Data
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-400">Sedang Berjalan</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 backdrop-blur-sm hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-1.5">
              <Ship className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[9px] font-mono font-bold uppercase text-emerald-300">Inventaris</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-200 leading-tight">
              Integritas Suku Cadang
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-[9px] font-mono text-emerald-400 font-medium">Terverifikasi</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 backdrop-blur-sm hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[9px] font-mono font-bold uppercase text-indigo-300">Keamanan</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-200 leading-tight">
              Pembaruan Sesi &amp; Akses
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />
              <span className="text-[9px] font-mono text-indigo-400 font-medium">Selesai</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 backdrop-blur-sm hover:border-slate-700 transition">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[9px] font-mono font-bold uppercase text-amber-300">Infrastruktur</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-200 leading-tight">
              Peningkatan Kecepatan
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-400">Tahap Akhir</span>
            </div>
          </div>

        </div>

        {/* OFFICIAL SUPER ADMIN NOTICE CARD */}
        <div className="w-full bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 sm:p-6 mb-8 text-left shadow-2xl shadow-black/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300" />
          
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Pemberitahuan Resmi Super Admin:
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Update: {formattedDate}
                </span>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-slate-100 leading-relaxed font-sans font-medium whitespace-pre-line bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                "{config.message || "Peningkatan performa infrastruktur server WMS dan verifikasi integritas data."}"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/30 px-3 py-2 rounded-lg border border-slate-800/50">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] block">Estimasi Selesai:</span>
                <strong className="text-white font-bold">{config.estimated_finish || "We'll be back soon!"}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/30 px-3 py-2 rounded-lg border border-slate-800/50">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] block">Penanggung Jawab:</span>
                <strong className="text-white font-bold">{config.updated_by || "Fikri Haikal (Superadmin)"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center">
          
          {/* Refresh Check Status Button */}
          <button
            type="button"
            onClick={() => handleRefresh(false)}
            disabled={isChecking}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Memeriksa Status..." : "Periksa Status Sistem Kembali"}</span>
          </button>

          {/* Super Admin Login Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Akses Khusus Super Admin</span>
          </button>

          {/* IT Support Info Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-medium text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="Bantuan & Dukungan Teknis"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span className="sm:hidden">Kontak Dukungan IT</span>
          </button>

        </div>

        {/* Check Status Feedback Toast */}
        {checkResult && (
          <div className={`mt-4 px-4 py-2.5 rounded-xl border text-xs font-mono animate-in fade-in duration-200 flex items-center gap-2 ${
            checkResult.isSuccess 
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
              : "bg-slate-900/90 border-slate-700 text-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${checkResult.isSuccess ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
            <span>{checkResult.message}</span>
          </div>
        )}

        {/* 🎵 MAINTENANCE LOUNGE MUSIC PLAYER CARD */}
        <div className="w-full mt-8 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-blue-500/30 hover:border-blue-500/50 rounded-2xl p-5 sm:p-6 text-left shadow-2xl shadow-blue-950/40 backdrop-blur-xl relative overflow-hidden transition-all duration-300">
          
          {/* Subtle Ambient Glow Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400" />

          {/* Top Row: Track identity & Loop Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              {/* Rotating Vinyl Disc icon when playing */}
              <div className="relative">
                <div className={`w-11 h-11 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center text-amber-400 shadow-md ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }}>
                  <Disc className="w-6 h-6" />
                </div>
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                    <Music className="w-3 h-3 text-blue-400" />
                    BAG LOUNGE PLAYER &bull; MUSIK PENGIRING
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    isCustomUpload 
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  }`}>
                    {isCustomUpload ? "File Kustom" : "Lo-Fi Bawaan"}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-md mt-0.5 font-sans">
                  {songTitle}
                </h4>
              </div>
            </div>

            {/* Right Status: Infinite Loop Badge & Dancing Sound Bars */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Animated Equalizer sound bars */}
              <div className="flex items-end gap-1 h-5 px-1 bg-slate-950/60 rounded border border-slate-800 p-1">
                {[40, 75, 100, 60, 90, 50].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-gradient-to-t from-amber-400 to-blue-400 transition-all duration-300 ${
                      isPlaying ? "animate-pulse" : "opacity-25"
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(4, h * (volume || 0.5))}%` : "4px",
                      animationDelay: `${i * 120}ms`,
                      animationDuration: `${0.6 + (i % 3) * 0.2}s`
                    }}
                  />
                ))}
              </div>

              {/* Infinite Loop Badge (always active as requested) */}
              <div 
                className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer"
                title="Fitur aktif: Lagu akan diulang terus menerus secara otomatis jika habis"
              >
                <Repeat className={`w-3 h-3 text-emerald-400 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "5s" }} />
                <span>Loop: Diulang Terus</span>
              </div>
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="mt-3.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : (isPlaying ? "∞ Loop" : "--:--")}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (audioRef.current && duration > 0) {
                  audioRef.current.currentTime = val;
                }
              }}
              disabled={duration <= 0}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none disabled:opacity-40"
            />
          </div>

          {/* Controls Cluster: Play/Pause, Upload Button, Reset & Volume */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3.5">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              
              {/* Main Play/Pause Button */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                  isPlaying
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Jeda Musik</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Putar Musik</span>
                  </>
                )}
              </button>

              {/* Upload Custom Audio Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Unggah file lagu sendiri dari komputer / HP (.mp3, .wav, .m4a)"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Unggah Lagu Sendiri</span>
              </button>

              {/* Reset to Default Button if custom song loaded */}
              {isCustomUpload && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Kembali ke musik bawaan"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                title={isMuted ? "Bunyikan" : "Bisukan"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(false);
                }}
                className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
              </span>
            </div>

          </div>

          {/* Upload Success Feedback Notification */}
          {uploadToast && (
            <div className="mt-3 p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadToast}</span>
            </div>
          )}

        </div>

      </main>

      {/* Hidden Global Audio Element (Enforces loop={true} and onEnded replay) */}
      <audio
        ref={audioRef}
        loop={isLooping}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={handleAudioEnded}
        className="hidden"
      />

      {/* FLOATING MINI AUDIO CONTROLLER (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-40 bg-slate-900/95 border border-slate-700/80 hover:border-blue-500/40 shadow-2xl shadow-black/80 rounded-full px-3.5 py-2 flex items-center gap-3 backdrop-blur-md transition-all">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
            isPlaying
              ? "bg-amber-500 text-slate-950 shadow-amber-500/30"
              : "bg-blue-600 text-white shadow-blue-600/30"
          }`}
          title={isPlaying ? "Jeda Musik" : "Putar Musik"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex flex-col max-w-[130px] sm:max-w-[180px]">
          <span className="text-[10.5px] font-bold text-white truncate font-sans">
            {songTitle}
          </span>
          <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
            <Repeat className="w-2.5 h-2.5" /> Loop Aktif
          </span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Unggah Lagu Sendiri"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
        </button>
      </div>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 sm:px-6 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
          
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Anchor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              &copy; {new Date().getFullYear()} PT. Pelayaran Bahtera Adhiguna &bull; Logistik Maritim &amp; Suku Cadang Armada
            </span>
          </div>

          <div className="flex items-center gap-4 text-center sm:text-right">
            <span>
              Status Server: <strong className="text-amber-400">Standby / Pemeliharaan</strong>
            </span>
            <button 
              type="button" 
              onClick={() => setShowHelpModal(true)}
              className="text-slate-400 hover:text-white underline underline-offset-2 transition cursor-pointer"
            >
              Hubungi Tim IT
            </button>
          </div>

        </div>
      </footer>

      {/* SUPER ADMIN LOGIN MODAL */}
      {showAdminModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdminModal(false);
              setAdminError(null);
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-100 font-sans">
            
            {/* Close button */}
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

            {/* Modal Header with PT. BAG Logo */}
            <div className="flex flex-col items-center text-center mb-5 pb-4 border-b border-slate-800">
              <div className="bg-white px-3 py-1.5 rounded-xl shadow-md border border-slate-200/20 mb-3 flex items-center justify-center">
                <img 
                  src="/bag-logo.jpg" 
                  alt="PT. BAG" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Portal Masuk Super Admin
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Otorisasi akses khusus pemeliharaan sistem WMS PT. BAG
              </p>
            </div>

            {/* Notice */}
            <div className="text-xs text-slate-300 mb-4 leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Selama mode pemeliharaan aktif, <strong>hanya akun Super Admin (Fikri Haikal)</strong> yang dapat masuk untuk mengubah konfigurasi atau mematikan maintenance.
              </span>
            </div>

            {adminError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono leading-relaxed">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                    type={showPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-98 text-white font-bold text-xs uppercase font-mono tracking-wider shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoggingIn ? "Memverifikasi Kredensial..." : "Masuk sebagai Super Admin"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* IT SUPPORT MODAL */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelpModal(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-100 font-sans">
            
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Dukungan Teknis &amp; IT
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PT. Pelayaran Bahtera Adhiguna
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Apabila Anda membutuhkan akses darurat atau informasi terkait proses maintenance armada suku cadang kapal, silakan hubungi kontak resmi berikut:
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
                <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Hotline IT &amp; Logistik:</span>
                  <span className="text-white font-bold">(021) 8060-BAG / Ext. 402</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Email Dukungan IT:</span>
                  <span className="text-white font-bold">it.support@bahteraadhiguna.co.id</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Super Admin WMS:</span>
                  <span className="text-white font-bold">Fikri Haikal (Superadmin)</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
