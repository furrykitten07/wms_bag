/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "react-qr-code";
import { 
  Package, 
  Barcode, 
  MapPin, 
  Ship, 
  Boxes, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Building2, 
  Layers, 
  Clock, 
  Info, 
  Share2, 
  ChevronRight,
  ArrowLeft
} from "lucide-react";

import { SparePart } from "../types.js";
import { api } from "../api.js";
import { BarcodeGraphic } from "./SparePartCatalogView.js";

interface PublicSparePartViewProps {
  partId: string;
  onBackToApp?: () => void;
}

export default function PublicSparePartView({ partId, onBackToApp }: PublicSparePartViewProps) {
  const [part, setPart] = useState<SparePart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch spare part details
  useEffect(() => {
    let isMounted = true;

    async function loadPart() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const inventory = await api.getInventory();
        if (!isMounted) return;

        const cleanSearch = decodeURIComponent(partId).trim().toLowerCase();
        
        // Find matching part by ID, Barcode, Part Number, or SKU
        const matched = inventory.find(p => 
          (p.id && p.id.toLowerCase() === cleanSearch) ||
          (p.barcode && p.barcode.toLowerCase() === cleanSearch) ||
          (p.part_number && p.part_number.toLowerCase() === cleanSearch) ||
          (p.sku && p.sku.toLowerCase() === cleanSearch)
        );

        if (matched) {
          // Check if barcode needs cache fallback
          let finalBarcode = matched.barcode;
          if (!finalBarcode) {
            try {
              const cache = JSON.parse(localStorage.getItem("wms_part_barcode_cache") || "{}");
              if (cache[matched.id]) finalBarcode = cache[matched.id];
            } catch (e) {}
          }
          if (!finalBarcode) {
            finalBarcode = `BC-${Math.floor(10000000 + Math.random() * 90000000)}`;
          }

          setPart({ ...matched, barcode: finalBarcode });
        } else {
          setErrorMsg(`Suku cadang dengan identifikasi "${partId}" tidak ditemukan dalam database WMS.`);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err.message || "Gagal memuat informasi suku cadang dari database.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPart();

    return () => {
      isMounted = false;
    };
  }, [partId]);

  // Load custom metadata (hierarchy, custom spec, weight) from localStorage if available
  const customMeta = useMemo(() => {
    if (!part) return {};
    try {
      const meta = JSON.parse(localStorage.getItem("spare_part_catalog_custom_meta") || "{}");
      return meta[part.id] || {};
    } catch (e) {
      return {};
    }
  }, [part]);

  const hierarchy: string[] = useMemo(() => {
    if (customMeta.hierarchy && Array.isArray(customMeta.hierarchy)) {
      return customMeta.hierarchy;
    }
    return [
      part?.category || "General Spares",
      part?.maker || part?.brand || "Master System",
      "Engine Parts"
    ];
  }, [part, customMeta]);

  const manufacturer = customMeta.manufacturer || part?.maker || part?.brand || part?.vendor_id || "Vendor Maritim BAg";
  const specification = customMeta.specification || part?.specification || `Lokasi Rak: ${part?.location_id || 'loc-1'}, Terdaftar via Master Database`;
  const vesselCompatibility = customMeta.vessel_compatibility || part?.vessel_compatibility || "Semua Armada Kapal (Fleet Wide)";
  const weightKg = customMeta.weight_kg !== undefined ? customMeta.weight_kg : (Number((part as any)?.weight_kg) || 1.0);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white print:bg-white print:text-slate-900">
      
      {/* Top Navigation Bar / Branding */}
      <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 sm:px-6 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0 font-bold font-mono">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase text-white font-mono flex items-center gap-1.5">
                PT. BARUNA ADI GUNA
                <span className="hidden sm:inline-block text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono">
                  WMS LIVE
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Sistem Informasi Terbuka Suku Cadang (QR Scanner)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Salin Link Informasi Suku Cadang"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Tersalin!" : "Salin Link"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cetak Halaman"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <a
              href="/"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Buka Aplikasi WMS Lengkap"
            >
              <span>Portal WMS</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {loading ? (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-12 text-center space-y-4 my-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
              Memuat Informasi Suku Cadang...
            </p>
            <p className="text-xs text-slate-500">
              Menghubungkan ke database WMS PT. Baruna Adi Guna...
            </p>
          </div>
        ) : errorMsg || !part ? (
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-8 text-center space-y-4 my-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-base font-bold text-red-200">
              Suku Cadang Tidak Ditemukan
            </h2>
            <p className="text-xs text-red-300/80 max-w-md mx-auto leading-relaxed">
              {errorMsg || "Nomor part atau barcode ini belum terdaftar di sistem WMS."}
            </p>
            <div className="pt-2">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda WMS
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            
            {/* Verification Banner */}
            <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-xs print:border-emerald-600 print:text-emerald-900 print:bg-emerald-50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-extrabold uppercase font-mono tracking-wider text-[11px] block text-emerald-300 print:text-emerald-900">
                    Suku Cadang Terverifikasi Resmi
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-medium print:text-emerald-800">
                    Tercatat resmi dalam Master Database WMS PT. Baruna Adi Guna
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase shrink-0 print:border-emerald-400">
                Live Verified
              </span>
            </div>

            {/* Hero Main Card */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden print:border print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none">
              
              {/* Subtle maritime grid background accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                
                {/* Left/Main Column: Title, Codes, Specs */}
                <div className="flex-1 space-y-4 w-full">
                  
                  {/* Hierarchy Breadcrumbs */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                    {hierarchy.map((node, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <ChevronRight className="w-3 h-3 text-slate-500" />}
                        <span className={i === hierarchy.length - 1 ? "text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2 py-0.5 rounded font-black print:text-blue-700 print:bg-blue-50" : ""}>
                          {node}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Part Title */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug print:text-slate-950">
                      {part.part_name}
                    </h2>
                    
                    {/* Identification Badges: Part Number, SKU, Barcode */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs font-mono">
                      <span className="bg-slate-700/70 border border-slate-600/80 text-slate-200 px-2.5 py-1 rounded-lg font-bold print:border-slate-300 print:bg-slate-100 print:text-slate-800">
                        PN: <strong className="text-white print:text-slate-950">{part.part_number}</strong>
                      </span>
                      <span className="bg-slate-700/70 border border-slate-600/80 text-slate-300 px-2.5 py-1 rounded-lg font-medium print:border-slate-300 print:bg-slate-100 print:text-slate-800">
                        SKU: <strong className="text-slate-100 print:text-slate-950">{part.sku}</strong>
                      </span>
                      <span className="bg-blue-950/80 border border-blue-700/80 text-blue-300 px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 shadow-sm print:border-blue-300 print:bg-blue-50 print:text-blue-800">
                        <Barcode className="w-3.5 h-3.5 text-blue-400 print:text-blue-600" />
                        {part.barcode}
                      </span>
                    </div>
                  </div>

                  {/* Stock Availability Pill */}
                  <div className="pt-1">
                    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold border ${
                      part.current_stock > part.reorder_point
                        ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-300 print:bg-emerald-50 print:text-emerald-900 print:border-emerald-300"
                        : part.current_stock > 0
                        ? "bg-amber-950/60 border-amber-700/80 text-amber-300 print:bg-amber-50 print:text-amber-900 print:border-amber-300"
                        : "bg-rose-950/60 border-rose-700/80 text-rose-300 print:bg-rose-50 print:text-rose-900 print:border-rose-300"
                    }`}>
                      <Boxes className="w-4 h-4 shrink-0" />
                      <span>
                        Status Stok Fisik Gudang: <strong className="text-sm font-black underline ml-1">{part.current_stock} {part.unit}</strong>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-extrabold bg-black/20">
                        {part.current_stock > part.reorder_point ? "Stok Tersedia" : part.current_stock > 0 ? "Stok Menipis" : "Stok Habis"}
                      </span>
                    </div>
                  </div>

                  {/* Visual Barcode Graphic */}
                  <div className="pt-2">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-300 inline-block shadow-inner select-none print:border-slate-800">
                      <BarcodeGraphic code={part.barcode} width={220} height={42} />
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="bg-slate-900/80 border border-slate-750 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed font-sans italic print:bg-slate-50 print:border-slate-200 print:text-slate-700">
                    "{part.description || `${part.part_name} terdaftar dalam database persediaan suku cadang PT. Baruna Adi Guna.`}"
                  </div>

                </div>

                {/* Right Column: High-Resolution Scannable QR Code */}
                <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-auto bg-slate-900/90 border border-slate-750 rounded-xl p-5 shadow-lg select-none print:bg-white print:border-slate-300">
                  <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
                    <QRCode
                      value={currentUrl}
                      size={150}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  <div className="mt-3 text-center font-mono">
                    <span className="text-[11px] font-black text-blue-400 uppercase bg-blue-950/80 border border-blue-800 px-2.5 py-0.5 rounded block print:text-blue-700 print:bg-blue-50">
                      TOKEN #{part.barcode}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1 uppercase tracking-widest font-bold">
                      Scan untuk verifikasi langsung
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Technical Specifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Logistics & Storage */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3.5 shadow-sm print:bg-white print:border-slate-300 print:text-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2.5 text-xs font-black uppercase tracking-wider text-blue-400 font-mono print:text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span>Logistik &amp; Penyimpanan Gudang</span>
                </div>
                
                <div className="space-y-2.5 text-xs font-sans">
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Lokasi Rak / Bin:</span>
                    <strong className="text-white font-mono font-bold print:text-slate-900">{part.location_id || "Depot Utama (A1)"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Satuan (Unit):</span>
                    <strong className="text-white font-bold print:text-slate-900">{part.unit}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Bobot Satuan (Est):</span>
                    <strong className="text-white font-bold print:text-slate-900">{weightKg} Kg / {part.unit}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Reorder Point (Batas Minimum):</span>
                    <strong className="text-amber-400 font-mono font-bold print:text-amber-700">{part.reorder_point || 5} {part.unit}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Vessel & Technical Compatibility */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3.5 shadow-sm print:bg-white print:border-slate-300 print:text-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2.5 text-xs font-black uppercase tracking-wider text-blue-400 font-mono print:text-blue-700">
                  <Ship className="w-4 h-4" />
                  <span>Pabrikan &amp; Kesesuaian Armada</span>
                </div>
                
                <div className="space-y-2.5 text-xs font-sans">
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Pabrikan / Maker:</span>
                    <strong className="text-white font-bold truncate max-w-[200px] text-right print:text-slate-900" title={manufacturer}>
                      {manufacturer}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Kesesuaian Kapal:</span>
                    <strong className="text-blue-300 font-bold text-right print:text-blue-800">
                      {vesselCompatibility}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Kategori Sistem:</span>
                    <strong className="text-white font-bold print:text-slate-900">{part.category || "General Spares"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 font-medium">Status Terdaftar:</span>
                    <strong className="text-emerald-400 font-mono font-bold print:text-emerald-700">Aktif &amp; Siap Pakai</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Technical Specifications Detail Box */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-2.5 shadow-sm print:bg-white print:border-slate-300 print:text-slate-900">
              <div className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Spesifikasi Teknis &amp; Rekomendasi Penggunaan</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 border border-slate-750 p-3.5 rounded-lg print:bg-slate-50 print:border-slate-200 print:text-slate-700">
                {specification}
              </p>
            </div>

            {/* Footer Guidance */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 space-y-2 no-print">
              <p className="font-mono text-[11px] text-slate-400">
                Halaman ini dapat diakses secara publik melalui pemindaian kamera HP / scanner barcode tanpa perlu login.
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer text-[11px]"
                >
                  Salin Tautan QR Ini
                </button>
                <span>&bull;</span>
                <a
                  href="/"
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer text-[11px]"
                >
                  Masuk ke Sistem WMS Lengkap
                </a>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Page Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-4 px-6 text-center text-[11px] text-slate-500 font-mono mt-8 no-print">
        &copy; {new Date().getFullYear()} PT. BARUNA ADI GUNA &bull; Warehouse Management System (WMS)
      </footer>

    </div>
  );
}
