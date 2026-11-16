/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  LogIn, 
  LogOut, 
  UserCheck, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  BarChart3, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  X, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  FileText, 
  Wrench, 
  Truck, 
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  History as HistoryIcon,
  LineChart,
  Flame,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MaintenanceLog, User, UserRole } from "../types.js";
import { api } from "../api.js";

interface LoginAndLogsViewProps {
  currentUser: User | null;
  users?: User[];
  onRefresh?: () => Promise<void>;
}

// Helper memformat tanggal & waktu presisi Asia/Jakarta (WIB / UTC+7)
export function formatJakartaDateTime(dateInput?: string | number | Date): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

// Helper interpolasi spline kurva halus untuk grafik Motion SVG
function createSmoothSplinePath(
  points: Array<{ x: number; y: number }>, 
  closeBottom = false, 
  bottomY = 200
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  if (closeBottom) {
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    d += ` L ${lastX.toFixed(1)},${bottomY} L ${firstX.toFixed(1)},${bottomY} Z`;
  }
  return d;
}

// Historical logs are loaded strictly from real database records (no dummy seed data)

export default function LoginAndLogsView({
  currentUser,
  users = [],
  onRefresh
}: LoginAndLogsViewProps) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<MaintenanceLog | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Filters
  const [modeFilter, setModeFilter] = useState<"ALL" | "LOGIN" | "LOGS">("ALL");
  const [dateRange, setDateRange] = useState<"TODAY" | "7DAYS" | "14DAYS" | "30DAYS" | "ALL">("7DAYS");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [chartMetric, setChartMetric] = useState<"BOTH" | "LOGIN" | "LOGS">("BOTH");
  const [chartStyle, setChartStyle] = useState<"BAR" | "AREA">("BAR");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [legendFocus, setLegendFocus] = useState<"ALL" | "LOGIN" | "LOGS">("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [realtimeJakarta, setRealtimeJakarta] = useState<string>("");

  // Live Realtime Clock Asia/Jakarta (WIB)
  useEffect(() => {
    const updateRealtimeClock = () => {
      const now = new Date();
      const formatted = now.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      setRealtimeJakarta(formatted);
    };

    updateRealtimeClock();
    const timer = setInterval(updateRealtimeClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAllLogs();
  }, []);

  const loadAllLogs = async () => {
    setIsLoading(true);
    try {
      // 1. Bersihkan sembarang dummy / seed log lama dari localStorage jika pernah tersimpan
      try {
        const cached = localStorage.getItem("wms_audit_logs_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((l: any) => !String(l.id || "").startsWith("seed-log"));
            localStorage.setItem("wms_audit_logs_cache", JSON.stringify(cleaned));
          }
        }
      } catch (e) {}

      // 2. Ambil real audit logs langsung dari Supabase / backend
      const rawLogs = await api.getAllAuditLogs(500);
      const realLogs = (rawLogs || []).filter(l => !String(l.id || "").startsWith("seed-log"));

      // Filter guard: cegah log dengan timestamp masa depan (> waktu saat ini + 30 detik)
      const maxAllowedTime = Date.now() + 30000;
      const combined = realLogs
        .filter(l => new Date(l.timestamp).getTime() <= maxAllowedTime)
        .sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

      setLogs(combined);
    } catch (e) {
      console.warn("Failed to load logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse details
  const parseDetails = (raw?: string) => {
    if (!raw) return { raw: {} };
    try {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        raw: parsed
      };
    } catch (e) {
      return { message: raw, raw: {} };
    }
  };

  // Filter logs by date range, mode, user, and search query
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();

    return logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      const diffDays = (now - logTime) / (1000 * 60 * 60 * 24);

      // Date Range Filter (Berdasarkan kalender WIB / Asia/Jakarta)
      if (dateRange === "TODAY") {
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
        const logDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(log.timestamp));
        if (todayStr !== logDateStr) return false;
      } else if (dateRange === "7DAYS" && diffDays > 7) {
        return false;
      } else if (dateRange === "14DAYS" && diffDays > 14) {
        return false;
      } else if (dateRange === "30DAYS" && diffDays > 30) {
        return false;
      }

      // Mode Filter: LOGIN vs LOGS
      const isLoginEvent = (log.action || "").toUpperCase().includes("LOGIN") || 
                           (log.action || "").toUpperCase().includes("LOGOUT") ||
                           (log.module || "").toUpperCase() === "AUTH";

      if (modeFilter === "LOGIN" && !isLoginEvent) return false;
      if (modeFilter === "LOGS" && isLoginEvent) return false;

      // User Filter
      if (selectedUser !== "ALL") {
        const op = (log.operator || "").toLowerCase().trim();
        const details = parseDetails(log.details);
        const uName = (details.username || "").toLowerCase().trim();
        const q = selectedUser.toLowerCase().trim();

        // Cari user yang sesuai dari direktori users
        const matchedUserObj = users.find(u => 
          (u.name && u.name.toLowerCase().trim() === q) || 
          (u.username && u.username.toLowerCase().trim() === q)
        );

        const targetKeys = matchedUserObj 
          ? [matchedUserObj.username.toLowerCase().trim(), matchedUserObj.name.toLowerCase().trim()]
          : [q];

        const matchesUser = targetKeys.some(target => 
          op === target || op.includes(target) || target.includes(op) ||
          uName === target || uName.includes(target) || target.includes(uName)
        );

        if (!matchesUser) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const details = parseDetails(log.details);
        const detailsStr = JSON.stringify(details).toLowerCase();
        const matches = 
          (log.operator && log.operator.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.module && log.module.toLowerCase().includes(q)) ||
          detailsStr.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [logs, modeFilter, dateRange, selectedUser, searchQuery]);

  // Daily Trend Chart Data Calculation (e.g. past 7 or 14 days)
  const chartDays = dateRange === "30DAYS" ? 30 : dateRange === "14DAYS" ? 14 : 7;
  const dailyStats = useMemo(() => {
    const map = new Map<string, { dateStr: string; label: string; logins: number; logs: number; total: number }>();
    const now = new Date();

    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
      const label = d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" });
      map.set(dateKey, { dateStr: dateKey, label, logins: 0, logs: 0, total: 0 });
    }

    logs.forEach(log => {
      const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(log.timestamp));
      if (map.has(dateKey)) {
        const isLogin = (log.action || "").toUpperCase().includes("LOGIN") || 
                        (log.module || "").toUpperCase() === "AUTH";
        const entry = map.get(dateKey)!;
        if (isLogin) {
          entry.logins += 1;
        } else {
          entry.logs += 1;
        }
        entry.total += 1;
      }
    });

    return Array.from(map.values());
  }, [logs, chartDays]);

  const maxChartValue = useMemo(() => {
    return Math.max(1, ...dailyStats.map(d => {
      if (chartMetric === "LOGIN") return d.logins;
      if (chartMetric === "LOGS") return d.logs;
      return Math.max(d.logins, d.logs);
    }));
  }, [dailyStats, chartMetric]);

  // Executive summary metrics for the Motion daily trend chart
  const chartSummary = useMemo(() => {
    let totalLogins = 0;
    let totalLogs = 0;
    let peakDay = dailyStats[0] || { label: "-", total: 0, logins: 0, logs: 0, dateStr: "-" };

    dailyStats.forEach(d => {
      totalLogins += d.logins;
      totalLogs += d.logs;
      const metricVal = chartMetric === "LOGIN" ? d.logins : chartMetric === "LOGS" ? d.logs : d.total;
      const peakVal = chartMetric === "LOGIN" ? peakDay.logins : chartMetric === "LOGS" ? peakDay.logs : peakDay.total;
      if (metricVal > peakVal) {
        peakDay = d;
      }
    });

    const grandTotal = totalLogins + totalLogs;
    const avgPerDay = Math.round(grandTotal / (dailyStats.length || 1));

    return {
      totalLogins,
      totalLogs,
      grandTotal,
      avgPerDay,
      peakDay
    };
  }, [dailyStats, chartMetric]);

  // User engagement summary: Real usage tracking from verified audit logs
  const userEngagement = useMemo(() => {
    const stats = new Map<string, { 
      name: string; 
      username: string; 
      role: string; 
      totalLogins: number; 
      totalActions: number; 
      lastActive?: string;
      lastAuthAction?: "LOGIN" | "LOGOUT";
      lastAuthTime?: string;
      isOnline: boolean;
    }>();

    // 1. Inisialisasi daftar seluruh pengguna resmi
    users.forEach(u => {
      const uKey = (u.username || "").toLowerCase().trim();
      const isCurrentActive = Boolean(currentUser && (currentUser.username || "").toLowerCase().trim() === uKey);
      stats.set(uKey, {
        name: u.name,
        username: u.username,
        role: u.role,
        totalLogins: 0,
        totalActions: 0,
        lastActive: isCurrentActive ? new Date().toISOString() : undefined,
        lastAuthAction: isCurrentActive ? "LOGIN" : undefined,
        lastAuthTime: isCurrentActive ? new Date().toISOString() : undefined,
        isOnline: isCurrentActive
      });
    });

    // 2. Evaluasi log riwayat autentikasi & aktivitas nyata (diurutkan kronologis lama ke baru)
    const chronological = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    chronological.forEach(log => {
      const details = parseDetails(log.details);
      const uName = (details.username || log.operator || "").trim().toLowerCase();
      const opName = (log.operator || "").trim().toLowerCase();
      
      const matched = Array.from(stats.values()).find(s => {
        const sUser = s.username.toLowerCase().trim();
        const sName = s.name.toLowerCase().trim();

        // 1. Cocokkan username (misal: "alfin" di "alfin@wmsbag.id" atau exact)
        if (uName && (sUser === uName || uName.includes(sUser) || sUser.includes(uName))) return true;

        // 2. Cocokkan nama operator (misal: "MAGHFUR MUHAMMAD ALFIN")
        if (opName && (sName === opName || sName.includes(opName) || opName.includes(sName))) return true;

        return false;
      });

      if (matched) {
        const actionUpper = (log.action || "").toUpperCase().trim();
        const isLogin = actionUpper.includes("LOGIN") || ((log.module || "").toUpperCase() === "AUTH" && !actionUpper.includes("LOGOUT"));
        const isLogout = actionUpper.includes("LOGOUT");

        if (isLogin) {
          matched.totalLogins += 1;
          matched.lastAuthAction = "LOGIN";
          matched.lastAuthTime = log.timestamp;
        } else if (isLogout) {
          matched.lastAuthAction = "LOGOUT";
          matched.lastAuthTime = log.timestamp;
        } else {
          matched.totalActions += 1;
        }

        if (!matched.lastActive || new Date(log.timestamp) > new Date(matched.lastActive)) {
          matched.lastActive = log.timestamp;
        }
      }
    });

    // 3. Tentukan status Online / Aktif vs Offline berdasarkan aktivitas real
    Array.from(stats.values()).forEach(entry => {
      const isCurrentActive = Boolean(currentUser && (currentUser.username || "").toLowerCase().trim() === entry.username.toLowerCase().trim());
      if (isCurrentActive) {
        entry.isOnline = true;
        return;
      }

      // Jika aksi terakhir adalah LOGOUT, status PASTI Offline
      if (entry.lastAuthAction === "LOGOUT") {
        entry.isOnline = false;
        return;
      }

      // Jika belum pernah login, status Offline
      if (entry.totalLogins === 0) {
        entry.isOnline = false;
        return;
      }

      // Jika aksi terakhir adalah LOGIN, periksa batas waktu aktif sesi (maksimal 4 jam)
      if (entry.lastAuthAction === "LOGIN" && entry.lastAuthTime) {
        const loginTime = new Date(entry.lastAuthTime).getTime();
        const hoursAgo = (Date.now() - loginTime) / (1000 * 60 * 60);
        entry.isOnline = hoursAgo < 4;
      } else {
        entry.isOnline = false;
      }
    });

    return Array.from(stats.values()).sort((a, b) => {
      // Akun yang sedang aktif di sesi ini ditempatkan teratas
      const isCurrentA = currentUser && a.username.toLowerCase() === currentUser.username.toLowerCase();
      const isCurrentB = currentUser && b.username.toLowerCase() === currentUser.username.toLowerCase();
      if (isCurrentA && !isCurrentB) return -1;
      if (!isCurrentA && isCurrentB) return 1;

      // Akun online berikutnya
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return timeB - timeA;
    });
  }, [users, logs, currentUser]);

  // Overall KPI metrics
  const totalLoginsCount = useMemo(() => {
    return logs.filter(l => (l.action || "").toUpperCase().includes("LOGIN") || (l.module || "").toUpperCase() === "AUTH").length;
  }, [logs]);

  const totalActivityCount = useMemo(() => {
    return logs.filter(l => !(l.action || "").toUpperCase().includes("LOGIN") && (l.module || "").toUpperCase() !== "AUTH").length;
  }, [logs]);

  const activeUsersCount = useMemo(() => {
    const active = userEngagement.filter(u => u.isOnline);
    return active.length;
  }, [userEngagement]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [modeFilter, dateRange, selectedUser, searchQuery, itemsPerPage]);

  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("Tidak ada data log untuk diekspor.");
      return;
    }

    const headers = ["ID", "Waktu", "Operator", "Aksi", "Modul", "Rincian"];
    const rows = filteredLogs.map(l => {
      const details = parseDetails(l.details);
      const cleanDetails = JSON.stringify(details.raw).replace(/"/g, '""');
      return [
        l.id || "-",
        l.timestamp,
        `"${l.operator || "Unknown"}"`,
        `"${l.action || "-"}"`,
        `"${l.module || "-"}"`,
        `"${cleanDetails}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wms_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50 font-sans">
      
      {/* Top Fixed Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4.5 shrink-0 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase text-slate-400 font-bold mb-0.5">
              <span>Administration</span>
              <span>/</span>
              <span className="text-blue-600">Audit &amp; Activity Tracking</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase font-mono flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>Monitoring Login &amp; Log Aktivitas Pengguna</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Pantau bukti otentikasi login, frekuensi operasional, dan aktivitas seluruh pengguna untuk memvalidasi penggunaan WMS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Realtime Live Jakarta Clock Badge */}
            <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white flex items-center gap-2.5 shadow-xs font-mono">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">Realtime Jakarta (WIB)</span>
                <span className="text-xs font-black text-amber-300 leading-tight mt-0.5 tracking-wide">
                  {realtimeJakarta || "Memuat..."} WIB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title="Unduh data log ke format CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={loadAllLogs}
              disabled={isLoading}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
              title="Segarkan data log audit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Vertical Scroll */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          {/* Total Login */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Total Sesi Login</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LogIn className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black font-mono text-slate-900">{totalLoginsCount}</span>
              <span className="text-xs text-slate-500 ml-1.5">Sesi</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-bold">
              <ArrowUpRight className="w-3 h-3" />
              <span>Tercatat di Supabase Auth</span>
            </div>
          </div>

          {/* User Aktif */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Pengguna Aktif</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black font-mono text-slate-900">{activeUsersCount}</span>
              <span className="text-xs text-slate-500 ml-1.5">dari {users.length} Akun</span>
            </div>
            <div className="text-[10px] font-mono text-blue-600 font-bold">
              <span>{Math.round((activeUsersCount / Math.max(1, users.length)) * 100)}% Tingkat Keaktifan</span>
            </div>
          </div>

          {/* Total Logs Aktivitas */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Aktivitas Sistem</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black font-mono text-slate-900">{totalActivityCount}</span>
              <span className="text-xs text-slate-500 ml-1.5">Tindakan</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-700 font-bold">
              <span>TUG, Receiving, Dispatch, Sign</span>
            </div>
          </div>

          {/* Status Pemakaian */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-4.5 rounded-2xl border border-slate-800 text-white shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-300">Status WMS</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <span className="text-base font-black font-mono text-white block">AKTIF BEROPERASI</span>
              <span className="text-[10.5px] text-slate-300 mt-0.5 block">Sistem Terpakai Rutin</span>
            </div>
            <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1 font-bold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Jam Sibuk: 08:00 - 16:00 WIB</span>
            </div>
          </div>

        </div>

        {/* GRAFIK HARIAN: Modern Motion Daily Activity & Login Trend Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5 relative overflow-hidden">
          
          {/* Subtle decorative background glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-blue-100/50 via-indigo-100/30 to-emerald-100/30 rounded-full blur-3xl pointer-events-none -z-0" />
          
          {/* Header & Controls */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-xs shadow-blue-500/30">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-mono">
                      Grafik Tren Harian: Login Pengguna vs Log Aktivitas Sistem
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                      {chartDays} Hari Terakhir
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-sans">
                    Visualisasi interaktif volume kunjungan dan produktivitas modul logistik WMS
                  </p>
                </div>
              </div>
            </div>

            {/* Controls: Chart Style (Bar vs Area) + Metric Switcher */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              
              {/* Visual Style Switcher (Bar vs Smooth Curve) */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-mono font-bold border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setChartStyle("BAR")}
                  className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    chartStyle === "BAR" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Grafik Batang (Bar Chart)"
                >
                  {chartStyle === "BAR" && (
                    <motion.div
                      layoutId="activeChartStylePill"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Batang</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartStyle("AREA")}
                  className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    chartStyle === "AREA" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Grafik Kurva Halus (Smooth Spline Area)"
                >
                  {chartStyle === "AREA" && (
                    <motion.div
                      layoutId="activeChartStylePill"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <LineChart className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kurva</span>
                  </span>
                </button>
              </div>

              {/* Metric Filter Switcher */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-mono font-bold border border-slate-200/50">
                {(["BOTH", "LOGIN", "LOGS"] as const).map(metric => {
                  const isActive = chartMetric === metric;
                  const label = metric === "BOTH" ? "Keduanya" : metric === "LOGIN" ? "Login Saja" : "Logs Saja";
                  return (
                    <button
                      key={metric}
                      type="button"
                      onClick={() => setChartMetric(metric)}
                      className={`relative px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeChartMetricPill"
                          className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {metric === "LOGIN" && <span className="w-2 h-2 rounded-full bg-blue-500 shadow-2xs" />}
                        {metric === "LOGS" && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" />}
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold truncate">Total Login</div>
                <div className="text-base font-black font-mono text-blue-700 leading-tight">
                  {chartSummary.totalLogins} <span className="text-[10px] text-slate-500 font-normal">Sesi</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold truncate">Total Aktivitas</div>
                <div className="text-base font-black font-mono text-emerald-700 leading-tight">
                  {chartSummary.totalLogs} <span className="text-[10px] text-slate-500 font-normal">Aksi</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold truncate">Puncak Ramai</div>
                <div className="text-base font-black font-mono text-amber-700 leading-tight truncate">
                  {chartSummary.peakDay.label} <span className="text-[10px] text-slate-500 font-normal">({chartSummary.peakDay.total}x)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold truncate">Rata-Rata Harian</div>
                <div className="text-base font-black font-mono text-slate-800 leading-tight">
                  {chartSummary.avgPerDay} <span className="text-[10px] text-slate-500 font-normal">Event/Hari</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Chart Canvas with Motion */}
          <div className="relative z-10 pt-2">
            
            {/* BAR CHART VIEW */}
            {chartStyle === "BAR" && (
              <div className="h-60 sm:h-68 flex items-end gap-1.5 sm:gap-3 px-2 pb-6 border-b border-slate-200/90 relative">
                
                {/* Horizontal Reference Lines */}
                <div className="absolute inset-x-0 top-0 border-t border-slate-200/60 text-[10px] font-mono text-slate-400 pl-1 flex items-center justify-between">
                  <span>{maxChartValue} Max</span>
                  <span className="text-slate-300 pr-1">100%</span>
                </div>
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/60 text-[10px] font-mono text-slate-400 pl-1 flex items-center justify-between">
                  <span>{Math.round(maxChartValue / 2)}</span>
                  <span className="text-slate-300 pr-1">50%</span>
                </div>

                {dailyStats.map((d, idx) => {
                  const isHovered = hoveredIdx === idx;
                  const loginHeightPercent = Math.min(100, Math.max(6, (d.logins / maxChartValue) * 86));
                  const logsHeightPercent = Math.min(100, Math.max(6, (d.logs / maxChartValue) * 86));

                  return (
                    <div
                      key={d.dateStr}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group py-1"
                    >
                      {/* Animated Column Backdrop on Hover */}
                      {isHovered && (
                        <motion.div
                          layoutId="hoverDayBackdrop"
                          className="absolute inset-0 -mx-1 -my-1.5 bg-gradient-to-b from-blue-50/80 via-slate-50/70 to-emerald-50/50 rounded-2xl border border-blue-200/70 pointer-events-none z-0 shadow-xs"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}

                      {/* Floating Motion HUD Tooltip */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className="absolute -top-16 z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-mono px-3 py-2 rounded-xl shadow-xl border border-slate-700/80 whitespace-nowrap flex flex-col gap-1 min-w-[140px]"
                          >
                            <div className="flex items-center justify-between gap-3 text-amber-300 font-bold text-[10.5px]">
                              <span>📅 {d.dateStr}</span>
                              <span className="text-slate-300 font-normal">Total: {d.total}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="flex items-center gap-1 text-sky-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                Login: <strong>{d.logins}</strong>
                              </span>
                              <span className="flex items-center gap-1 text-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Logs: <strong>{d.logs}</strong>
                              </span>
                            </div>
                            {/* Proportional Ratio Bar */}
                            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden flex mt-0.5">
                              <div 
                                className="bg-sky-400 h-full transition-all" 
                                style={{ width: `${d.total > 0 ? (d.logins / d.total) * 100 : 50}%` }} 
                              />
                              <div 
                                className="bg-emerald-400 h-full transition-all" 
                                style={{ width: `${d.total > 0 ? (d.logs / d.total) * 100 : 50}%` }} 
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bars Container */}
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full pb-1 relative z-10">
                        
                        {/* Login Bar */}
                        {(chartMetric === "BOTH" || chartMetric === "LOGIN") && (
                          <motion.div
                            layout
                            initial={{ height: 0 }}
                            animate={{ 
                              height: `${loginHeightPercent}%`,
                              opacity: legendFocus === "LOGS" ? 0.25 : 1
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 180,
                              damping: 20,
                              delay: idx * 0.02
                            }}
                            whileHover={{ scaleY: 1.05, originY: 1 }}
                            className="w-1/2 max-w-[22px] min-w-[7px] bg-gradient-to-t from-blue-600 via-indigo-600 to-sky-400 rounded-t-lg relative shadow-xs shadow-blue-500/20 group-hover:brightness-110"
                          >
                            <div className="absolute top-0 inset-x-0 h-1 bg-sky-200/80 rounded-t-lg" />
                            {d.logins > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-blue-700 bg-blue-50/90 px-1 rounded shadow-2xs pointer-events-none">
                                {d.logins}
                              </span>
                            )}
                          </motion.div>
                        )}

                        {/* Logs Bar */}
                        {(chartMetric === "BOTH" || chartMetric === "LOGS") && (
                          <motion.div
                            layout
                            initial={{ height: 0 }}
                            animate={{ 
                              height: `${logsHeightPercent}%`,
                              opacity: legendFocus === "LOGIN" ? 0.25 : 1
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 180,
                              damping: 20,
                              delay: idx * 0.02 + 0.01
                            }}
                            whileHover={{ scaleY: 1.05, originY: 1 }}
                            className="w-1/2 max-w-[22px] min-w-[7px] bg-gradient-to-t from-emerald-600 via-teal-600 to-emerald-400 rounded-t-lg relative shadow-xs shadow-emerald-500/20 group-hover:brightness-110"
                          >
                            <div className="absolute top-0 inset-x-0 h-1 bg-emerald-200/80 rounded-t-lg" />
                            {d.logs > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50/90 px-1 rounded shadow-2xs pointer-events-none">
                                {d.logs}
                              </span>
                            )}
                          </motion.div>
                        )}

                      </div>

                      {/* X-Axis Date Label */}
                      <span className={`text-[10px] sm:text-[10.5px] font-mono transition-colors mt-2 text-center truncate w-full relative z-10 ${
                        isHovered ? "text-slate-900 font-extrabold" : "text-slate-500 font-medium"
                      }`}>
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SMOOTH SPLINE AREA VIEW */}
            {chartStyle === "AREA" && (() => {
              const width = 1000;
              const height = 250;
              const paddingX = 45;
              const paddingTop = 25;
              const paddingBottom = 40;
              const plotWidth = width - paddingX * 2;
              const plotHeight = height - paddingTop - paddingBottom;
              const stepX = dailyStats.length > 1 ? plotWidth / (dailyStats.length - 1) : 0;

              const loginPoints = dailyStats.map((d, i) => ({
                x: paddingX + i * stepX,
                y: paddingTop + plotHeight * (1 - (d.logins / maxChartValue))
              }));

              const logsPoints = dailyStats.map((d, i) => ({
                x: paddingX + i * stepX,
                y: paddingTop + plotHeight * (1 - (d.logs / maxChartValue))
              }));

              const loginLinePath = createSmoothSplinePath(loginPoints, false);
              const loginAreaPath = createSmoothSplinePath(loginPoints, true, paddingTop + plotHeight);

              const logsLinePath = createSmoothSplinePath(logsPoints, false);
              const logsAreaPath = createSmoothSplinePath(logsPoints, true, paddingTop + plotHeight);

              return (
                <div className="w-full relative h-60 sm:h-68">
                  
                  {/* Floating Tooltip in Area Mode */}
                  <AnimatePresence>
                    {hoveredIdx !== null && dailyStats[hoveredIdx] && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="absolute top-2 right-4 z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-mono px-3 py-2 rounded-xl shadow-xl border border-slate-700/80 whitespace-nowrap flex items-center gap-3"
                      >
                        <span className="text-amber-300 font-bold">📅 {dailyStats[hoveredIdx].dateStr}</span>
                        <span className="text-sky-300">🔐 Login: <strong>{dailyStats[hoveredIdx].logins}</strong></span>
                        <span className="text-emerald-300">⚡ Logs: <strong>{dailyStats[hoveredIdx].logs}</strong></span>
                        <span className="text-slate-300 border-l border-slate-700 pl-2">Total: <strong>{dailyStats[hoveredIdx].total}</strong></span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="loginAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                        <stop offset="85%" stopColor="#6366f1" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="logsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                        <stop offset="85%" stopColor="#14b8a6" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal reference grid lines */}
                    {[0, 0.5, 1].map((pct, gIdx) => {
                      const y = paddingTop + plotHeight * (1 - pct);
                      return (
                        <g key={gIdx}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={width - paddingX}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeDasharray={pct === 0 ? "none" : "4 4"}
                            strokeWidth="1"
                          />
                          <text
                            x={paddingX - 10}
                            y={y + 3}
                            textAnchor="end"
                            className="text-[10px] font-mono fill-slate-400"
                          >
                            {Math.round(maxChartValue * pct)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Active Hover Guide Line */}
                    {hoveredIdx !== null && (
                      <motion.line
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        x1={paddingX + hoveredIdx * stepX}
                        y1={paddingTop}
                        x2={paddingX + hoveredIdx * stepX}
                        y2={paddingTop + plotHeight}
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Login Area & Line */}
                    {(chartMetric === "BOTH" || chartMetric === "LOGIN") && (
                      <g opacity={legendFocus === "LOGS" ? 0.2 : 1} className="transition-opacity duration-200">
                        <motion.path
                          d={loginAreaPath}
                          fill="url(#loginAreaGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                        <motion.path
                          d={loginLinePath}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                        />
                        {loginPoints.map((pt, pIdx) => (
                          <motion.circle
                            key={pIdx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredIdx === pIdx ? 6 : 4}
                            className="fill-white stroke-blue-600 cursor-pointer"
                            strokeWidth={hoveredIdx === pIdx ? 3.5 : 2}
                            onMouseEnter={() => setHoveredIdx(pIdx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            whileHover={{ scale: 1.4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          />
                        ))}
                      </g>
                    )}

                    {/* Logs Area & Line */}
                    {(chartMetric === "BOTH" || chartMetric === "LOGS") && (
                      <g opacity={legendFocus === "LOGIN" ? 0.2 : 1} className="transition-opacity duration-200">
                        <motion.path
                          d={logsAreaPath}
                          fill="url(#logsAreaGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                        <motion.path
                          d={logsLinePath}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                        />
                        {logsPoints.map((pt, pIdx) => (
                          <motion.circle
                            key={pIdx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredIdx === pIdx ? 6 : 4}
                            className="fill-white stroke-emerald-600 cursor-pointer"
                            strokeWidth={hoveredIdx === pIdx ? 3.5 : 2}
                            onMouseEnter={() => setHoveredIdx(pIdx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            whileHover={{ scale: 1.4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          />
                        ))}
                      </g>
                    )}

                    {/* X-Axis Labels in SVG */}
                    {dailyStats.map((d, i) => (
                      <text
                        key={i}
                        x={paddingX + i * stepX}
                        y={height - 10}
                        textAnchor="middle"
                        className={`text-[10px] sm:text-[10.5px] font-mono cursor-pointer transition-all ${
                          hoveredIdx === i ? "fill-slate-900 font-extrabold" : "fill-slate-500 font-medium"
                        }`}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        {d.label}
                      </text>
                    ))}
                  </svg>
                </div>
              );
            })()}

            {/* Interactive Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-mono border-t border-slate-100">
              <button
                type="button"
                onMouseEnter={() => setLegendFocus("LOGIN")}
                onMouseLeave={() => setLegendFocus("ALL")}
                onClick={() => setChartMetric(prev => prev === "LOGIN" ? "BOTH" : "LOGIN")}
                className={`flex items-center gap-2 cursor-pointer transition-opacity px-2.5 py-1 rounded-xl hover:bg-slate-50 ${
                  legendFocus === "LOGS" ? "opacity-30" : "opacity-100"
                }`}
                title="Klik untuk memfilter Login Saja, atau arahkan mouse untuk menyorot"
              >
                <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 shadow-2xs shadow-blue-500/50" />
                <span className="text-slate-800 font-bold">
                  Sesi Login Pengguna <span className="text-blue-600">({chartSummary.totalLogins})</span>
                </span>
              </button>

              <button
                type="button"
                onMouseEnter={() => setLegendFocus("LOGS")}
                onMouseLeave={() => setLegendFocus("ALL")}
                onClick={() => setChartMetric(prev => prev === "LOGS" ? "BOTH" : "LOGS")}
                className={`flex items-center gap-2 cursor-pointer transition-opacity px-2.5 py-1 rounded-xl hover:bg-slate-50 ${
                  legendFocus === "LOGIN" ? "opacity-30" : "opacity-100"
                }`}
                title="Klik untuk memfilter Logs Saja, atau arahkan mouse untuk menyorot"
              >
                <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-2xs shadow-emerald-500/50" />
                <span className="text-slate-800 font-bold">
                  Aktivitas Sistem / Transaksi <span className="text-emerald-600">({chartSummary.totalLogs})</span>
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* TWO-COLUMN SECTION: User Engagement Leaderboard & Quick Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Siapa Saja yang Bener-Bener Pakai Akun (User Activity Leaderboard) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  Pengguna Terdaftar &amp; Keaktifan
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {userEngagement.length} User
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Daftar staf dan akun yang terdeteksi membuka aplikasi dan mengeksekusi modul logistik.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {userEngagement.map((u, idx) => {
                const isSelected = selectedUser.toLowerCase() === u.name.toLowerCase() || selectedUser.toLowerCase() === u.username.toLowerCase();
                const isOnline = u.isOnline;

                return (
                  <div
                    key={u.username || idx}
                    onClick={() => setSelectedUser(isSelected ? "ALL" : u.name)}
                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/40" 
                        : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                          isOnline ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <strong className="text-slate-900 block truncate">{u.name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">{u.role}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          isOnline ? "bg-emerald-100 text-emerald-800 border border-emerald-250" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {isOnline ? "Aktif" : "Offline"}
                        </span>
                        <div className="text-[9.5px] font-mono text-slate-400 mt-0.5">
                          {u.totalLogins}x Login • {u.totalActions}x Aksi
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Primary Filter & Table Controls */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                    Filter Laporan Login &amp; Aktivitas
                  </h4>
                </div>
                {selectedUser !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedUser("ALL")}
                    className="text-[10.5px] text-blue-600 font-bold hover:underline font-mono"
                  >
                    Reset Filter User ({selectedUser})
                  </button>
                )}
              </div>

              {/* Segmented Filter: LOGIN, LOGS, ATAU KEDUANYA */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1.5">
                  1. Mode Tampilan Log (Login / Aktivitas / Keduanya):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModeFilter("ALL")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      modeFilter === "ALL" 
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>Semua (Login &amp; Logs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeFilter("LOGIN")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      modeFilter === "LOGIN" 
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <LogIn className="w-4 h-4 text-blue-300" />
                    <span>🔐 Login Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeFilter("LOGS")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      modeFilter === "LOGS" 
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-300" />
                    <span>⚡ Logs Saja</span>
                  </button>
                </div>
              </div>

              {/* Sub-Filters: Date Range & Search Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1">
                    2. Rentang Waktu:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "TODAY", label: "Hari Ini" },
                      { id: "7DAYS", label: "7 Hari" },
                      { id: "14DAYS", label: "14 Hari" },
                      { id: "30DAYS", label: "30 Hari" },
                      { id: "ALL", label: "Semua" }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDateRange(r.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          dateRange === r.id 
                            ? "bg-blue-600 text-white" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1">
                    3. Cari Cepat:
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, role, dokumen, IP..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Filter Info Result */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Hasil Penyaringan:</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {filteredLogs.length} Riwayat Ditemukan
              </span>
            </div>
          </div>

        </div>

        {/* LOG AUDIT TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                Tabel Rincian Riwayat ({filteredLogs.length} Log)
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>Tampil:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-mono cursor-pointer"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-100 text-[10px] font-mono font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5 w-52 whitespace-nowrap">Waktu (WIB / Jakarta)</th>
                  <th className="p-3.5 w-36 whitespace-nowrap">Tipe Event</th>
                  <th className="p-3.5 w-48 whitespace-nowrap">User / Operator</th>
                  <th className="p-3.5 min-w-[280px]">Rincian &amp; Keterangan Aktivitas</th>
                  <th className="p-3.5 w-20 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 font-mono text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                      Memuat data login dan audit aktivitas...
                    </td>
                  </tr>
                ) : currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-mono text-xs">
                      Tidak ada data log yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, idx) => {
                    const details = parseDetails(log.details);
                    const isLogin = (log.action || "").toUpperCase().includes("LOGIN");
                    const isLogout = (log.action || "").toUpperCase().includes("LOGOUT");
                    const isMaintenance = (log.action || "").toUpperCase().includes("MAINTENANCE");
                    const isDispatch = (log.action || "").toUpperCase().includes("DISPATCH");
                    const isReceiving = (log.action || "").toUpperCase().includes("RECEIVING");

                    const logNumber = startIndex + idx + 1;
                    const formattedDate = formatJakartaDateTime(log.timestamp);

                    return (
                      <tr 
                        key={log.id || idx}
                        onClick={() => setSelectedLogDetail(log)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5 text-center font-mono text-slate-400 font-bold">
                          {logNumber}
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{formattedDate}</span>
                            <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200/80 px-1 py-0.2 rounded">WIB</span>
                          </div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {isLogin ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase bg-blue-100 text-blue-800 border border-blue-200">
                              <LogIn className="w-3 h-3 text-blue-600" />
                              <span>🔐 LOGIN</span>
                            </span>
                          ) : isLogout ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              <LogOut className="w-3 h-3 text-slate-600" />
                              <span>🚪 LOGOUT</span>
                            </span>
                          ) : isMaintenance ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              <Wrench className="w-3 h-3 text-rose-600" />
                              <span>🔴 MAINTENANCE</span>
                            </span>
                          ) : isDispatch ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase bg-purple-100 text-purple-800 border border-purple-200">
                              <Truck className="w-3 h-3 text-purple-600" />
                              <span>🚚 DISPATCH</span>
                            </span>
                          ) : isReceiving ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              <FileText className="w-3 h-3 text-amber-600" />
                              <span>📥 RECEIVING</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Activity className="w-3 h-3 text-emerald-600" />
                              <span>{log.action}</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <strong className="text-slate-900">{log.operator || "Unknown"}</strong>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-700 text-[11px]">
                          {isLogin ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800">
                                Berhasil Masuk Sesi WMS
                              </span>
                              {details.device && (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  {details.device}
                                </span>
                              )}
                              {details.role && (
                                <span className="text-[10px] text-blue-700 font-bold font-mono">
                                  [{details.role}]
                                </span>
                              )}
                            </div>
                          ) : isLogout ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-700">
                                Berhasil Keluar Sesi WMS (Logout)
                              </span>
                              {details.role && (
                                <span className="text-[10px] text-slate-500 font-bold font-mono">
                                  [{details.role}]
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-medium text-slate-800 line-clamp-1">
                                {details.message || details.doc || details.po_num || details.dispatch_no || JSON.stringify(details.raw)}
                              </div>
                              {details.vessel && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  Kapal: {details.vessel}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedLogDetail(log)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Lihat rincian lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="text-slate-500 text-[11px]">
              {filteredLogs.length > 0 ? (
                <span>
                  Menampilkan <strong className="text-slate-900">{startIndex + 1}</strong> &ndash; <strong className="text-slate-900">{endIndex}</strong> dari <strong className="text-slate-900">{filteredLogs.length}</strong> total baris
                </span>
              ) : (
                <span>0 log ditemukan</span>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                title="Awal"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs cursor-pointer"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
                  .map((page, pIdx, arr) => {
                    const prev = arr[pIdx - 1];
                    const hasGap = prev && page - prev > 1;

                    return (
                      <React.Fragment key={page}>
                        {hasGap && <span className="text-slate-400 px-1">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            page === activePage 
                              ? "bg-blue-600 text-white shadow-xs" 
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs cursor-pointer"
                title="Berikutnya"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                title="Akhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: DETAIL EVENT AUDIT */}
      {selectedLogDetail && (() => {
        const details = parseDetails(selectedLogDetail.details);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-800 overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                      Detail Log Event WMS
                    </h3>
                    <p className="text-[10.5px] font-mono text-slate-400">
                      ID: {selectedLogDetail.id || "N/A"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-sans">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Waktu Kejadian:</span>
                    <strong className="text-slate-800">
                      {formatJakartaDateTime(selectedLogDetail.timestamp)} WIB
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">User Eksekutor:</span>
                    <strong className="text-slate-900">
                      {selectedLogDetail.operator}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Aksi:</span>
                    <strong className="text-blue-600">
                      {selectedLogDetail.action}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Modul:</span>
                    <strong className="text-slate-800">
                      {selectedLogDetail.module || "SYSTEM"}
                    </strong>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Raw Details Payload (JSON):
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(details.raw, null, 2))}
                      className="text-[10px] font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? "Tersalin!" : "Salin JSON"}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[10.5px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(details.raw, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase font-mono rounded-xl cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
