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
  Archive
} from "lucide-react";
import { 
  User as UserType, 
  UserRole, 
  SparePart, 
  MaterialRequest, 
  MaterialRequestItem, 
  MaterialRequestStatus,
  SPKWorkOrder,
  DigitalSignature
} from "../types.js";
import BatchPrintZipModal from "./BatchPrintZipModal.js";

interface MaterialRequestViewProps {
  requests: MaterialRequest[];
  parts: SparePart[];
  currentUser: UserType;
  onCreateRequest: (request: Partial<MaterialRequest>) => Promise<void>;
  onCreateRequestBatch: (requests: Partial<MaterialRequest>[]) => Promise<void>;
  onUpdateRequest: (id: string, request: Partial<MaterialRequest>) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onLogMRAction: (id: string, action: "Printed" | "Downloaded") => Promise<void>;
  onPreviewTUG5: (request: MaterialRequest) => void;
  spkList?: SPKWorkOrder[];
  autoOpenMRId?: string | null;
  onClearAutoOpenMRId?: () => void;
  signatures?: DigitalSignature[];
}

export default function MaterialRequestView({
  requests,
  parts,
  currentUser,
  onCreateRequest,
  onCreateRequestBatch,
  onUpdateRequest,
  onDeleteRequest,
  onLogMRAction,
  onPreviewTUG5,
  spkList = [],
  autoOpenMRId,
  onClearAutoOpenMRId,
  signatures = []
}: MaterialRequestViewProps) {
  const [selectedMRId, setSelectedMRId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isBatchZipModalOpen, setIsBatchZipModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  React.useEffect(() => {
    if (autoOpenMRId) {
      const target = requests.find(
        r => r.id === autoOpenMRId || r.request_number === autoOpenMRId || r.tug5_number === autoOpenMRId
      );
      if (target) {
        setSelectedMRId(target.id);
        setIsDetailsOpen(true);
        if (onClearAutoOpenMRId) {
          onClearAutoOpenMRId();
        }
      }
    }
  }, [autoOpenMRId, requests]);

  // TUG 5 (Material Requests) Pagination states
  const [tugPage, setTugPage] = useState(1);
  const tugPerPage = 10;

  React.useEffect(() => {
    setTugPage(1);
  }, [searchQuery, statusFilter]);

  // Create form state
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [vesselName, setVesselName] = useState<string>(currentUser.vesselName || "MV. KARTINI BARUNA");
  const [warehouseName, setWarehouseName] = useState<string>("Gudang Merak");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [workOrderRef, setWorkOrderRef] = useState<string>("");
  const [accountCode, setAccountCode] = useState<string>("BPP");
  const [functionCode, setFunctionCode] = useState<string>("ARMADA");
  const [remarks, setRemarks] = useState<string>("");
  const [formItems, setFormItems] = useState<Partial<MaterialRequestItem>[]>([]);

  // Selected item selector lists
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUsage, setItemUsage] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>("");

  const activeMR = requests.find(r => r.id === selectedMRId) || null;

  const resetForm = () => {
    setRequestDate(new Date().toISOString().split("T")[0]);
    setVesselName(currentUser.vesselName || "MV. KARTINI BARUNA");
    setWarehouseName("Gudang Merak");
    setDeliveryAddress("");
    setWorkOrderRef("");
    setAccountCode("BPP");
    setFunctionCode("ARMADA");
    setRemarks("");
    setFormItems([]);
    setSelectedPartId("");
    setItemQty(1);
    setItemUsage(1);
    setItemNotes("");
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
  const [pendingSyncList, setPendingSyncList] = useState<SPKWorkOrder[]>([]);
  const [selectedSyncIds, setSelectedSyncIds] = useState<string[]>([]);

  const handleSyncSPK = () => {
    const unmatchedSPKs = spkList.filter(spk => {
      return !requests.some(req => req.work_order_ref === spk.spk_number);
    });

    if (unmatchedSPKs.length === 0) {
      alert(`Seluruh daftar SPK (${spkList.length} SPK) sudah tersinkronisasi sempurna dengan TUG 5 (Permintaan Barang) di sistem!`);
      return;
    }

    setPendingSyncList(unmatchedSPKs);
    setSelectedSyncIds(unmatchedSPKs.map(s => s.id));
    setShowSyncConfirmation(true);
  };

  const executeBatchSync = async () => {
    if (isSyncing) return;
    const toSync = pendingSyncList.filter(spk => selectedSyncIds.includes(spk.id));
    if (toSync.length === 0) {
      alert("Harap pilih setidaknya satu SPK yang ingin disinkronkan!");
      return;
    }

    setIsSyncing(true);
    try {
      const payloads: Partial<MaterialRequest>[] = toSync.map(spk => {
        const allItems: any[] = [];
        
        spk.vessels.forEach(vessel => {
          vessel.items.forEach(itm => {
            const matchedPart = parts.find(p => p.id === itm.spare_part_id || p.part_number === itm.part_number);
            allItems.push({
              spare_part_id: matchedPart?.id || itm.spare_part_id,
              spare_part_name: matchedPart?.part_name || itm.spare_part_name,
              part_number: matchedPart?.part_number || itm.part_number,
              unit: matchedPart?.unit || itm.unit || "PCS",
              avg_monthly_usage: 1,
              remaining_stock: matchedPart?.current_stock || 0,
              requested_qty: itm.qty_to_pick,
              notes: `Sinkronisasi Otomatis SPK - Kapal: ${vessel.vessel_name}`
            });
          });
        });

        const primaryVessel = spk.vessels[0]?.vessel_name || "MV. KARTINI BARUNA";
        const cargoAddress = `Pelabuhan Target: ${spk.target_port || "Pelabuhan Merak Mas, Cilegon"}`;

        return {
          request_date: new Date(spk.created_at).toISOString().split("T")[0],
          requester_name: spk.created_by || "Crew User",
          vessel_name: primaryVessel,
          warehouse_name: "Gudang Merak",
          delivery_address: cargoAddress,
          work_order_ref: spk.spk_number,
          account_code: "BPP", // Default account code
          function_code: "ARMADA",  // Default function code
          remarks: `SINKRONISASI OTOMATIS REGISTER SPK: ${spk.spk_number} (Dari Register Eksternal)`,
          status: "Draft" as const, // Start as Draft
          items: allItems
        };
      });

      await onCreateRequestBatch(payloads);
      setShowSyncConfirmation(false);
      setPendingSyncList([]);
      setSelectedSyncIds([]);
      alert(`Sinkronisasi sukses! ${payloads.length} dokumen TUG 5 (Permintaan Barang) telah disinkronkan dengan status DRAFT. Harap setujui dengan akun Staff Gudang.`);
    } catch (err: any) {
      console.error(err);
      alert("Gagal melakukan sinkronisasi otomatis: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleStartEdit = (mr: MaterialRequest) => {
    setRequestDate(mr.request_date);
    setVesselName(mr.vessel_name);
    setWarehouseName(mr.warehouse_name || "Gudang Merak");
    setDeliveryAddress(mr.delivery_address || "");
    setWorkOrderRef(mr.work_order_ref || "");
    setAccountCode(mr.account_code || "BPP");
    setFunctionCode(mr.function_code || "ARMADA");
    setRemarks(mr.remarks || "");
    setFormItems(mr.items.map(itm => ({ ...itm })));
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleAddFormItem = () => {
    if (!selectedPartId) return;
    const part = parts.find(p => p.id === selectedPartId);
    if (!part) return;

    // Check if item already exists in list
    if (formItems.some(itm => itm.spare_part_id === part.id)) {
      alert("Part ini sudah dimasukkan ke daftar!");
      return;
    }

    const newItem: Partial<MaterialRequestItem> = {
      spare_part_id: part.id,
      spare_part_name: part.part_name,
      part_number: part.part_number,
      unit: part.unit,
      avg_monthly_usage: itemUsage,
      remaining_stock: part.current_stock,
      requested_qty: itemQty,
      notes: itemNotes
    };

    setFormItems([...formItems, newItem]);
    setSelectedPartId("");
    setItemQty(1);
    setItemUsage(1);
    setItemNotes("");
  };

  const handleRemoveFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleUpdateFormItemStatus = (idx: number, status: "Arrived" | "Pending" | "Returned") => {
    const updated = [...formItems];
    updated[idx].item_status = status;
    if (status === "Pending") {
      updated[idx].notes = "Barang belum datang";
    } else if (status === "Returned") {
      updated[idx].notes = "Barang diretur";
    } else {
      updated[idx].notes = "";
    }
    setFormItems(updated);
  };

  const handleUpdateFormItemNotes = (idx: number, notesText: string) => {
    const updated = [...formItems];
    updated[idx].notes = notesText;
    setFormItems(updated);
  };

  const handleSaveRequest = async (status: MaterialRequestStatus) => {
    if (formItems.length === 0) {
      alert("Harap masukkan setidaknya 1 item kargo yang diminta.");
      return;
    }

    const reqData = {
      request_date: requestDate,
      requester_name: currentUser.name,
      vessel_name: vesselName,
      warehouse_name: warehouseName,
      delivery_address: deliveryAddress,
      work_order_ref: workOrderRef,
      account_code: accountCode,
      function_code: functionCode,
      remarks,
      status,
      items: formItems as MaterialRequestItem[]
    };

    try {
      if (isCreating) {
        await onCreateRequest(reqData);
      } else if (isEditing && activeMR) {
        await onUpdateRequest(activeMR.id, reqData);
      }
      setIsCreating(false);
      setIsEditing(false);
      setIsDetailsOpen(false);
      resetForm();
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  const handleApprove = async () => {
    if (!activeMR) return;
    if (confirm(`Approve Material Request ${activeMR.request_number} & generate TUG 5?`)) {
      await onUpdateRequest(activeMR.id, { status: "Approved" });
      setIsDetailsOpen(false);
    }
  };

  const handleMarkProcessed = async () => {
    if (!activeMR) return;
    if (confirm(`Tandai request ${activeMR.request_number} ini telah diproses (Dispatched / Dikirim)?`)) {
      await onUpdateRequest(activeMR.id, { status: "Processed" });
      setIsDetailsOpen(false);
    }
  };

  const handleViewDetails = (mr: MaterialRequest) => {
    setSelectedMRId(mr.id);
    setIsDetailsOpen(true);
  };

  const handleEditClick = (mr: MaterialRequest) => {
    setSelectedMRId(mr.id);
    handleStartEdit(mr);
  };

  const handleSubmitClick = async (mr: MaterialRequest) => {
    if (currentUser.role === UserRole.WAREHOUSE_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) {
      if (confirm(`Approve Draft TUG 5 ${mr.request_number} (Status -> Submitted)?`)) {
        await onUpdateRequest(mr.id, { status: "Submitted" });
      }
    } else {
      alert(`Permintaan TUG 5 ${mr.request_number} telah diajukan ke Staff Gudang untuk diverifikasi!`);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(mr => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      if (statusFilter === "All") return true;
      return mr.status === statusFilter;
    }

    const matchesHeader = 
      mr.request_number.toLowerCase().includes(q) ||
      (mr.tug5_number && mr.tug5_number.toLowerCase().includes(q)) ||
      (mr.tug6_number && mr.tug6_number.toLowerCase().includes(q)) ||
      (mr.tug_number && mr.tug_number.toLowerCase().includes(q)) ||
      (mr.spk_number && mr.spk_number.toLowerCase().includes(q)) ||
      (mr.spk_id && mr.spk_id.toLowerCase().includes(q)) ||
      mr.vessel_name.toLowerCase().includes(q) ||
      (mr.requester_name && mr.requester_name.toLowerCase().includes(q)) ||
      (mr.requested_by && mr.requested_by.toLowerCase().includes(q)) ||
      (mr.created_by && mr.created_by.toLowerCase().includes(q)) ||
      (mr.work_order_ref && mr.work_order_ref.toLowerCase().includes(q)) ||
      (mr.remarks && mr.remarks.toLowerCase().includes(q)) ||
      (mr.notes && mr.notes.toLowerCase().includes(q));

    const matchesItems = mr.items && mr.items.some(item => 
      (item.spare_part_name && item.spare_part_name.toLowerCase().includes(q)) ||
      (item.part_number && item.part_number.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );

    const matchesSearch = matchesHeader || matchesItems;
    
    if (statusFilter === "All") return matchesSearch;
    return mr.status === statusFilter && matchesSearch;
  });

  const unmatchedCount = spkList.filter(spk => !requests.some(req => req.work_order_ref === spk.spk_number)).length;

  // Computed TUG 5 pagination values
  const tugTotalPages = Math.ceil(filteredRequests.length / tugPerPage);
  const paginatedRequests = filteredRequests.slice((tugPage - 1) * tugPerPage, tugPage * tugPerPage);

  const renderApprovalStatus = (mr: MaterialRequest) => {
    const signed: string[] = [];
    const missing: string[] = [];

    if (mr.alfin_signed) signed.push("Alfin"); else missing.push("Alfin");
    if (mr.emir_signed) signed.push("Emir"); else missing.push("Emir");
    if (mr.sumbono_signed) signed.push("Sumbono"); else missing.push("Sumbono");

    if (signed.length === 3) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs">
            ✓ Approved (Full L1-L3)
          </span>
          <span className="text-[9px] text-emerald-700 font-mono font-bold">
            TTD: Alfin, Emir, Sumbono
          </span>
        </div>
      );
    }

    if (signed.length > 0) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider">
            ⏳ Disetujui ({signed.length}/3)
          </span>
          <span className="text-[9px] text-emerald-700 font-mono font-bold">
            ✓ Acc: {signed.join(", ")}
          </span>
          <span className="text-[9px] text-amber-700 font-mono font-bold">
            ⏳ Belum: {missing.join(", ")}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider">
          ⏳ Menunggu TTD (0/3)
        </span>
        <span className="text-[9px] text-rose-600 font-mono font-bold">
          ❌ Belum: Alfin, Emir, Sumbono
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* 1. VIEW HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Daftar Permintaan Barang-Barang (Material Umum)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Sistem pengajuan logistik kapal PT. Pelayaran Bahtera Adhiguna. Ajukan, setujui, dan unduh form cetak TUG 5 resmi.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            onClick={() => setIsBatchZipModalOpen(true)}
            className="px-4 py-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold text-xs uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Archive className="w-4 h-4 text-blue-600" />
            <span>Export ZIP Batch TUG 5</span>
          </button>

          <button
            onClick={handleSyncSPK}
            disabled={isSyncing}
            className={`px-4 py-3 font-bold text-xs uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm border cursor-pointer text-center relative ${
              isSyncing
                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : unmatchedCount > 0
                ? "bg-blue-600 hover:bg-blue-500 border-blue-600 text-white animate-pulse-subtle"
                : "bg-white hover:bg-slate-50 border-slate-250 text-slate-700"
            }`}
          >
            <span>⚡ Sinkronisasi Register SPK</span>
            {unmatchedCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {unmatchedCount} BARU
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER PANEL */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari nomor request, kapal penerima, WO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end font-mono text-[11px] font-bold">
          <span className="text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mr-1 text-[10px] font-extrabold">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> STATUS FILTER TUG 5:
          </span>
          <div className="flex gap-2">
            {["All", "Draft", "Submitted", "Approved", "Rejected", "Processed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-lg border uppercase transition-all duration-150 cursor-pointer text-[10px] font-black ${
                  statusFilter === st 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CORE FLAT TABLE DISPLAY */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="flex-1 overflow-auto pb-24">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                <th className="py-4 px-6 font-black w-16 text-center">NO</th>
                <th className="py-4 px-6 font-semibold">No. Request</th>
                <th className="py-4 px-6 font-semibold">Tanggal Pengajuan</th>
                <th className="py-4 px-6 font-semibold">Kapal Penerima</th>
                <th className="py-4 px-6 font-semibold">Pemohon (Chief Eng.)</th>
                <th className="py-4 px-6 font-semibold text-center">Kuantitas Item</th>
                <th className="py-4 px-6 font-semibold">Work Order No.</th>
                <th className="py-4 px-6 font-semibold">Status Approval</th>
                <th className="py-4 px-6 font-semibold text-right no-print w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-mono text-[11px]">
                    Tidak ada dokumen permintaan barang TUG 5 yang terekam.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((mr, idx) => {
                  const dateStr = new Date(mr.request_date).toLocaleDateString("id-ID", { 
                    day: "numeric", 
                    month: "long", 
                    year: "numeric" 
                  });
                  return (
                    <tr key={mr.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4.5 px-6 text-center font-mono text-slate-400 font-bold">{(tugPage - 1) * tugPerPage + idx + 1}</td>
                      <td 
                        onClick={() => handleViewDetails(mr)}
                        className="py-4.5 px-6 font-mono font-black text-emerald-600 hover:underline cursor-pointer"
                      >
                        {mr.request_number}
                      </td>
                      <td className="py-4.5 px-6 text-slate-650 font-medium">{dateStr}</td>
                      <td className="py-4.5 px-6 text-slate-900 font-bold font-sans">{mr.vessel_name}</td>
                      <td className="py-4.5 px-6 text-slate-700 font-semibold">{mr.requester_name}</td>
                      <td className="py-4.5 px-6 text-center font-mono font-bold">
                        <span className="bg-slate-50 px-3 py-1.5 rounded border border-slate-205 text-slate-700 text-[10px]">
                          {mr.items.length} Suku Cadang
                        </span>
                      </td>
                      <td className="py-4.5 px-6 font-mono text-rose-600 font-bold text-[11.5px]">{mr.work_order_ref || "-"}</td>
                      <td className="py-4.5 px-6">{renderApprovalStatus(mr)}</td>
                      <td className="py-4.5 px-6 text-right no-print relative">
                        <div className="flex items-center justify-end">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionId(activeActionId === mr.id ? null : mr.id);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer border border-slate-850"
                            >
                              <span>Actions</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {activeActionId === mr.id && (
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
                                      handleViewDetails(mr);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Detail / View</span>
                                  </button>

                                  {["Draft", "Rejected"].includes(mr.status) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        handleEditClick(mr);
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Edit Permintaan</span>
                                    </button>
                                  )}

                                  {/* Quick Level 1 Signature Button (Alfin / Verifikator) */}
                                  {(currentUser.username === "alfin" || currentUser.role === UserRole.VERIFIER_RENDALHAR || currentUser.role === UserRole.SUPER_ADMIN) && !mr.alfin_signed && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            alfin_signed: true,
                                            alfin_signed_at: now,
                                            alfin_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=MaghfurAlfin",
                                            status: mr.status === "Draft" ? "Submitted" : mr.status
                                          });
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>✓ TTD Level 1 (Alfin)</span>
                                      </button>
                                    </>
                                  )}

                                  {/* Quick Level 2 Signature Button (Emir / Manager Logistik) */}
                                  {(currentUser.username === "emir" || currentUser.role === UserRole.LOGISTICS_MANAGER || currentUser.role === UserRole.SUPER_ADMIN) && !mr.emir_signed && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            emir_signed: true,
                                            emir_signed_at: now,
                                            emir_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian"
                                          });
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-amber-50 text-amber-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>✓ TTD Level 2 (Emir)</span>
                                      </button>
                                    </>
                                  )}

                                  {/* Quick Level 3 Signature Button (Sumbono / VP Rendalhar) */}
                                  {(currentUser.username === "sumbono" || currentUser.role === UserRole.VP_RENDALHAR || currentUser.role === UserRole.SUPER_ADMIN) && !mr.sumbono_signed && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            sumbono_signed: true,
                                            sumbono_signed_at: now,
                                            sumbono_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono",
                                            status: "Approved"
                                          });
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-indigo-50 text-indigo-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>✓ Sahkan & TTD (Sumbono)</span>
                                      </button>
                                    </>
                                  )}

                                  {mr.status === "Draft" && currentUser.role === UserRole.VESSEL_CREW && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          if (confirm(`Submit Material Request ${mr.request_number}?`)) {
                                            await onUpdateRequest(mr.id, { status: "Submitted" });
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-blue-50 text-blue-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <Send className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Submit Permintaan</span>
                                      </button>
                                    </>
                                  )}



                                  {true && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          onPreviewTUG5(mr);
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-emerald-50 text-emerald-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Cetak TUG 5 (PDF)</span>
                                      </button>
                                      
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          if (confirm(`Apakah Anda yakin ingin menghapus Permintaan Barang (TUG 5) dengan nomor ${mr.request_number} ini?`)) {
                                            await onDeleteRequest(mr.id);
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Hapus TUG 5</span>
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

        {/* Pagination Bar for TUG 5 */}
        <div id="tug-pagination-bar" className="bg-white border-t border-slate-200 px-6 py-4.5 flex items-center justify-between font-mono text-[11px] font-bold shrink-0 shadow-2xs no-print">
          <span className="text-slate-450 uppercase tracking-widest leading-none text-[10px] font-black">
            TOTAL REKOR DATA: {filteredRequests.length} TUG 5
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={tugPage === 1}
              onClick={() => setTugPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-slate-500">
              Halaman {tugPage} dari {tugTotalPages || 1}
            </span>
            <button
              disabled={tugPage === tugTotalPages || tugTotalPages <= 1}
              onClick={() => setTugPage(p => Math.min(tugTotalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL POPUP: VIEW DETAILS DIALOG */}
      {/* ========================================================= */}
      {isDetailsOpen && activeMR && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border border-slate-205 rounded-xl shadow-2xl max-w-4xl w-full font-sans overflow-hidden my-8 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-205 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-55 p-2 rounded-lg border border-emerald-100">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-display text-slate-950 tracking-wider uppercase flex items-center gap-2">
                    {activeMR.request_number}
                    {getStatusBadge(activeMR.status)}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Diajukan: {new Date(activeMR.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Timeline Flow */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-400 mb-3 text-center">
                  TUG 5 MATERIAL REQUEST LIFECYCLE STATE LOG
                </h4>
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full border bg-emerald-50 border-emerald-550 text-emerald-600 text-xs font-mono font-bold flex items-center justify-center">1</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">Draft</span>
                  </div>
                  <div className={`flex-1 h-0.5 ${["Submitted", "Approved", "Processed", "Rejected"].includes(activeMR.status) ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border text-xs font-mono font-bold flex items-center justify-center ${
                      activeMR.status === "Submitted"
                        ? "bg-blue-600 border-blue-600 text-white shadow"
                        : ["Approved", "Processed"].includes(activeMR.status)
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : "bg-white border-slate-200 text-slate-300"
                    }`}>2</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">Submitted</span>
                  </div>
                  <div className={`flex-1 h-0.5 ${["Approved", "Processed"].includes(activeMR.status) ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border text-xs font-mono font-bold flex items-center justify-center ${
                      activeMR.status === "Approved"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow"
                        : activeMR.status === "Processed"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : activeMR.status === "Rejected"
                            ? "bg-rose-100 border-rose-500 text-rose-600 font-bold"
                            : "bg-white border-slate-200 text-slate-300"
                    }`}>{activeMR.status === "Rejected" ? "X" : "3"}</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">
                      {activeMR.status === "Rejected" ? "Rejected" : "Approved"}
                    </span>
                  </div>
                  <div className={`flex-1 h-0.5 ${activeMR.status === "Processed" ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border text-xs font-mono font-bold flex items-center justify-center ${
                      activeMR.status === "Processed"
                        ? "bg-amber-500 border-amber-500 text-slate-900 shadow font-black"
                        : "bg-white border-slate-200 text-slate-300"
                    }`}>4</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">Processed</span>
                  </div>
                </div>
              </div>

              {/* Informational Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed text-xs">
                
                {/* Panel 1 */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5 text-slate-400" />
                    Informasi Kapal & Pemohon
                  </h4>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Request Number:</span>
                    <span className="text-emerald-700 font-bold">{activeMR.request_number}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Tanggal TUG 5:</span>
                    <span className="text-slate-800 font-semibold">{new Date(activeMR.request_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Kepala Bagian / Pemohon:</span>
                    <span className="text-slate-800 font-bold">{activeMR.requester_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Nama Kapal:</span>
                    <span className="text-blue-700 font-bold">{activeMR.vessel_name}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400">🏢 Depo Gudang:</span>
                    <span className="text-slate-800 font-semibold">{activeMR.warehouse_name}</span>
                  </div>
                </div>

                {/* Panel 2 */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Dokumen & Referensi Akuntansi
                  </h4>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">No. Perintah Kerja:</span>
                    <span className="text-slate-800 font-black text-rose-600">{activeMR.work_order_ref || "TIADA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Kode Akun ERP:</span>
                    <span className="text-indigo-700 font-extrabold">{activeMR.account_code || "TIADA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Kode Fungsi Layanan:</span>
                    <span className="text-emerald-700 font-extrabold">{activeMR.function_code || "TIADA"}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="text-slate-400 block mb-1">Alamat Distribusi Fisik:</span>
                    <span className="text-slate-700 block bg-white p-2 rounded border border-slate-200 italic leading-tight text-[11px]">
                      {activeMR.delivery_address || "Pelabuhan Merak Mas, Cilegon, Banten"}
                    </span>
                  </div>

                  {/* WMS SPK Integration info box removed for clean info flow */}
                </div>

              </div>

              {/* Remarks/Reject Reason Log */}
              {activeMR.remarks && (
                <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-xs flex items-start gap-2.5 text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Pemberitahuan & Approval Ledger Remark:</strong>
                    <p className="whitespace-pre-wrap mt-1 leading-relaxed font-sans">{activeMR.remarks}</p>
                  </div>
                </div>
              )}

              {/* Items List inside Modal */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 flex items-center justify-between">
                  <span>RINCIAN DAFTAR MATERIAL SUKU CADANG (TUG 5 CODES)</span>
                  <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-emerald-800 text-[9.5px]">
                    Daftar {activeMR.items.length} Barang
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4 font-black w-12 text-center">No</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Suku Cadang Kapal</th>
                        <th className="py-2.5 px-3 font-semibold">Part Number / SKU</th>
                        <th className="py-2.5 px-3 w-20 text-center font-semibold">Satuan</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Rata2 Pemakaian</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Sisa Stok Sedia</th>
                        <th className="py-2.5 px-3 w-32 text-center font-bold text-blue-800 bg-blue-50/30">Requested Qty</th>
                        <th className="py-2.5 px-3 w-36 text-center font-semibold">Status Barang</th>
                        <th className="py-2.5 px-3 font-semibold">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                      {activeMR.items.map((itm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-900 font-bold">{itm.spare_part_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-650">{itm.part_number}</td>
                          <td className="py-2.5 px-3 text-center uppercase font-mono">{itm.unit}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{itm.avg_monthly_usage !== undefined ? itm.avg_monthly_usage : 1}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{itm.remaining_stock !== undefined ? itm.remaining_stock : 0}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-850 bg-blue-50/10 text-xs">{itm.requested_qty}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border inline-block ${
                              itm.item_status === "Pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : itm.item_status === "Returned"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {itm.item_status === "Pending" ? "Belum Datang" : itm.item_status === "Returned" ? "Diretur" : "Sudah Datang"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans italic text-slate-500">{itm.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3-Level Approval & Signature Stepper */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3 mt-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-black font-display uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Status Persetujuan Berjenjang & Tanda Tangan Digital (3-Level TTD)
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold uppercase">
                    Document Status: {activeMR.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  
                  {/* LEVEL 1: ALFIN (VERIFIKATOR RENDALHAR) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.alfin_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>LEVEL 1: VERIFIKATOR</span>
                        {activeMR.alfin_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Maghfur Muhammad Alfin</div>
                      <div className="text-[10px] text-slate-400">Verifikator Rendalhar</div>
                    </div>

                    {activeMR.alfin_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.alfin_signed_at ? new Date(activeMR.alfin_signed_at).toLocaleString("id-ID") : "Terverifikasi"}
                      </div>
                    ) : (currentUser.username === "alfin" || currentUser.role === UserRole.VERIFIER_RENDALHAR || currentUser.role === UserRole.SUPER_ADMIN) ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            alfin_signed: true,
                            alfin_signed_at: now,
                            alfin_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=MaghfurAlfin",
                            status: activeMR.status === "Draft" ? "Submitted" : activeMR.status
                          });
                        }}
                        className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Setujui & TTD (Alfin)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>alfin</strong> (Verifikator Rendalhar)
                      </div>
                    )}
                  </div>

                  {/* LEVEL 2: EMIR (MANAGER LOGISTIK) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.emir_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>LEVEL 2: MANAGER LOGISTIK</span>
                        {activeMR.emir_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Mohamat Emir Ferdian</div>
                      <div className="text-[10px] text-slate-400">Manager Logistik</div>
                    </div>

                    {activeMR.emir_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.emir_signed_at ? new Date(activeMR.emir_signed_at).toLocaleString("id-ID") : "Terverifikasi"}
                      </div>
                    ) : (currentUser.username === "emir" || currentUser.role === UserRole.LOGISTICS_MANAGER || currentUser.role === UserRole.SUPER_ADMIN) ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            emir_signed: true,
                            emir_signed_at: now,
                            emir_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian"
                          });
                        }}
                        className="mt-3 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Setujui & TTD (Emir)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>emir</strong> (Manager Logistik)
                      </div>
                    )}
                  </div>

                  {/* LEVEL 3: SUMBONO (VP RENDALHAR) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.sumbono_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>LEVEL 3: VP RENDALHAR</span>
                        {activeMR.sumbono_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Sumbono</div>
                      <div className="text-[10px] text-slate-400">VP Rendalhar</div>
                    </div>

                    {activeMR.sumbono_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.sumbono_signed_at ? new Date(activeMR.sumbono_signed_at).toLocaleString("id-ID") : "Disahkan"}
                      </div>
                    ) : (currentUser.username === "sumbono" || currentUser.role === UserRole.VP_RENDALHAR || currentUser.role === UserRole.SUPER_ADMIN) ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            sumbono_signed: true,
                            sumbono_signed_at: now,
                            sumbono_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono",
                            status: "Approved"
                          });
                        }}
                        className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Sahkan & TTD (Sumbono)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>sumbono</strong> (VP Rendalhar)
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Bottom Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-205 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              
              {/* Left Action group: View/Print TUG 5 */}
              <div>
                <button
                  onClick={() => {
                    onPreviewTUG5(activeMR);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-mono font-bold text-xs uppercase rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  Preview & Cetak TUG 5
                </button>
              </div>

              {/* Right Action operational modifiers */}
              <div className="flex gap-2">
                
                {/* Edit for draft and rejected */}
                {["Draft", "Rejected"].includes(activeMR.status) && (
                  <button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleStartEdit(activeMR);
                    }}
                    className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Permintaan
                  </button>
                )}

                {/* Direct Approval for Draft / Submitted */}
                {["Draft", "Submitted"].includes(activeMR.status) && 
                 [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.SUPERINTENDENT].includes(currentUser.role) && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                )}

                {/* Submit for Crew (Draft only) */}
                {activeMR.status === "Draft" && currentUser.role === UserRole.VESSEL_CREW && (
                  <button
                    onClick={async () => {
                      if (confirm(`Submit Material Request ${activeMR.request_number}?`)) {
                        await onUpdateRequest(activeMR.id, { status: "Submitted" });
                        setIsDetailsOpen(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit
                  </button>
                )}

                {/* Dispatch Flow for warehouse */}
                {activeMR.status === "Approved" && (currentUser.role === UserRole.WAREHOUSE_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && (
                  <button
                    onClick={handleMarkProcessed}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-400 font-bold text-xs uppercase rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-slate-900" />
                    Selesaikan Pengiriman
                  </button>
                )}

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-lg transition-colors"
                >
                  Tutup Dialog
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL POPUP: CREATE / EDIT TRANSACTION FORM */}
      {/* ========================================================= */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border border-slate-205 rounded-xl shadow-2xl max-w-5xl w-full font-sans overflow-hidden my-8 flex flex-col max-h-[90vh]">
            
            {/* Modal Form Header */}
            <div className="p-5 border-b border-slate-205 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-display text-slate-950 tracking-wide uppercase">
                  {isCreating ? "Isi Data Permintaan Barang Baru (TUG 5)" : `Edit Dokumen TUG 5 — ${activeMR?.request_number}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  resetForm();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Form Segment 1: Header metadata */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1.5 flex items-center gap-1">
                  <span>1. TUG 5 MATERIAL REQUISITION HEADER</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Col 1 */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Chief Engineer (Pemohon)</label>
                      <input
                        type="text"
                        disabled
                        value={currentUser.name}
                        className="w-full bg-slate-100 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tanggal Permintaan</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block mb-1">Depo Logistik (Gudang)</label>
                      <input
                        type="text"
                        value={warehouseName}
                        onChange={(e) => setWarehouseName(e.target.value)}
                        placeholder="Jakarta HQ Depot"
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block mb-1">Nama Kapal (Vessel Destination)</label>
                      <input
                        type="text"
                        value={vesselName}
                        onChange={(e) => setVesselName(e.target.value)}
                        placeholder="MV. KARTINI BARUNA"
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Col 3 */}
                  <div className="space-y-3 bg-blue-50/20 p-3 rounded-lg border border-blue-100/50">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">No. Perintah Kerja (Work Order)</label>
                      <select
                        value={workOrderRef}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkOrderRef(val);
                          const matchedSPK = spkList.find(s => s.spk_number === val);
                          if (matchedSPK) {
                            if (matchedSPK.vessels.length > 0) {
                              setVesselName(matchedSPK.vessels[0].vessel_name);
                            }
                            if (matchedSPK.target_port) {
                              setDeliveryAddress(`Pelabuhan Target: ${matchedSPK.target_port}`);
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-rose-600 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="">-- HUBUNGKAN DENGAN SPK WMS --</option>
                        {spkList.map(s => (
                          <option key={s.id} value={s.spk_number}>
                            {s.spk_number} &bull; {s.target_port} ({s.status})
                          </option>
                        ))}
                      </select>

                      {(() => {
                        const matchedSPK = spkList.find(s => s.spk_number === workOrderRef);
                        if (!matchedSPK) return null;
                        return (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                            <span className="text-[9px] font-bold text-blue-800 block mb-1 uppercase tracking-tight">
                              ✓ Terdeteksi SPK Aktif!
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                              const totalItemsCount = matchedSPK.vessels.reduce((acc, v) => acc + v.items.length, 0);
                              if (totalItemsCount === 0) {
                                alert("Tidak ditemukan data suku cadang / item kargo di dalam SPK ini.");
                                return;
                              }
                              if (confirm(`Muat seluruh ${totalItemsCount} suku cadang dari semua kapal di dalam SPK ${matchedSPK.spk_number} ke dalam Form TUG 5?`)) {
                                const loadedItems = matchedSPK.vessels.flatMap(v =>
                                  v.items.map(it => {
                                    const matchedPart = parts.find(p => p.id === it.spare_part_id || p.part_number === it.part_number);
                                    return {
                                      spare_part_id: matchedPart?.id || it.spare_part_id,
                                      spare_part_name: matchedPart?.part_name || it.spare_part_name,
                                      part_number: matchedPart?.part_number || it.part_number,
                                      unit: matchedPart?.unit || it.unit,
                                      avg_monthly_usage: 1,
                                      remaining_stock: matchedPart?.current_stock || 0,
                                      requested_qty: it.qty_to_pick,
                                      notes: `Diimpor dari SPK: ${matchedSPK.spk_number} (${v.vessel_name})`
                                    };
                                  })
                                );
                                setFormItems(loadedItems);
                              }
                              }}
                              className="w-full py-1.5 px-3 bg-blue-650 hover:bg-blue-700 text-white font-bold rounded text-[10px] uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                            >
                              ✨ Muat Suku Cadang Dari SPK
                            </button>
                            <span className="text-[8px] text-slate-500 block mt-1 leading-tight">
                              Kapal yang ada dalam SPK: {matchedSPK.vessels.map(v => v.vessel_name).join(", ")}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pb-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kode Akun</label>
                        <input
                          type="text"
                          value={accountCode}
                          onChange={(e) => setAccountCode(e.target.value)}
                          placeholder="e.g. ACC-5400"
                          className="w-full bg-white border border-slate-250 rounded-lg text-xs px-2.5 py-2 font-mono text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fungsi</label>
                        <input
                          type="text"
                          value={functionCode}
                          onChange={(e) => setFunctionCode(e.target.value)}
                          placeholder="e.g. FNC-DEPT"
                          className="w-full bg-white border border-slate-250 rounded-lg text-xs px-2.5 py-2 font-mono text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Alamat Pengantaran Logistik</label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Masukkan dermaga, pelabuhan, agen logistik, dsb..."
                      className="w-full bg-white border border-slate-250 p-2.5 text-xs rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Catatan Tambahan / Urgensi Operasional</label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Catatan tambahan kapal, instruksi loading cargo dsb..."
                      className="w-full bg-white border border-slate-250 p-2.5 text-xs rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Form Segment 2: Spare Parts selector inputs */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-505 border-b border-slate-200 pb-1.5 flex justify-between items-center">
                  <span>2. PILIH SUKU CADANG (SPARE PARTS ENGINE)</span>
                  <span className="text-slate-400 font-medium italic lowercase text-[9px]">live inventory synchronizer</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  
                  {/* Selector dropdown */}
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pilih Suku Cadang</label>
                    <select
                      value={selectedPartId}
                      onChange={(e) => {
                        setSelectedPartId(e.target.value);
                        setItemUsage(1);
                      }}
                      className="w-full bg-white border border-slate-250 text-xs rounded-lg px-2.5 py-2 font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Suku Cadang --</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.part_name} &bull; SKU: {p.sku} (Part No: {p.part_number}) &mdash; Tersedia: {p.current_stock} {p.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity requested block */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kebutuhan (Qty)</label>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Avg Monthly Usage */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rata2/Bulan</label>
                    <input
                      type="number"
                      min={0}
                      value={itemUsage}
                      onChange={(e) => setItemUsage(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Remarks input notes */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Keterangan Item</label>
                    <input
                      type="text"
                      placeholder="e.g. Kritis / Overhaul"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-sans text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Addition trigger button */}
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddFormItem}
                      disabled={!selectedPartId}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 rounded-lg text-xs font-mono font-bold disabled:opacity-40 select-none cursor-pointer text-center"
                    >
                      ADD
                    </button>
                  </div>

                </div>
              </div>

              {/* Form Segment 3: Items Table representation */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 block">
                  DAFTAR GRID ITEM YANG AKAN DISIMPAN
                </h4>

                <div className="border border-slate-205 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4 font-black w-12 text-center">No</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Barang (Ditulis Lengkap)</th>
                        <th className="py-2.5 px-3 font-semibold">Nomor Part / SKU Reference</th>
                        <th className="py-2.5 px-3 w-20 text-center font-semibold">Satuan</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Rerata Guna/Bln</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Sisa Stok Depo</th>
                        <th className="py-2.5 px-3 w-32 text-center font-black text-emerald-600 bg-emerald-50/25 border-x border-slate-200">Kebutuhan</th>
                        <th className="py-2.5 px-3 w-40 font-semibold text-center text-blue-800">Status Kedatangan</th>
                        <th className="py-2.5 px-3 font-semibold">Keterangan Khusus</th>
                        <th className="py-2.5 px-3 w-16 text-center text-rose-600 font-semibold">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {formItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 px-4 text-center text-slate-450 font-mono italic">
                            Belum ada suku cadang ditambahkan. Pilih dan masukkan parts di atas.
                          </td>
                        </tr>
                      ) : (
                        formItems.map((itm, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-900 font-bold">{itm.spare_part_name}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{itm.part_number}</td>
                            <td className="py-2 px-3 text-center font-mono uppercase">{itm.unit}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-550">{itm.avg_monthly_usage}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-500">{itm.remaining_stock}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20 text-xs border-x border-slate-100">{itm.requested_qty}</td>
                            <td className="py-2 px-3 text-center">
                              <select
                                value={itm.item_status || "Arrived"}
                                onChange={(e) => handleUpdateFormItemStatus(idx, e.target.value as any)}
                                className={`text-[11px] font-bold rounded-md px-2 py-1 focus:outline-none focus:ring-1 border cursor-pointer ${
                                  itm.item_status === "Pending"
                                    ? "bg-amber-50 text-amber-800 border-amber-200 focus:ring-amber-500"
                                    : itm.item_status === "Returned"
                                      ? "bg-rose-50 text-rose-800 border-rose-200 focus:ring-rose-500"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500"
                                }`}
                              >
                                <option value="Arrived">Sudah Datang</option>
                                <option value="Pending">Belum Datang</option>
                                <option value="Returned">Diretur</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={itm.notes || ""}
                                onChange={(e) => handleUpdateFormItemNotes(idx, e.target.value)}
                                placeholder="Tulis catatan (opsional)..."
                                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFormItem(idx)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 ml-auto mr-auto" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Form Bottom Footer Panel */}
            <div className="p-4 bg-slate-50 border-t border-slate-205 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-705 text-xs font-bold uppercase rounded-lg hover:bg-slate-55 transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => handleSaveRequest("Draft")}
                className="px-4 py-2 bg-slate-250 border border-slate-350 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveRequest("Submitted")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-505 text-white text-xs font-black uppercase rounded-lg transition-all shadow-md shadow-emerald-100 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Permintaan
              </button>
            </div>

          </div>
        </div>
      )}



      {/* ========================================================= */}
      {/* 7. MODAL POPUP: SPK AUTOMATIC BATCH SYNCHRONIZATION MODAL */}
      {/* ========================================================= */}
      {showSyncConfirmation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-md w-full font-sans overflow-hidden animate-zoom-in">
            <div className="p-4 border-b border-blue-100 bg-blue-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-blue-800 font-black font-display uppercase tracking-wider text-xs">
                <span>⚡ Sinkronisasi Register SPK</span>
              </div>
              <button 
                onClick={() => {
                  if (!isSyncing) setShowSyncConfirmation(false);
                }} 
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                disabled={isSyncing}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-105 rounded-lg flex items-start gap-2.5">
                <span className="text-xl">✨</span>
                <div className="text-xs text-blue-900 leading-relaxed font-semibold">
                  Sistem mendeteksi <span className="font-extrabold text-blue-700">{pendingSyncList.length} Surat Perintah Kerja (SPK)</span> eksternal baru dari WMS yang belum memiliki form TUG 5 (Permintaan Barang) di modul ini.
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 no-print">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pilih SPK yang akan disinkronisasi ({selectedSyncIds.length} terpilih):</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSelectedSyncIds(pendingSyncList.map(s => s.id))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold disabled:opacity-50"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300 text-[10px]">|</span>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSelectedSyncIds([])}
                      className="text-[10px] text-slate-500 hover:text-slate-700 font-bold disabled:opacity-50"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg max-h-[180px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {pendingSyncList.map((spk) => {
                    const totalParts = spk.vessels.reduce((acc, v) => acc + v.items.length, 0);
                    const isChecked = selectedSyncIds.includes(spk.id);
                    return (
                      <div 
                        key={spk.id} 
                        onClick={() => {
                          if (isSyncing) return;
                          if (isChecked) {
                            setSelectedSyncIds(selectedSyncIds.filter(id => id !== spk.id));
                          } else {
                            setSelectedSyncIds([...selectedSyncIds, spk.id]);
                          }
                        }}
                        className={`p-3 flex items-center gap-3 text-xs hover:bg-slate-100 cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div parent onClick for easier mobile/desktop accessibility
                          disabled={isSyncing}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <div className="font-mono font-bold text-slate-800">{spk.spk_number}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{spk.target_port}</div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-blue-100 text-blue-800 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                            {totalParts} Suku Cadang
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200/80 font-semibold">
                Suku cadang, detail kapal, pelabuhan target, dan operator akan terpetakan secara otomatis dan tersimpan dalam status <span className="text-blue-700 font-extrabold">DRAFT</span> yang selanjutnya memerlukan persetujuan dua tingkat (Staff Gudang & Superintendent).
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                disabled={isSyncing}
                onClick={() => setShowSyncConfirmation(false)}
                className="px-4 py-2 border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                Batalkan
              </button>
              <button
                disabled={isSyncing}
                onClick={executeBatchSync}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  isSyncing ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isSyncing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Mensinkronkan...</span>
                  </>
                ) : (
                  <span>Ya, Sinkronkan Sekarang!</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Print ZIP Modal for TUG 5 */}
      <BatchPrintZipModal
        isOpen={isBatchZipModalOpen}
        type="tug5"
        requests={requests}
        signatures={signatures}
        onClose={() => setIsBatchZipModalOpen(false)}
      />

    </div>
  );
}
