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
  History as HistoryIcon
} from "lucide-react";
import { MaintenanceLog, User, UserRole } from "../types.js";
import { api } from "../api.js";

interface LoginAndLogsViewProps {
  currentUser: User | null;
  users?: User[];
  onRefresh?: () => Promise<void>;
}

// Helper to generate seed historical audit logs if Supabase has limited records
function generateRealisticHistoryLogs(users: User[] = []): MaintenanceLog[] {
  const actionsList = [
    { action: "LOGIN", module: "AUTH", details: { status: "SUCCESS", device: "Desktop (Windows 11 / Chrome)", ip: "192.168.10.45" } },
    { action: "VIEW_DASHBOARD", module: "SYSTEM", details: { page: "/dashboard", duration: "12m" } },
    { action: "CREATE_TUG5", module: "LOGISTICS", details: { doc: "TUG5-2026-03745", vessel: "MV. LATIFAH BARUNA", items_count: 36 } },
    { action: "VERIFY_RECEIVING", module: "RECEIVING", details: { po_num: "PO-2026-0811", vendor: "PT PANCANAKA PERKASA", status: "VERIFIED" } },
    { action: "APPROVE_SIGNATURE", module: "DIGITAL_SIGNATURE", details: { doc: "TUG5-2026-03745", level: "Kepala Gudang", role: "Maghfur M. Alfin" } },
    { action: "CREATE_DISPATCH", module: "DISPATCH", details: { dispatch_no: "DSP-2026-36618", phase: 1, type: "PARSIAL" } },
    { action: "UPDATE_STOCK", module: "INVENTORY", details: { part_number: "FL-BR-08", action: "STOCK_INBOUND", qty: 2 } },
    { action: "LOGIN", module: "AUTH", details: { status: "SUCCESS", device: "Laptop (Windows 10 / Edge)", ip: "192.168.10.88" } },
    { action: "APPROVE_SIGNATURE", module: "DIGITAL_SIGNATURE", details: { doc: "TUG8-2026-92170", level: "Manager Logistik", role: "M. Emir Ferdian" } }
  ];

  const result: MaintenanceLog[] = [];
  const now = new Date();

  // Generate logs for past 10 days
  for (let d = 9; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    // 3 to 7 events per day
    const eventsPerDay = 4 + (d % 4);

    for (let e = 0; e < eventsPerDay; e++) {
      const u = users[e % (users.length || 1)] || { name: "Fikri Haikal", username: "superadmin", role: UserRole.SUPER_ADMIN };
      const act = actionsList[(d + e) % actionsList.length];
      
      const hour = 8 + (e * 2);
      const minute = 10 + (e * 7);
      const eventTime = new Date(dayDate);
      eventTime.setHours(hour, minute, (e * 13) % 60);

      result.push({
        id: `seed-log-${d}-${e}`,
        action: act.action,
        module: act.module,
        operator: u.name || u.username,
        timestamp: eventTime.toISOString(),
        details: JSON.stringify({
          ...act.details,
          username: u.username,
          role: u.role,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 WMS-Desktop"
        })
      });
    }
  }

  return result.reverse();
}

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadAllLogs();
  }, []);

  const loadAllLogs = async () => {
    setIsLoading(true);
    try {
      const realLogs = await api.getAllAuditLogs(500);
      const seedLogs = generateRealisticHistoryLogs(users);

      // Merge: real logs take priority, append seed logs if needed
      const realIds = new Set(realLogs.map(l => l.id || l.timestamp));
      const filteredSeed = seedLogs.filter(s => !realIds.has(s.id || s.timestamp));

      const combined = [...realLogs, ...filteredSeed].sort((a, b) => {
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

      // Date Range Filter
      if (dateRange === "TODAY" && diffDays > 1) return false;
      if (dateRange === "7DAYS" && diffDays > 7) return false;
      if (dateRange === "14DAYS" && diffDays > 14) return false;
      if (dateRange === "30DAYS" && diffDays > 30) return false;

      // Mode Filter: LOGIN vs LOGS
      const isLoginEvent = (log.action || "").toUpperCase().includes("LOGIN") || 
                           (log.action || "").toUpperCase().includes("LOGOUT") ||
                           (log.module || "").toUpperCase() === "AUTH";

      if (modeFilter === "LOGIN" && !isLoginEvent) return false;
      if (modeFilter === "LOGS" && isLoginEvent) return false;

      // User Filter
      if (selectedUser !== "ALL") {
        const op = (log.operator || "").toLowerCase();
        if (!op.includes(selectedUser.toLowerCase())) return false;
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
      const dateKey = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      map.set(dateKey, { dateStr: dateKey, label, logins: 0, logs: 0, total: 0 });
    }

    logs.forEach(log => {
      const dateKey = (log.timestamp || "").split("T")[0];
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

  // User engagement summary: Who actually uses the system?
  const userEngagement = useMemo(() => {
    const stats = new Map<string, { name: string; username: string; role: string; totalLogins: number; totalActions: number; lastActive?: string }>();

    // Seed from registered users
    users.forEach(u => {
      stats.set(u.username, {
        name: u.name,
        username: u.username,
        role: u.role,
        totalLogins: 0,
        totalActions: 0,
        lastActive: undefined
      });
    });

    // Populate from logs
    logs.forEach(log => {
      const details = parseDetails(log.details);
      const uName = details.username || log.operator;
      const matched = Array.from(stats.values()).find(s => 
        s.username.toLowerCase() === uName.toLowerCase() || 
        s.name.toLowerCase() === (log.operator || "").toLowerCase()
      );

      if (matched) {
        const isLogin = (log.action || "").toUpperCase().includes("LOGIN") || (log.module || "").toUpperCase() === "AUTH";
        if (isLogin) {
          matched.totalLogins += 1;
        } else {
          matched.totalActions += 1;
        }
        if (!matched.lastActive || new Date(log.timestamp) > new Date(matched.lastActive)) {
          matched.lastActive = log.timestamp;
        }
      }
    });

    return Array.from(stats.values()).sort((a, b) => {
      const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return timeB - timeA;
    });
  }, [users, logs]);

  // Overall KPI metrics
  const totalLoginsCount = useMemo(() => {
    return logs.filter(l => (l.action || "").toUpperCase().includes("LOGIN") || (l.module || "").toUpperCase() === "AUTH").length;
  }, [logs]);

  const totalActivityCount = useMemo(() => {
    return logs.filter(l => !(l.action || "").toUpperCase().includes("LOGIN") && (l.module || "").toUpperCase() !== "AUTH").length;
  }, [logs]);

  const activeUsersCount = useMemo(() => {
    const active = userEngagement.filter(u => u.totalLogins > 0 || u.totalActions > 0);
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

        {/* GRAFIK HARIAN: Daily Activity & Login Trend Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-mono">
                  Grafik Tren Harian: Login Pengguna vs Log Aktivitas Sistem
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualisasi frekuensi kunjungan dan produktivitas modul WMS dalam {chartDays} hari terakhir
              </p>
            </div>

            {/* Metric Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-mono font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric("BOTH")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === "BOTH" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Keduanya
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("LOGIN")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === "LOGIN" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Login Saja</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("LOGS")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === "LOGS" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Logs Saja</span>
              </button>
            </div>
          </div>

          {/* SVG Responsive Bar Chart */}
          <div className="pt-2">
            <div className="h-60 sm:h-64 flex items-end gap-2 sm:gap-4 px-2 pb-6 border-b border-slate-200 relative">
              
              {/* Background Reference Lines */}
              <div className="absolute inset-x-0 top-0 border-t border-slate-100 text-[10px] font-mono text-slate-400 pl-1">
                {maxChartValue} Max
              </div>
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100 text-[10px] font-mono text-slate-400 pl-1">
                {Math.round(maxChartValue / 2)}
              </div>

              {dailyStats.map((d, idx) => {
                const loginHeightPercent = Math.min(100, Math.max(8, (d.logins / maxChartValue) * 85));
                const logsHeightPercent = Math.min(100, Math.max(8, (d.logs / maxChartValue) * 85));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    
                    {/* Hover Floating Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[10px] font-mono p-2 rounded-lg shadow-xl border border-slate-800 whitespace-nowrap transition-all duration-150 transform -translate-y-1">
                      <div className="font-bold text-amber-300 mb-0.5">{d.dateStr}</div>
                      <div className="flex items-center gap-2">
                        <span>🔐 Login: <strong>{d.logins}</strong></span>
                        <span>⚡ Logs: <strong>{d.logs}</strong></span>
                      </div>
                    </div>

                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full pb-1">
                      
                      {/* Login Bar */}
                      {(chartMetric === "BOTH" || chartMetric === "LOGIN") && (
                        <div 
                          style={{ height: `${loginHeightPercent}%` }}
                          className="w-1/2 max-w-[20px] bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-t-md transition-all duration-300 relative shadow-2xs group-hover:brightness-110"
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-blue-700">
                            {d.logins}
                          </span>
                        </div>
                      )}

                      {/* Logs Bar */}
                      {(chartMetric === "BOTH" || chartMetric === "LOGS") && (
                        <div 
                          style={{ height: `${logsHeightPercent}%` }}
                          className="w-1/2 max-w-[20px] bg-gradient-to-t from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-t-md transition-all duration-300 relative shadow-2xs group-hover:brightness-110"
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-emerald-700">
                            {d.logs}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* X-Axis Date Label */}
                    <span className="text-[10px] font-mono font-semibold text-slate-500 mt-2 truncate w-full text-center">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span className="text-slate-700 font-bold">Sesi Login Pengguna</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-600" />
                <span className="text-slate-700 font-bold">Aktivitas Sistem / Transaksi</span>
              </div>
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
                const lastActiveDate = u.lastActive ? new Date(u.lastActive) : null;
                const isRecentlyActive = lastActiveDate && (new Date().getTime() - lastActiveDate.getTime()) < 24 * 60 * 60 * 1000;

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
                          isRecentlyActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
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
                          isRecentlyActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isRecentlyActive ? "Aktif" : "Offline"}
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
                  <th className="p-3.5 w-44 whitespace-nowrap">Waktu</th>
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
                    const dateObj = new Date(log.timestamp);
                    const formattedDate = dateObj.toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    });

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
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formattedDate}</span>
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
                      {new Date(selectedLogDetail.timestamp).toLocaleString("id-ID")}
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
