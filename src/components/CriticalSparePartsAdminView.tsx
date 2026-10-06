/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  AlertOctagon,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit3,
  RotateCcw,
  Download,
  ShieldAlert,
  Layers,
  Wrench,
  CheckCircle2,
  X,
  Save,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Check,
  Flame,
  Gauge
} from "lucide-react";
import { CriticalSparePart, User as UserType, UserRole } from "../types.js";
import {
  saveCriticalSpareParts,
  resetCriticalSparePartsToDefault
} from "../utils/criticalSpareParts.js";

interface CriticalSparePartsAdminViewProps {
  currentUser: UserType;
  criticalParts: CriticalSparePart[];
  onUpdateCriticalParts: (parts: CriticalSparePart[]) => void;
}

export default function CriticalSparePartsAdminView({
  currentUser,
  criticalParts,
  onUpdateCriticalParts,
}: CriticalSparePartsAdminViewProps) {
  // Access control: only Superadmin allowed
  const isSuperAdmin =
    currentUser?.role === UserRole.SUPER_ADMIN ||
    currentUser?.username?.toLowerCase() === "superadmin";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<CriticalSparePart | null>(null);

  // Form State
  const [formPartName, setFormPartName] = useState("");
  const [formPartNo, setFormPartNo] = useState("");
  const [formCategory, setFormCategory] = useState("Engine Component");
  const [formEquipment, setFormEquipment] = useState("Main Engine");
  const [formLevel, setFormLevel] = useState<"CRITICAL" | "HIGH" | "MEDIUM">("CRITICAL");
  const [formMinStock, setFormMinStock] = useState<number>(1);
  const [formUnit, setFormUnit] = useState("PCS");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedLevel, perPage]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    criticalParts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [criticalParts]);

  // Filtered Parts
  const filteredParts = useMemo(() => {
    return criticalParts.filter((part) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        part.part_name.toLowerCase().includes(q) ||
        part.part_no.toLowerCase().includes(q) ||
        (part.category && part.category.toLowerCase().includes(q)) ||
        (part.equipment && part.equipment.toLowerCase().includes(q)) ||
        (part.notes && part.notes.toLowerCase().includes(q));

      const matchCat =
        selectedCategory === "all" || part.category === selectedCategory;
      const matchLevel =
        selectedLevel === "all" || part.criticality_level === selectedLevel;

      return matchSearch && matchCat && matchLevel;
    });
  }, [criticalParts, searchTerm, selectedCategory, selectedLevel]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredParts.length / perPage));
  const paginatedParts = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredParts.slice(start, start + perPage);
  }, [filteredParts, currentPage, perPage]);

  // Category counts for quick KPI cards
  const categoryStats = useMemo(() => {
    const engineCount = criticalParts.filter(
      (p) =>
        p.category === "Engine Component" ||
        p.part_name.includes("CYLINDER") ||
        p.part_name.includes("ROD")
    ).length;
    const pistonCount = criticalParts.filter(
      (p) =>
        p.category === "Piston & Ring" ||
        p.part_name.includes("PISTON")
    ).length;
    const bearingCount = criticalParts.filter(
      (p) =>
        p.category === "Bearing" ||
        p.part_name.includes("BEARING")
    ).length;
    const gasketCount = criticalParts.filter(
      (p) =>
        p.category === "Gasket & Seal" ||
        p.part_name.includes("PACKING") ||
        p.part_name.includes("GASKET") ||
        p.part_name.includes("RING")
    ).length;

    return { engineCount, pistonCount, bearingCount, gasketCount };
  }, [criticalParts]);

  // Open modal for create
  const handleOpenCreateModal = () => {
    setEditingPart(null);
    setFormPartName("");
    setFormPartNo("");
    setFormCategory("Engine Component");
    setFormEquipment("Main Engine");
    setFormLevel("CRITICAL");
    setFormMinStock(1);
    setFormUnit("PCS");
    setFormNotes("");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (part: CriticalSparePart) => {
    setEditingPart(part);
    setFormPartName(part.part_name);
    setFormPartNo(part.part_no);
    setFormCategory(part.category || "Engine Component");
    setFormEquipment(part.equipment || "Main Engine");
    setFormLevel(part.criticality_level || "CRITICAL");
    setFormMinStock(part.min_stock ?? 1);
    setFormUnit(part.unit || "PCS");
    setFormNotes(part.notes || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Save / Update part
  const handleSavePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPartName.trim()) {
      setFormError("Nama suku cadang wajib diisi.");
      return;
    }

    if (editingPart) {
      // Update
      const updated = criticalParts.map((p) => {
        if (p.id === editingPart.id) {
          return {
            ...p,
            part_name: formPartName.trim().toUpperCase(),
            part_no: formPartNo.trim().toUpperCase() || "-",
            category: formCategory,
            equipment: formEquipment,
            criticality_level: formLevel,
            min_stock: Number(formMinStock) || 1,
            unit: formUnit.trim().toUpperCase() || "PCS",
            notes: formNotes.trim(),
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });
      onUpdateCriticalParts(updated);
      saveCriticalSpareParts(updated);
      showToast(`Sukses memperbarui item "${formPartName}"!`);
    } else {
      // Create new
      const newPart: CriticalSparePart = {
        id: `crit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        part_name: formPartName.trim().toUpperCase(),
        part_no: formPartNo.trim().toUpperCase() || "-",
        category: formCategory,
        equipment: formEquipment,
        criticality_level: formLevel,
        min_stock: Number(formMinStock) || 1,
        unit: formUnit.trim().toUpperCase() || "PCS",
        notes: formNotes.trim(),
        created_at: new Date().toISOString(),
        created_by: currentUser.name || currentUser.username,
      };
      const updated = [newPart, ...criticalParts];
      onUpdateCriticalParts(updated);
      saveCriticalSpareParts(updated);
      showToast(`Item critical "${formPartName}" berhasil ditambahkan!`);
    }

    setIsModalOpen(false);
  };

  // Delete part
  const handleDeletePart = (part: CriticalSparePart) => {
    if (
      confirm(
        `Yakin ingin menghapus "${part.part_name}" (${part.part_no}) dari daftar Critical Spare Parts?`
      )
    ) {
      const updated = criticalParts.filter((p) => p.id !== part.id);
      onUpdateCriticalParts(updated);
      saveCriticalSpareParts(updated);
      showToast(`Item "${part.part_name}" berhasil dihapus.`);
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (
      confirm(
        `Reset seluruh database ke 26 data default asli dari Excel FIKRI.xlsx? Perubahan manual Anda akan ditimpa kembali ke versi default.`
      )
    ) {
      const defaultParts = resetCriticalSparePartsToDefault();
      onUpdateCriticalParts(defaultParts);
      showToast("Database berhasil di-reset ke 26 item default dari FIKRI.xlsx!");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "NO",
      "NAMA_SUKU_CADANG",
      "PART_NUMBER",
      "KATEGORI",
      "EQUIPMENT",
      "TINGKAT_KRITIS",
      "MIN_STOCK",
      "SATUAN",
      "KETERANGAN",
    ];
    const rows = criticalParts.map((p, idx) => [
      idx + 1,
      `"${p.part_name.replace(/"/g, '""')}"`,
      `"${p.part_no.replace(/"/g, '""')}"`,
      `"${(p.category || "").replace(/"/g, '""')}"`,
      `"${(p.equipment || "").replace(/"/g, '""')}"`,
      `"${p.criticality_level || "CRITICAL"}"`,
      p.min_stock ?? 1,
      `"${p.unit || "PCS"}"`,
      `"${(p.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Database_Critical_Spareparts_TUG6_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Berhasil mengekspor file CSV database critical spare parts!");
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedLevel("all");
  };

  // If not superadmin, render access denied
  if (!isSuperAdmin) {
    return (
      <div className="flex-1 overflow-y-auto h-full p-6 md:p-10 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-rose-950 font-display">
            Akses Terbatas Khusus Super Admin
          </h2>
          <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
            Halaman Database Sparepart Critical untuk TUG 6 merupakan menu otorisasi tingkat tinggi yang hanya dapat dikelola oleh akun dengan role <strong>Super Admin</strong>.
          </p>
        </div>
      </div>
    );
  }

  const isFilterActive = searchTerm !== "" || selectedCategory !== "all" || selectedLevel !== "all";

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-hidden relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Scrollable Viewport (Smooth Scroll All the Way Down) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">

          {/* Top Header Banner: Friendly, High-Contrast & Maritime Look */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <AlertOctagon className="w-3 h-3 text-rose-400" />
                    <span>Super Admin Exclusive</span>
                  </span>
                  <span className="bg-slate-800/90 text-slate-300 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
                    Sumber: data/FIKRI.xlsx (Sheet CRITICAL)
                  </span>
                  <span className="bg-indigo-900/60 text-indigo-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-indigo-700/50 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-300" />
                    Sinkron TUG 5 &amp; TUG 6
                  </span>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
                  <span>Database Sparepart Critical (Master TUG 6)</span>
                </h1>
                
                <p className="text-xs text-slate-300/90 max-w-3xl leading-relaxed font-sans">
                  Master basis data komponen suku cadang kategori <span className="font-bold text-rose-300">Critical</span> armada kapal. Data ini dijadikan referensi cerdas untuk mencocokkan permintaan suku cadang di dokumen <span className="font-bold text-white">TUG 5</span> dengan bukti pengeluaran riil gudang di form <span className="font-bold text-white">TUG 6</span> berdasarkan Nomor SPK.
                </p>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Item Manual</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  title="Reset ke 26 item default dari FIKRI.xlsx"
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reset Default Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  title="Export database ke format CSV"
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Metric Filter Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Item */}
            <div
              onClick={() => {
                setSelectedCategory("all");
                setSelectedLevel("all");
              }}
              className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
                selectedCategory === "all" && selectedLevel === "all"
                  ? "border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20"
                  : "border-slate-200/90 hover:border-slate-300"
              }`}
              title="Klik untuk tampilkan semua item"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span className="font-bold text-slate-700">Total Item Critical</span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                  <AlertOctagon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-display text-slate-900 mt-1">
                {criticalParts.length}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                <span>Komponen Terdaftar</span>
                <span className="text-rose-600 font-bold group-hover:underline">Semua</span>
              </div>
            </div>

            {/* 2. Engine & Ruang Bakar */}
            <div
              onClick={() => setSelectedCategory("Engine Component")}
              className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
                selectedCategory === "Engine Component"
                  ? "border-indigo-300 ring-2 ring-indigo-500/20 bg-indigo-50/20"
                  : "border-slate-200/90 hover:border-slate-300"
              }`}
              title="Klik untuk filter kategori Engine Component"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span className="font-bold text-slate-700">Engine &amp; Ruang Bakar</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-display text-indigo-600 mt-1">
                {categoryStats.engineCount}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                Cylinder Liner, Con-Rod, Cover
              </div>
            </div>

            {/* 3. Piston, Ring & Bearing */}
            <div
              onClick={() => setSelectedCategory("Piston & Ring")}
              className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
                selectedCategory === "Piston & Ring" || selectedCategory === "Bearing"
                  ? "border-amber-300 ring-2 ring-amber-500/20 bg-amber-50/20"
                  : "border-slate-200/90 hover:border-slate-300"
              }`}
              title="Klik untuk filter kategori Piston & Ring"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span className="font-bold text-slate-700">Piston &amp; Bearing</span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-display text-amber-600 mt-1">
                {categoryStats.pistonCount + categoryStats.bearingCount}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                Piston Ring, Metal &amp; Bearing
              </div>
            </div>

            {/* 4. Gasket & Seal */}
            <div
              onClick={() => setSelectedCategory("Gasket & Seal")}
              className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
                selectedCategory === "Gasket & Seal"
                  ? "border-teal-300 ring-2 ring-teal-500/20 bg-teal-50/20"
                  : "border-slate-200/90 hover:border-slate-300"
              }`}
              title="Klik untuk filter kategori Gasket & Seal"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span className="font-bold text-slate-700">Gasket, Packing &amp; Seal</span>
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-display text-teal-600 mt-1">
                {categoryStats.gasketCount}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                Packing P-Series, O-Ring, Gasket
              </div>
            </div>
          </div>

          {/* Filter, Search & Info Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama suku cadang, part number (00047, 84, E2452...), kategori, atau mesin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns & Reset */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-250">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600">Kategori:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Kategori ({criticalParts.length})</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level Dropdown */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-250">
                  <span className="text-[11px] font-bold text-slate-600">Tingkat:</span>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Level</option>
                    <option value="CRITICAL">🔴 CRITICAL</option>
                    <option value="HIGH">🟠 HIGH</option>
                    <option value="MEDIUM">🔵 MEDIUM</option>
                  </select>
                </div>

                {/* Reset Filters button if any filter applied */}
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset semua filter ke kondisi awal"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* Smart Sync Info Banner */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 px-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px] text-amber-800">
                Sistem secara otomatis mendeteksi status <strong className="text-rose-700 font-black">CRITICAL</strong> pada dokumen <strong className="text-slate-900">TUG 5</strong> dan <strong className="text-slate-900">TUG 6</strong> dengan mencocokkan kombinasi <strong>Part Number</strong> dan <strong>Nama Komponen</strong> dari master data ini.
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Table Header Bar */}
            <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Daftar Master Item Critical
                </span>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-rose-200">
                  {filteredParts.length} Item
                </span>
                {isFilterActive && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Difilter dari {criticalParts.length} total)
                  </span>
                )}
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                Database tersimpan di localStorage &amp; Supabase WMS
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/90 text-slate-700 font-mono font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center font-black">NO</th>
                    <th className="py-3 px-4 min-w-[220px] font-black">NAMA SUKU CADANG</th>
                    <th className="py-3 px-4 font-mono font-black">PART NUMBER</th>
                    <th className="py-3 px-4 font-semibold">KATEGORI</th>
                    <th className="py-3 px-4 font-semibold">EQUIPMENT / MESIN</th>
                    <th className="py-3 px-4 text-center font-semibold">TINGKAT KRITIS</th>
                    <th className="py-3 px-4 min-w-[240px] font-semibold">KETERANGAN / JUSTIFIKASI</th>
                    <th className="py-3 px-4 w-28 text-center font-black">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-slate-400">
                        <AlertOctagon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">
                          Tidak ada data suku cadang yang sesuai
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Kriteria pencarian atau filter yang dipilih tidak menghasilkan item. Coba ganti kata kunci atau reset filter.
                        </p>
                        {isFilterActive && (
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="mt-3 px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Reset Semua Filter
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedParts.map((part, index) => {
                      const isCrit = part.criticality_level === "CRITICAL";
                      const isHigh = part.criticality_level === "HIGH";
                      const rowNumber = (currentPage - 1) * perPage + index + 1;

                      return (
                        <tr
                          key={part.id}
                          className="hover:bg-slate-50/90 transition-colors group"
                        >
                          {/* Row Number */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 text-xs">
                            {rowNumber}
                          </td>

                          {/* Nama Suku Cadang */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-950 text-xs leading-snug">
                              {part.part_name}
                            </div>
                            {part.created_by && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Oleh: {part.created_by}
                              </div>
                            )}
                          </td>

                          {/* Part Number Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block bg-slate-100 border border-slate-250 text-slate-800 font-mono font-bold text-xs px-2.5 py-1 rounded-md shadow-2xs">
                              {part.part_no || "-"}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 font-medium text-slate-700 text-xs">
                            {part.category || "General"}
                          </td>

                          {/* Equipment */}
                          <td className="py-3.5 px-4 font-medium text-slate-600 text-xs">
                            {part.equipment || "Main Engine"}
                          </td>

                          {/* Criticality Level Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                                isCrit
                                  ? "bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                                  : isHigh
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-blue-100 text-blue-800 border border-blue-300"
                              }`}
                            >
                              {isCrit && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                              )}
                              <span>{part.criticality_level || "CRITICAL"}</span>
                            </span>
                          </td>

                          {/* Notes / Reason */}
                          <td className="py-3.5 px-4 text-slate-600 text-[11px] leading-relaxed">
                            {part.notes || "Komponen vital kelancaran operasional armada kapal."}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(part)}
                                title="Edit data suku cadang"
                                className="p-1.5 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePart(part)}
                                title="Hapus dari daftar critical"
                                className="p-1.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition-all cursor-pointer shadow-2xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Sticky Modern Pagination Bar */}
            <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs">
              {/* Left: Rows Per Page & Data Counter */}
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">
                    Baris:
                  </span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold font-mono rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer shadow-2xs"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <span className="text-slate-300">|</span>

                <span className="text-[11px] font-mono text-slate-600 font-bold">
                  Menampilkan <span className="text-slate-900 font-black">{filteredParts.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</span> - <span className="text-slate-900 font-black">{Math.min(currentPage * perPage, filteredParts.length)}</span> dari <span className="text-slate-900 font-black">{filteredParts.length}</span> data Master Critical
                </span>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1 font-mono">
                {/* First Page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden md:inline">Sebelumnya</span>
                </button>

                {/* Page Number Pills */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages || 1 }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .map((p, i, arr) => {
                      const prev = arr[i - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && (
                            <span className="px-1 text-slate-400 font-bold">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              currentPage === p
                                ? "bg-slate-900 text-white shadow-xs font-black ring-2 ring-slate-900/20"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Next Page */}
                <button
                  disabled={currentPage >= totalPages || totalPages <= 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
                  title="Halaman Selanjutnya"
                >
                  <span className="hidden md:inline">Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  disabled={currentPage >= totalPages || totalPages <= 1}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL TAMBAH / EDIT ITEM CRITICAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full font-sans overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <AlertOctagon className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display uppercase tracking-wide text-white">
                    {editingPart ? "Edit Suku Cadang Critical" : "Tambah Suku Cadang Critical Manual"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Master komponen acuan pengawasan alur SPK, TUG 5, dan TUG 6
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePart} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nama Suku Cadang (Part Name) <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CYLINDER LINER, PISTON RING, CONNECTING ROD..."
                  value={formPartName}
                  onChange={(e) => setFormPartName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor Part (Part Number):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 00047-001, E245200090A, atau -"
                    value={formPartNo}
                    onChange={(e) => setFormPartNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Kategori Komponen:
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors cursor-pointer"
                  >
                    <option value="Engine Component">Engine Component</option>
                    <option value="Piston & Ring">Piston &amp; Ring</option>
                    <option value="Bearing">Bearing</option>
                    <option value="Gasket & Seal">Gasket &amp; Seal</option>
                    <option value="Fuel System">Fuel System</option>
                    <option value="Piping & Valves">Piping &amp; Valves</option>
                    <option value="Electrical & Sensors">Electrical &amp; Sensors</option>
                    <option value="Other">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mesin / Equipment:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Main Engine, Aux Engine, Generator..."
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Tingkat Kritis (Level):
                  </label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors cursor-pointer"
                  >
                    <option value="CRITICAL">🔴 CRITICAL (Sangat Kritis)</option>
                    <option value="HIGH">🟠 HIGH (Tinggi)</option>
                    <option value="MEDIUM">🔵 MEDIUM (Menengah)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Min Stock:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Satuan (Unit):
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="PCS / SET / UNIT"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Keterangan / Justifikasi Kritis:
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan alasan mengapa komponen ini kritis bagi operasional kapal..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingPart ? "Simpan Perubahan" : "Simpan Item Critical"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
