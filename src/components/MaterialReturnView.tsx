/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FileText, 
  PlusCircle, 
  Trash2, 
  Save, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Printer, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  ChevronRight, 
  User, 
  Anchor, 
  MapPin, 
  FileSpreadsheet, 
  History, 
  AlertTriangle,
  ArrowLeft,
  X,
  ChevronDown,
  Edit3,
  RefreshCw
} from "lucide-react";
import { 
  User as UserType, 
  UserRole, 
  SparePart, 
  MaterialReturn, 
  MaterialReturnItem, 
  MaterialReturnStatus,
  SPKWorkOrder,
  MaterialRequest
} from "../types.js";

interface MaterialReturnViewProps {
  returns: MaterialReturn[];
  parts: SparePart[];
  requests: MaterialRequest[];
  currentUser: UserType;
  onCreateReturn: (data: Partial<MaterialReturn>) => Promise<void>;
  onUpdateReturn: (id: string, data: Partial<MaterialReturn>) => Promise<void>;
  onDeleteReturn: (id: string) => Promise<void>;
  onLogMRAction: (id: string, action: "Printed" | "Downloaded") => Promise<void>;
  onPreviewTUG10: (ret: MaterialReturn) => void;
  spkList?: SPKWorkOrder[];
}

export default function MaterialReturnView({
  returns,
  parts,
  requests,
  currentUser,
  onCreateReturn,
  onUpdateReturn,
  onDeleteReturn,
  onLogMRAction,
  onPreviewTUG10,
  spkList = []
}: MaterialReturnViewProps) {
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Pagination states
  const [returnPage, setReturnPage] = useState(1);
  const returnsPerPage = 10;

  React.useEffect(() => {
    setReturnPage(1);
  }, [searchQuery, statusFilter]);

  // Create form state
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [vesselName, setVesselName] = useState<string>(currentUser.vesselName || "MV Ocean Voyager");
  const [warehouseName, setWarehouseName] = useState<string>("Gudang Merak");
  const [spkNumber, setSpkNumber] = useState<string>("");
  const [dispatchReference, setDispatchReference] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("Broken");
  const [notes, setNotes] = useState<string>("");
  const [formItems, setFormItems] = useState<Partial<MaterialReturnItem>[]>([]);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [currentNotesValue, setCurrentNotesValue] = useState<string>("");

  // Selected item selector lists
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [isNewPartMode, setIsNewPartMode] = useState<boolean>(false);
  const [newPartName, setNewPartName] = useState<string>("");
  const [newPartNumber, setNewPartNumber] = useState<string>("");
  const [newUnit, setNewUnit] = useState<string>("PCS");
  const [qtyIssued, setQtyIssued] = useState<number>(5);
  const [qtyUsed, setQtyUsed] = useState<number>(3);
  const [qtyReturned, setQtyReturned] = useState<number>(2);
  const [itemNotes, setItemNotes] = useState<string>("");

  const activeReturn = returns.find(r => r.id === selectedReturnId) || null;

  const resetForm = () => {
    setReturnDate(new Date().toISOString().split("T")[0]);
    setVesselName(currentUser.vesselName || "MV Ocean Voyager");
    setWarehouseName("Gudang Merak");
    setSpkNumber("");
    setDispatchReference("");
    setReturnReason("Leftover");
    setNotes("");
    setFormItems([]);
    setSelectedPartId("");
    setIsNewPartMode(false);
    setNewPartName("");
    setNewPartNumber("");
    setNewUnit("PCS");
    setQtyIssued(5);
    setQtyUsed(3);
    setQtyReturned(2);
    setItemNotes("");
  };

  // Autoload details when SPK or Vessel changes
  const handleSPKSelection = (spkNo: string) => {
    setSpkNumber(spkNo);
    
    // Find matching SPK or associated requests
    const matchingRequest = requests.find(r => r.work_order_ref === spkNo || r.id === spkNo);
    const relatedSPK = spkList.find(s => s.spk_number === spkNo);

    if (relatedSPK) {
      if (relatedSPK.vessels && relatedSPK.vessels.length > 0) {
        setVesselName(relatedSPK.vessels[0].vessel_name);
      }
    } else if (matchingRequest) {
      setVesselName(matchingRequest.vessel_name);
      setDispatchReference(`TUG8-${matchingRequest.request_number.replace("TUG5-", "")}`);
    }

    // Attempt to pre-fill return items based on chosen Work Order / Requests
    if (matchingRequest && matchingRequest.items) {
      const suggestedItems = matchingRequest.items.map(itm => {
        const issued = itm.requested_qty;
        const used = Math.max(0, Math.floor(issued * 0.7)); // Mock usage
        return {
          spare_part_id: itm.spare_part_id,
          part_name: itm.spare_part_name,
          part_number: itm.part_number,
          unit: itm.unit || "PCS",
          qty_issued: issued,
          qty_used: used,
          qty_returned: issued - used,
          notes: "Leftover parts from delivery"
        };
      });
      setFormItems(suggestedItems);
    } else if (relatedSPK) {
      const suggestedItems: any[] = [];
      relatedSPK.vessels.forEach(v => {
        v.items.forEach(itm => {
          suggestedItems.push({
            spare_part_id: itm.spare_part_id || "part-1",
            part_name: itm.spare_part_name,
            part_number: itm.part_number,
            unit: itm.unit || "PCS",
            qty_issued: itm.qty_to_pick,
            qty_used: Math.max(0, itm.qty_to_pick - 1),
            qty_returned: 1,
            notes: "Returned back to Warehouse"
          });
        });
      });
      setFormItems(suggestedItems);
    }
  };

  const handleAddItemToForm = () => {
    if (!selectedPartId) {
      alert("Harap pilih suku cadang dari daftar terlebih dahulu!");
      return;
    }

    if (qtyReturned <= 0) {
      alert("Jumlah yang dikembalikan harus lebih besar dari 0!");
      return;
    }

    if (qtyReturned > (qtyIssued - qtyUsed)) {
      if (!confirm("Jumlah kembali melebihi sisa (Issued - Used). Tetap tambahkan?")) {
        return;
      }
    }

    let newItem: Partial<MaterialReturnItem>;

    if (isNewPartMode) {
      if (!newPartName.trim()) {
        alert("Nama suku cadang baru wajib diisi!");
        return;
      }
      if (!newPartNumber.trim()) {
        alert("Part number suku cadang baru wajib diisi!");
        return;
      }

      // Check duplicate by part number
      if (formItems.some(i => i.part_number === newPartNumber.trim())) {
        alert("Suku cadang dengan Part Number ini sudah tercatat dalam daftar!");
        return;
      }

      newItem = {
        spare_part_id: `new-part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        part_name: newPartName.trim(),
        part_number: newPartNumber.trim(),
        unit: newUnit,
        qty_issued: qtyIssued,
        qty_used: qtyUsed,
        qty_returned: qtyReturned,
        notes: itemNotes || `Pengembalian Suku Cadang BARU - ${returnReason}`
      };
    } else {
      const matchedPart = parts.find(p => p.id === selectedPartId);
      if (!matchedPart) return;

      // Check duplicate
      if (formItems.some(i => i.spare_part_id === selectedPartId)) {
        alert("Suku cadang ini sudah ada dalam daftar. Silahkan hapus baris lama jika ingin mengubah.");
        return;
      }

      newItem = {
        spare_part_id: matchedPart.id,
        part_name: matchedPart.part_name,
        part_number: matchedPart.part_number,
        unit: matchedPart.unit || "PCS",
        qty_issued: qtyIssued,
        qty_used: qtyUsed,
        qty_returned: qtyReturned,
        notes: itemNotes || `Pengembalian Suku Cadang - ${returnReason}`
      };
    }

    setFormItems([...formItems, newItem]);
    setSelectedPartId("");
    setIsNewPartMode(false);
    setNewPartName("");
    setNewPartNumber("");
    setNewUnit("PCS");
    setItemNotes("");
    setQtyReturned(1);
  };

  const removeItemFromForm = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleSubmitReturnForm = async (status: MaterialReturnStatus) => {
    if (formItems.length === 0) {
      alert("Daftar suku cadang yang dikembalikan tidak boleh kosong!");
      return;
    }

    const payload: Partial<MaterialReturn> = {
      return_date: returnDate,
      vessel_name: vesselName,
      warehouse_name: warehouseName,
      spk_number: spkNumber,
      dispatch_reference: dispatchReference,
      return_reason: returnReason,
      notes: notes,
      status: status,
      created_by: currentUser.username,
      items: formItems as MaterialReturnItem[],
      account_code: "BPP",
      function_code: "ARMADA"
    };

    try {
      if (isEditing && selectedReturnId) {
        await onUpdateReturn(selectedReturnId, payload);
      } else {
        await onCreateReturn(payload);
      }
      setIsCreating(false);
      setIsEditing(false);
      resetForm();
    } catch (e: any) {
      alert("Gagal memproses pengembalian: " + (e.message || e));
    }
  };

  const handleEditReturn = (ret: MaterialReturn) => {
    setSelectedReturnId(ret.id);
    setReturnDate(ret.return_date);
    setVesselName(ret.vessel_name);
    setWarehouseName(ret.warehouse_name);
    setSpkNumber(ret.spk_number || "");
    setDispatchReference(ret.dispatch_reference || "");
    setReturnReason(ret.return_reason);
    setNotes(ret.notes || "");
    setFormItems(ret.items.map(i => ({...i})));
    setIsEditing(true);
    setIsCreating(false);
  };

  // Filter returns
  const filteredReturns = returns.filter(ret => {
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      ret.return_number.toLowerCase().includes(query) ||
      ret.vessel_name.toLowerCase().includes(query) ||
      (ret.spk_number && ret.spk_number.toLowerCase().includes(query)) ||
      ret.return_reason.toLowerCase().includes(query);

    if (statusFilter === "All") return matchSearch;
    return matchSearch && ret.status === statusFilter;
  });

  // Pagination slice
  const paginatedReturns = filteredReturns.slice(
    (returnPage - 1) * returnsPerPage,
    returnPage * returnsPerPage
  );
  const totalPages = Math.ceil(filteredReturns.length / returnsPerPage) || 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* Dynamic rejection modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 className="text-sm font-display font-bold text-rose-600 uppercase flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              TOLAK DOKUMEN TUG 10
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              Harap berikan alasan logistik penolakan dokumen pengembalian material TUG 10 ini. Alasan akan terekam dalam history logs audit.
            </p>
            <textarea
              className="w-full bg-slate-50 border border-slate-250 text-slate-800 text-xs p-3 rounded-lg min-h-[100px] mb-4 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-sans"
              placeholder="Contoh: Suku cadang kotor atau berkarat tidak boleh masuk gudang utama..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 font-mono text-xs uppercase font-bold">
              <button 
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    alert("Alasan penolakan wajib diisi!");
                    return;
                  }
                  if (selectedReturnId) {
                    await onUpdateReturn(selectedReturnId, { 
                      status: "Rejected", 
                      reject_reason: rejectReason 
                    });
                    setShowRejectModal(false);
                    setRejectReason("");
                  }
                }}
                className="px-4 py-2 bg-rose-650 hover:bg-rose-600 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Tolak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Keterangan Modal */}
      {editingNotesId !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-250 p-6 rounded-xl shadow-2xl max-w-md w-full border-t-4 border-t-indigo-600">
            <h3 className="text-sm font-display font-bold text-slate-900 uppercase flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              EDIT KETERANGAN TUG 10
            </h3>
            <p className="text-xs text-slate-505 mb-4 font-sans leading-relaxed">
              Ubah rincian atau catatan keterangan logistik untuk dokumen pengembalian TUG 10 ini.
            </p>
            <textarea
              className="w-full bg-slate-50 border border-slate-250 text-slate-800 text-xs p-3 rounded-lg min-h-[120px] mb-4 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-650 font-sans"
              placeholder="Masukkan keterangan pengembalian di sini..."
              value={currentNotesValue}
              onChange={(e) => setCurrentNotesValue(e.target.value)}
            />
            <div className="flex justify-end gap-3 font-mono text-xs uppercase font-bold">
              <button 
                onClick={() => { setEditingNotesId(null); setCurrentNotesValue(""); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  try {
                    await onUpdateReturn(editingNotesId, { notes: currentNotesValue });
                    setEditingNotesId(null);
                    setCurrentNotesValue("");
                  } catch (e: any) {
                    alert("Gagal memperbarui keterangan: " + (e.message || e));
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary header area of the return management */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-600" />
            BAHAN & SUKU CADANG KEMBALI — TUG 10
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Modul Bon Pengembalian (TUG 10) untuk memproses sisa atau ketidaksesuaian material kapal kembali ke gudang pusat.
          </p>
        </div>

        {!isCreating && !isEditing && (
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase font-extrabold px-5 py-3 rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            BUAT TUG 10 BARU
          </button>
        )}
      </div>

      {/* Main Form container for creation or editing */}
      {(isCreating || isEditing) ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto bg-white border border-slate-250 rounded-xl overflow-hidden shadow-lg border-t-4 border-t-indigo-600">
            
            {/* Form Header */}
            <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-display font-extrabold text-slate-700 uppercase tracking-wider">
                {isEditing ? "EDIT DOKUMEN TUG 10" : "FORM BON PENGEMBALIAN BARANG BARU (TUG 10)"}
              </span>
              <button
                onClick={() => { setIsCreating(false); setIsEditing(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Body */}
            <div className="p-6 space-y-6 text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Side fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tanggal TUG 10
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-250 text-slate-900 p-2 text-xs rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>INTEGRASI SPK / WORK ORDER</span>
                      <span className="text-emerald-600 lowercase font-bold italic">otomatis muat data suku cadang</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 border border-slate-250 text-slate-950 p-2 text-[11px] rounded outline-none focus:border-indigo-500 appearance-none uppercase font-semibold"
                        value={spkNumber}
                        onChange={(e) => handleSPKSelection(e.target.value)}
                      >
                        <option value="">-- PILIH SPK WORK ORDER UNTUK SYNC --</option>
                        {spkList.map((spk) => (
                          <option key={spk.id} value={spk.spk_number}>
                            {spk.spk_number} — {spk.target_port} ({spk.status})
                          </option>
                        ))}
                        {requests.filter(r => r.status === "Approved" || r.status === "Processed").map((req) => (
                          <option key={req.id} value={req.id}>
                            TUG 5: {req.request_number} — {req.vessel_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 text-slate-550 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nama Kapal Penerima
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-250 text-slate-900 p-2 text-xs rounded outline-none focus:border-indigo-500 uppercase font-medium"
                      value={vesselName}
                      onChange={(e) => setVesselName(e.target.value)}
                      placeholder="Masukkan nama kapal penerima..."
                    />
                  </div>
                </div>

                {/* Right Side fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nomor TUG 8 Dispatch (Referensi Kiriman Asli)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-250 text-slate-900 p-2 text-xs rounded outline-none focus:border-indigo-500 uppercase font-medium"
                      value={dispatchReference}
                      onChange={(e) => setDispatchReference(e.target.value)}
                      placeholder="Contoh: TUG8-2026-00021"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nama Gudang Penyimpanan Target
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-100 border border-slate-200 text-slate-650 p-2 text-xs rounded font-medium"
                      value={warehouseName}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-display text-indigo-600">
                      Alasan Logistik Pengembalian (TUG 10)
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 border border-slate-250 text-slate-950 p-2 text-xs rounded outline-none focus:border-indigo-500 appearance-none font-semibold"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                      >
                        <option value="Leftover">Overstock / Sisa Proyek Perbaikan Kapal</option>
                        <option value="Broken">Broken / Rusak Total (Klaim Jaminan Pabrik)</option>
                        <option value="Non-compatible">Tidak Kompatibel / Salah Spesifikasi Mesin</option>
                        <option value="Maintenance Cancelled">Pekerjaan Dibatalkan / Diundur</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 text-slate-550 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Catatan Keterangan Tambahan
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-250 text-slate-900 p-2 text-xs rounded outline-none focus:border-indigo-500 font-medium"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pengembalian sisa material seal ring sirkuit turbo M/E..."
                />
              </div>

              {/* Item selection area */}
              <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                <h4 className="text-xs font-display font-extrabold text-indigo-600 uppercase mb-3.5 tracking-wide">
                  TAMBAH DETAIL BARANG KE BON TUG 10
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                      PILIH MATERIAL / SUKU CADANG
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white border border-slate-250 text-slate-900 p-2 text-[11px] rounded outline-none focus:border-indigo-500 appearance-none font-medium"
                        value={selectedPartId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedPartId(val);
                          setIsNewPartMode(val === "NEW_PART");
                        }}
                      >
                        <option value="">-- PILIH SUKU CADANG --</option>
                        <option value="NEW_PART" className="font-bold text-indigo-600 bg-indigo-50">⚡ (+ BARU) SUKU CADANG TIDAK ADA DI DAFTAR ⚡</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.part_name} (PN: {p.part_number}) — Stok: {p.current_stock}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 text-slate-550 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                      BANYAKNYA DIKIRIM (TUG 8)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-white border border-slate-250 text-slate-900 p-2 text-xs rounded outline-none focus:border-indigo-500 font-mono text-center font-bold"
                      value={qtyIssued}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setQtyIssued(val);
                        setQtyReturned(Math.max(1, val - qtyUsed));
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                      BANYAKNYA DIPAKAI KAPAL
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-white border border-slate-250 text-slate-900 p-2 text-xs rounded outline-none focus:border-indigo-550 font-mono text-center font-bold"
                      value={qtyUsed}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setQtyUsed(val);
                        setQtyReturned(Math.max(1, qtyIssued - val));
                      }}
                    />
                  </div>
                </div>

                {isNewPartMode && (
                  <div className="mt-3.5 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-3">
                    <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                      Detail Suku Cadang Baru (Penyimpanan Akan Di-set sebagai "Unassigned")
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-indigo-900 uppercase mb-0.5">Nama Suku Cadang Baru</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded outline-none focus:border-indigo-500 font-semibold"
                          value={newPartName}
                          onChange={(e) => setNewPartName(e.target.value)}
                          placeholder="e.g. Valve Spring Main Engine"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-indigo-900 uppercase mb-0.5">Part Number Suku Cadang Baru</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded outline-none focus:border-indigo-500 font-mono"
                          value={newPartNumber}
                          onChange={(e) => setNewPartNumber(e.target.value)}
                          placeholder="e.g. PN-V-883-92"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-indigo-900 uppercase mb-0.5">Satuan (Unit)</label>
                        <select
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded outline-none focus:border-indigo-500 font-bold"
                          value={newUnit}
                          onChange={(e) => setNewUnit(e.target.value)}
                        >
                          <option value="PCS">PCS</option>
                          <option value="SET">SET</option>
                          <option value="BAG">BAG</option>
                          <option value="BOX">BOX</option>
                          <option value="UNIT">UNIT</option>
                          <option value="CAN">CAN</option>
                          <option value="MTR">MTR</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-4">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                      KETERANGAN DETAIL ITEM
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-250 text-slate-900 p-2 text-[11px] rounded outline-none focus:border-indigo-500 font-medium"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="misal: Masih tersegel plastik rapi..."
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold text-emerald-600 uppercase mb-1">
                      BANYAKNYA KEMBALI (TUG 10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-white border border-slate-250 text-emerald-700 p-2 text-xs rounded outline-none focus:border-indigo-500 font-mono text-center font-black"
                      value={qtyReturned}
                      onChange={(e) => setQtyReturned(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddItemToForm}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs uppercase font-extrabold p-2.5 rounded transition-all cursor-pointer shadow-xs"
                    >
                      TAMBAHKAN ITEM
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List Table inside form */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-xs">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-100 font-mono font-extrabold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8 text-center bg-slate-100">#</th>
                      <th className="p-2.5">Nama Suku Cadang</th>
                      <th className="p-2.5">Part Number</th>
                      <th className="p-2.5 text-center">Satuan</th>
                      <th className="p-2.5 text-center">Dikirim (TUG 8)</th>
                      <th className="p-2.5 text-center">Dipakai Kapal</th>
                      <th className="p-2.5 text-center text-emerald-700">Kembalian (TUG 10)</th>
                      <th className="p-2.5">Keterangan Item</th>
                      <th className="p-2.5 text-center w-12">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center italic text-slate-500 font-sans">
                          Suku cadang kosong. Pilih barang pada form di atas lalu tekan "TAMBAHKAN ITEM".
                        </td>
                      </tr>
                    ) : (
                      formItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center text-slate-500 font-mono font-bold">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{item.part_name}</td>
                          <td className="p-2.5 font-mono text-slate-500">{item.part_number}</td>
                          <td className="p-2.5 text-center font-mono uppercase font-bold">{item.unit || "PCS"}</td>
                          <td className="p-2.5 text-center font-mono text-slate-500 font-bold">{item.qty_issued}</td>
                          <td className="p-2.5 text-center font-mono text-slate-500 font-bold">{item.qty_used}</td>
                          <td className="p-2.5 text-center font-mono text-emerald-700 font-black text-xs bg-emerald-50">{item.qty_returned}</td>
                          <td className="p-2.5 text-slate-600 font-sans font-medium">{item.notes || "-"}</td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemFromForm(idx)}
                              className="text-rose-650 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Footer Action buttons */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row gap-3 justify-between items-center font-mono text-xs uppercase font-extrabold">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setIsEditing(false); resetForm(); }}
                className="px-5 py-3 rounded-lg border border-slate-250 text-slate-600 hover:text-slate-850 bg-white transition-colors cursor-pointer w-full sm:w-auto text-center"
              >
                Kembali & Batalkan
              </button>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSubmitReturnForm("Draft")}
                  className="px-5 py-3 rounded-lg bg-white border border-slate-250 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  SIMPAN SEBAGAI DRAFT
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitReturnForm("Submitted")}
                  className="px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 animate-bounce" />
                  KIRIM KE WAREHOUSE (AJUKAN)
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        
        // Return Management Core Table & Details page
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          
          {/* Filtering bar section */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-3 items-center shrink-0 shadow-xs">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Cari TUG 10, kapal, SPK..."
                className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-indigo-600 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end font-mono text-[11px] font-bold">
              <span className="text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mr-1 text-[10px] font-extrabold">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> STATUS FILTER TUG 10:
              </span>
              {["All", "Draft", "Submitted", "Approved", "Rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-lg border uppercase transition-all duration-150 cursor-pointer text-[10px] font-black ${
                    statusFilter === status 
                      ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Primary screen layout section */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50">
            
            {/* Returns List left container - STRETCHES FULL HEIGHT */}
            <div className="flex-1 flex flex-col min-h-0 container-table bg-white">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-[10px] font-mono font-extrabold text-slate-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3.5 w-10 text-center bg-slate-50">NO</th>
                      <th className="p-3.5">Nomor TUG 10</th>
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Kapal Pengirim</th>
                      <th className="p-3.5">Integrasi SPK / Ref</th>
                      <th className="p-3.5 text-center">Material</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {paginatedReturns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-16 text-center text-slate-400 font-mono text-[11px] bg-slate-50/10">
                          Tidak ditemukan catatan pengembalian (TUG 10) yang sesuai filter logistik.
                        </td>
                      </tr>
                    ) : (
                      paginatedReturns.map((ret, idx) => {
                        const isCEChecked = activeActionId === ret.id;
                        return (
                          <tr 
                            key={ret.id} 
                            onClick={() => { setSelectedReturnId(ret.id); setIsDetailsOpen(true); }}
                            className={`group cursor-pointer transition-colors ${
                              selectedReturnId === ret.id 
                                ? "bg-slate-100/70 border-l-2 border-indigo-600" 
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="p-3.5 text-center text-slate-500 font-mono font-bold">
                              {(returnPage - 1) * returnsPerPage + idx + 1}
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono text-[11px] font-black text-slate-900 group-hover:text-indigo-600 block transition-colors">
                                {ret.return_number}
                              </span>
                              <span className="font-sans text-[9px] text-slate-450 font-semibold uppercase tracking-wider block mt-0.5">
                                CE: {ret.created_by}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-600 font-semibold">
                              {new Date(ret.return_date).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })}
                            </td>
                            <td className="p-3.5 font-extrabold text-slate-800">
                              ⚓ {ret.vessel_name}
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                {ret.spk_number || "NO-SPK"}
                              </span>
                              {ret.dispatch_reference && (
                                <span className="block font-mono text-[9px] text-slate-450 mt-1 uppercase font-semibold">
                                  TUG 8: {ret.dispatch_reference}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-mono font-extrabold text-slate-900 text-[11px]">
                              {ret.items.length} Suku Cadang
                            </td>
                            <td className="p-3.5 text-center font-mono">
                              <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider shadow-2xs ${
                                ret.status === "Approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-250" :
                                ret.status === "Rejected" ? "bg-rose-100 text-rose-800 border border-rose-250" :
                                ret.status === "Submitted" ? "bg-amber-100 text-amber-800 border border-amber-250" :
                                "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}>
                                {ret.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionId(activeActionId === ret.id ? null : ret.id);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer border border-slate-850"
                                  >
                                    <span>Actions</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </button>

                                  {activeActionId === ret.id && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                        }}
                                      />
                                      <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-250 rounded-lg shadow-xl z-50 overflow-hidden text-left py-1.5 text-slate-700 animate-in fade-in duration-100 ring-1 ring-black/5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionId(null);
                                            onPreviewTUG10(ret);
                                          }}
                                          className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-blue-500" />
                                          <span>Cetak TUG 10 Form</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionId(null);
                                            setEditingNotesId(ret.id);
                                            setCurrentNotesValue(ret.notes || "");
                                          }}
                                          className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>Edit Keterangan</span>
                                        </button>

                                        {(ret.status === "Draft" || ret.status === "Rejected") && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveActionId(null);
                                                handleEditReturn(ret);
                                              }}
                                              className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                            >
                                              <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                              <span>Edit Pengembalian</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                setActiveActionId(null);
                                                if (confirm(`Yakin ingin membatalkan/menghapus TUG 10: ${ret.return_number}?`)) {
                                                  await onDeleteReturn(ret.id);
                                                  if (selectedReturnId === ret.id) setSelectedReturnId(null);
                                                }
                                              }}
                                              className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                              <span>Hapus Dokumen</span>
                                            </button>
                                          </>
                                        )}

                                        {ret.status === "Submitted" && currentUser.role === UserRole.WAREHOUSE_ADMIN && (
                                          <>
                                            <div className="border-t border-slate-100 my-1"></div>
                                            <button
                                              type="button"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                setActiveActionId(null);
                                                if (confirm("Setujui pengembalian suku cadang ke gudang pusat & update log mutasi?")) {
                                                  await onUpdateReturn(ret.id, { status: "Approved" });
                                                }
                                              }}
                                              className="w-full px-4 py-2 text-xs font-bold hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                            >
                                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Setujui TUG 10</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveActionId(null);
                                                setSelectedReturnId(ret.id);
                                                setShowRejectModal(true);
                                              }}
                                              className="w-full px-4 py-2 text-xs font-bold hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                            >
                                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                              <span>Tolak Pengembalian</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* STRETCHED CARD PAGINATION BAR - EXACTLY LIKE SPK WORK ORDER DESIGN */}
              <div className="bg-white border-t border-slate-200 px-6 py-4.5 flex items-center justify-between font-mono text-[11px] font-bold shrink-0 shadow-2xs">
                <span className="text-slate-450 uppercase tracking-widest leading-none text-[10px] font-black">
                  TOTAL REKOR DATA: {filteredReturns.length} TUG 10
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={returnPage === 1}
                    onClick={() => setReturnPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3 py-1.5 text-slate-500">
                    Halaman {returnPage} dari {totalPages}
                  </span>
                  <button
                    disabled={returnPage === totalPages}
                    onClick={() => setReturnPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>

            </div>

            {/* Right Side Sidebar - Return Details & Track Records */}
            {isDetailsOpen && activeReturn && (
              <div className="w-full lg:w-[400px] bg-white flex flex-col min-h-0 shrink-0 shadow-xl border-l border-slate-205 animate-slide-in">
                
                {/* Details Header */}
                <div className="px-5 py-4.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                  <span className="text-xs font-mono font-black text-slate-800 uppercase tracking-widest">
                    Detail Pengembalian TUG 10
                  </span>
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Details Scroll Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  
                  {/* Visual Metadata Panel */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 font-mono">
                    <div className="flex items-baseline justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-slate-450 text-[10px] font-bold">NOMOR DOKUMEN</span>
                      <strong className="text-indigo-600 text-sm font-black tracking-tight">{activeReturn.return_number}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="block text-slate-450 text-[9px] uppercase font-bold">Tanggal Kembali</span>
                        <strong className="text-slate-800">{activeReturn.return_date}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-450 text-[9px] uppercase font-bold">Alasan Kembali</span>
                        <strong className="text-rose-650 uppercase font-black">{activeReturn.return_reason}</strong>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-2.5 grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <span className="block text-slate-450 text-[8.5px] uppercase font-bold">Kapal Pengirim</span>
                        <strong className="text-slate-900 block font-bold">⚓ {activeReturn.vessel_name}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-450 text-[8.5px] uppercase font-bold">Integrasi SPK / Ref</span>
                        <strong className="text-indigo-650 block font-bold">{activeReturn.spk_number || "NO-SPK"}</strong>
                      </div>
                    </div>

                    {activeReturn.dispatch_reference && (
                      <div className="border-t border-slate-200 pt-2 flex justify-between text-[9px]">
                        <span className="text-slate-450 uppercase font-bold">Referenced TUG 8 Dispatch:</span>
                        <span className="text-slate-800 font-extrabold">{activeReturn.dispatch_reference}</span>
                      </div>
                    )}
                  </div>

                  {/* Rejected Reason Banner */}
                  {activeReturn.status === "Rejected" && activeReturn.reject_reason && (
                    <div className="border border-rose-200 p-3 bg-rose-50 rounded-md text-rose-950 relative text-[11px] leading-relaxed shadow-3xs select-none">
                      <div className="flex items-center gap-1.5 text-rose-700 font-mono font-bold uppercase mb-1">
                        <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                        PENOLAKAN OLEH WAREHOUSE ADMIN:
                      </div>
                      <p className="italic font-sans font-medium">
                        "{activeReturn.reject_reason}"
                      </p>
                    </div>
                  )}

                  {/* Return Notes */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] text-slate-600 font-medium">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-[9px] font-mono font-bold text-slate-450 uppercase block">Keterangan / Notes:</strong>
                      <button
                        onClick={() => {
                          setEditingNotesId(activeReturn.id);
                          setCurrentNotesValue(activeReturn.notes || "");
                        }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-850 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Keterangan
                      </button>
                    </div>
                    {activeReturn.notes ? (
                      <p className="font-sans font-medium text-slate-700">{activeReturn.notes}</p>
                    ) : (
                      <p className="font-sans italic text-slate-400">Belum ada catatan keterangan.</p>
                    )}
                  </div>

                  {/* Returned Material Items list */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest pl-1">
                      SUKU CADANG DIKEMBALIKAN:
                    </h5>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 shadow-3xs">
                      {activeReturn.items.map((itm, iIdx) => (
                        <div key={iIdx} className="p-3.5 space-y-2 hover:bg-slate-100/35 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 block text-[11px] font-bold font-sans">
                                {itm.part_name}
                              </strong>
                              <span className="font-mono text-[9px] text-slate-450 block uppercase font-bold tracking-tight mt-0.5">
                                PN: {itm.part_number} &bull; {itm.unit || "PCS"}
                              </span>
                            </div>
                            <span className="text-emerald-800 font-mono font-black text-xs bg-emerald-100 border border-emerald-200/50 px-2.5 py-1 rounded shadow-3xs">
                              kembali: {itm.qty_returned}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-200/40 pt-1.5 font-medium">
                            <span>Sisa asli (Issued/Used):</span>
                            <span className="font-bold text-slate-650">{itm.qty_issued || 0} dikirim &bull; {itm.qty_used || 0} dipakai</span>
                          </div>

                          {itm.notes && (
                            <p className="text-[10px] text-slate-500 italic leading-snug">
                              *{itm.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer actions for printing */}
                  <div className="pt-3 border-t border-slate-200 gap-2 flex flex-col font-mono text-[10px] font-black uppercase">
                    <button
                      onClick={() => onPreviewTUG10(activeReturn)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border border-transparent p-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-indigo-500/20"
                    >
                      <Printer className="w-4 h-4 text-white" />
                      CETAK BON PENGEMBALIAN (TUG 10)
                    </button>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
