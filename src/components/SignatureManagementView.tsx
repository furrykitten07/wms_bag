/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  PenTool, 
  Upload, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  X, 
  Image as ImageIcon,
  ShieldCheck,
  RefreshCw,
  FileSignature,
  UserCheck,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { DigitalSignature, UserRole } from "../types.js";

interface SignatureManagementViewProps {
  signatures: DigitalSignature[];
  onAddSignature: (data: Partial<DigitalSignature>) => Promise<void>;
  onUpdateSignature: (id: string, data: Partial<DigitalSignature>) => Promise<void>;
  onDeleteSignature: (id: string) => Promise<void>;
  onResetDefaults?: () => Promise<void>;
}

export default function SignatureManagementView({
  signatures,
  onAddSignature,
  onUpdateSignature,
  onDeleteSignature,
  onResetDefaults
}: SignatureManagementViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSig, setEditingSig] = useState<DigitalSignature | null>(null);

  // Form State
  const [roleTitle, setRoleTitle] = useState("");
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [userName, setUserName] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "draw">("upload");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Canvas Drawing Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const presetRoles = [
    "Manager Logistik",
    "VP RENDALHAR",
    "Captain",
    "Kepala Gudang",
    "Petugas Gudang",
    "Staff Admin Logistik",
    "Authorized Carrier",
    "Penerima Barang"
  ];

  const presetNames = [
    "Mohamat Emir Ferdian",
    "Sumbono",
    "Capt. H. Wijaya",
    "MAGHFUR MUHAMMAD ALFIN",
    "Ahmad Subarjo",
    "Lainnya (Ketik Manual)"
  ];

  const handleOpenAddModal = () => {
    setEditingSig(null);
    setRoleTitle("Manager Logistik");
    setCustomRoleTitle("");
    setUserName("");
    setSignatureUrl("");
    setNotes("");
    setActiveTab("upload");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sig: DigitalSignature) => {
    setEditingSig(sig);
    if (presetRoles.includes(sig.role_title)) {
      setRoleTitle(sig.role_title);
      setCustomRoleTitle("");
    } else {
      setRoleTitle("CUSTOM");
      setCustomRoleTitle(sig.role_title);
    }
    setUserName(sig.user_name);
    setSignatureUrl(sig.signature_url);
    setNotes(sig.notes || "");
    setActiveTab("upload");
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSignatureUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // slate-900

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureUrl(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = roleTitle === "CUSTOM" ? customRoleTitle.trim() : roleTitle.trim();
    const finalName = userName.trim();

    if (!finalRole) {
      alert("Silakan pilih atau isi Jabatan/Role");
      return;
    }
    if (!finalName) {
      alert("Silakan isi Nama Penanda Tangan");
      return;
    }
    if (!signatureUrl) {
      alert("Silakan upload gambar tanda tangan atau buat tanda tangan di canvas");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSig) {
        await onUpdateSignature(editingSig.id, {
          role_title: finalRole,
          user_name: finalName,
          signature_url: signatureUrl,
          notes: notes.trim()
        });
      } else {
        await onAddSignature({
          role_title: finalRole,
          user_name: finalName,
          signature_url: signatureUrl,
          notes: notes.trim()
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan tanda tangan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tanda tangan untuk ${name}?`)) {
      try {
        await onDeleteSignature(id);
      } catch (err: any) {
        alert(err.message || "Gagal menghapus tanda tangan");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Top Bar Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Manajemen Tanda Tangan Digital
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola file gambar tanda tangan berbasis Jabatan & Nama untuk disisipkan otomatis pada dokumen cetak (TUG 5, TUG 6, TUG 8, TUG 10, & SPK)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onResetDefaults && (
            <button
              onClick={onResetDefaults}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Kembalikan Tanda Tangan bawaan sistem"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tanda Tangan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* Info Alert Box */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl text-blue-900 text-xs flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-950 block">Otomatisasi Tanda Tangan Dokumen Cetak WMS:</span>
            <p className="text-blue-800 leading-relaxed">
              Tanda tangan yang diunggah di sini akan dipetakan berdasarkan <strong>Role / Jabatan</strong> atau <strong>Nama Penanda Tangan</strong>. Saat membuka modal cetak (TUG 5, TUG 6, TUG 8, TUG 10, atau Laporan SPK), sistem akan secara otomatis menyisipkan gambar tanda tangan di atas garis nama.
            </p>
          </div>
        </div>

        {signatures.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto my-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
              <PenTool className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Belum Ada Tanda Tangan Terdaftar</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
              Silakan tambahkan data gambar tanda tangan untuk Manager Logistik, VP RENDALHAR, Captain, atau Kepala Gudang.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tanda Tangan Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signatures.map((sig) => (
              <div 
                key={sig.id} 
                className="bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* Card Top Header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px] uppercase tracking-wider font-mono mb-1">
                      {sig.role_title}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {sig.user_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(sig)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit Tanda Tangan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sig.id, sig.user_name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Hapus Tanda Tangan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Signature Preview Box */}
                <div className="p-6 bg-slate-50/40 flex-1 flex flex-col items-center justify-center min-h-[140px] relative group-hover:bg-blue-50/10 transition-colors">
                  <div className="w-full h-24 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center shadow-2xs relative">
                    <img 
                      src={sig.signature_url} 
                      alt={`Tanda tangan ${sig.user_name}`} 
                      className="max-h-20 max-w-full object-contain mix-blend-multiply select-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" /> SIAP DIGUNAKAN DI DOKUMEN CETAK
                  </span>
                </div>

                {/* Card Footer Info */}
                <div className="px-5 py-3 border-t border-slate-100 bg-white text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="truncate max-w-[180px] italic">
                    {sig.notes || "Tanpa catatan tambahan"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(sig.updated_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Signature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {editingSig ? "Edit Tanda Tangan Digital" : "Tambah Tanda Tangan Digital Baru"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jabatan / Role Dokumen <span className="text-red-500">*</span>
                </label>
                <select
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">-- Pilih Role / Jabatan --</option>
                  {presetRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="CUSTOM">+ Kustom Role Lainnya...</option>
                </select>
              </div>

              {roleTitle === "CUSTOM" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Jabatan Kustom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customRoleTitle}
                    onChange={(e) => setCustomRoleTitle(e.target.value)}
                    placeholder="Contoh: General Manager Logistik"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              )}

              {/* User Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Penanda Tangan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Contoh: Mohamat Emir Ferdian / Capt. H. Wijaya"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama ini akan dicocokkan dengan blok tanda tangan pada cetakan dokumen TUG.
                </p>
              </div>

              {/* Signature Input Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Input Tanda Tangan <span className="text-red-500">*</span>
                </label>

                <div className="flex border-b border-slate-200 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === "upload" 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File Gambar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("draw")}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === "draw" 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Gambar Manual</span>
                  </button>
                </div>

                {activeTab === "upload" ? (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-slate-700 block">
                        Klik atau Tarik File Gambar Tanda Tangan ke Sini
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Format disarankan: PNG Transparan atau JPG (Maks. 3MB)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border border-slate-300 rounded-xl bg-white p-1 shadow-inner relative flex justify-center">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="touch-none cursor-crosshair bg-white w-full max-w-[400px] h-[120px] rounded"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Gunakan mouse atau layar sentuh untuk menggambar</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-red-600 hover:text-red-700 font-semibold underline"
                      >
                        Bersihkan Canvas
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Box */}
              {signatureUrl && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block mb-1">
                    Preview Tanda Tangan:
                  </span>
                  <div className="h-20 bg-white border border-blue-200 rounded-lg p-2 flex items-center justify-center">
                    <img 
                      src={signatureUrl} 
                      alt="Preview Tanda Tangan" 
                      className="max-h-16 object-contain mix-blend-multiply"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Tanda tangan resmi untuk dokumen TUG & SPK"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingSig ? "Simpan Perubahan" : "Simpan Tanda Tangan"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
