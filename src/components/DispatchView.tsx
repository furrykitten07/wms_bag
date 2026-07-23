/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FileText, 
  Search, 
  MapPin, 
  Eye, 
  Box, 
  CheckSquare, 
  Truck, 
  UserCheck, 
  Calendar, 
  ArrowRightCircle, 
  ChevronRight,
  Anchor,
  X,
  Printer,
  FileDown,
  Warehouse,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  SlidersHorizontal,
  FolderArchive,
  ChevronDown
} from "lucide-react";
import { OutboundDispatch, DispatchStatus, UserRole, SparePart, MaterialRequest, SPKWorkOrder, MaterialReturn } from "../types.js";

interface DispatchViewProps {
  dispatchList: OutboundDispatch[];
  parts: SparePart[];
  role: UserRole;
  onUpdateDispatch: (id: string, update: Partial<OutboundDispatch>) => Promise<any>;
  onCreateDispatch: (data: Partial<OutboundDispatch>) => Promise<any>;
  onPreviewDocument: (type: "bon" | "surat_jalan" | "manifest", data: OutboundDispatch) => void;
  requests?: MaterialRequest[];
  spkList?: SPKWorkOrder[];
  onUpdateSPK?: (id: string, spkData: Partial<SPKWorkOrder>) => Promise<any>;
  materialReturns?: MaterialReturn[];
  onUpdateReturn?: (id: string, update: Partial<MaterialReturn>) => Promise<any>;
}

export default function DispatchView({
  dispatchList,
  parts,
  role,
  onUpdateDispatch,
  onCreateDispatch,
  onPreviewDocument,
  requests = [],
  spkList = [],
  onUpdateSPK,
  materialReturns = [],
  onUpdateReturn
}: DispatchViewProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "archive">("queue");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vesselFilter, setVesselFilter] = useState("All");

  // Outbound Pagination states
  const [dspPage, setDspPage] = useState(1);
  const dspPerPage = 6;

  React.useEffect(() => {
    setDspPage(1);
  }, [search, statusFilter, vesselFilter, activeTab]);

  const [selectedDispatch, setSelectedDispatch] = useState<OutboundDispatch | null>(null);

  // Editable parameters during transit updates
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [driverPic, setDriverPic] = useState("");
  const [warehouseName, setWarehouseName] = useState("Gudang Merak");
  const [deliveryDestination, setDeliveryDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchStatusFlg, setDispatchStatusFlg] = useState<DispatchStatus>(DispatchStatus.DRAFT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States for Create Dispatch Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dispatchSource, setDispatchSource] = useState<"tug5" | "tug10">("tug5");
  const [selectedTug5Id, setSelectedTug5Id] = useState("");
  const [selectedTug10Id, setSelectedTug10Id] = useState("");
  const [targetVesselName, setTargetVesselName] = useState("");
  const [cName, setCName] = useState("Internal Cargo");
  const [tNumber, setTNumber] = useState("");
  const [dPic, setDPic] = useState("");
  const [notesText, setNotesText] = useState("");
  const [wName, setWName] = useState("GUDANG UTAMA");
  const [dDest, setDDest] = useState("Port Agent / Vessel Side");

  const [dispatchItems, setDispatchItems] = useState<any[]>([]);

  React.useEffect(() => {
    if (dispatchSource === "tug5" && selectedTug5Id && requests) {
      const selectedMR = requests.find(r => r.id === selectedTug5Id);
      if (selectedMR) {
        setWName(selectedMR.warehouse_name || "GUDANG UTAMA");
        setDDest(selectedMR.delivery_address || "Port Agent / Vessel Side");
        setNotesText(selectedMR.remarks || "");
        
        const items = selectedMR.items.map(itm => {
          const isSent = !(itm.item_status === "Pending" || itm.item_status === "Returned");
          return {
            spare_part_id: itm.spare_part_id,
            spare_part_name: itm.spare_part_name,
            part_number: itm.part_number,
            qty_requested: itm.requested_qty || 1,
            qty_approved: itm.requested_qty || 1,
            qty_dispatched: isSent ? (itm.requested_qty || 1) : 0,
            qty_remaining: isSent ? 0 : (itm.requested_qty || 1),
            unit: itm.unit || "PCS",
            unit_price: (itm as any).unit_price || 150000,
            notes: (itm.item_status === "Pending" ? "[BELUM DATANG] " : itm.item_status === "Returned" ? "[DIRETUR] " : "") + (itm.notes || "")
          };
        });
        setDispatchItems(items);
      }
    } else if (!selectedTug5Id && dispatchSource === "tug5") {
      setDispatchItems([]);
    }
  }, [selectedTug5Id, dispatchSource, requests]);

  React.useEffect(() => {
    if (dispatchSource === "tug10" && selectedTug10Id && materialReturns) {
      const selectedReturn = materialReturns.find(r => r.id === selectedTug10Id);
      if (selectedReturn) {
        setWName(selectedReturn.warehouse_name || "GUDANG PENURUNAN");
        setDDest("Target Vessel Side");
        setNotesText(`[TRANSFER ANTAR KAPAL] Penurunan barang dari kapal ${selectedReturn.vessel_name} via TUG 10 [${selectedReturn.return_number}]. ` + (selectedReturn.notes || ""));
        
        const items = selectedReturn.items.map(itm => {
          return {
            spare_part_id: itm.spare_part_id,
            spare_part_name: itm.part_name,
            part_number: itm.part_number,
            qty_requested: itm.qty_returned,
            qty_approved: itm.qty_returned,
            qty_dispatched: itm.qty_returned,
            qty_remaining: 0,
            unit: itm.unit || "PCS",
            unit_price: (itm as any).unit_price || 150000,
            notes: `[TRANSFER DARI KAPAL ${selectedReturn.vessel_name.toUpperCase()}] ` + (itm.notes || "")
          };
        });
        setDispatchItems(items);
      }
    } else if (!selectedTug10Id && dispatchSource === "tug10") {
      setDispatchItems([]);
    }
  }, [selectedTug10Id, dispatchSource, materialReturns]);

  const handleCreateDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (dispatchSource === "tug5") {
        if (!selectedTug5Id) {
          alert("Silakan pilih dokumen Permintaan Barang (TUG 5) terlebih dahulu.");
          setIsLoading(false);
          return;
        }
        const selectedMR = requests.find(r => r.id === selectedTug5Id);
        if (!selectedMR) {
          alert("Dokumen TUG 5 tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        const hasIncompleteItems = selectedMR.items.some(
          itm => itm.item_status === "Pending" || itm.item_status === "Returned"
        );

        const payload: Partial<OutboundDispatch> = {
          request_reference: selectedMR.request_number,
          vessel_name: selectedMR.vessel_name,
          warehouse_name: wName,
          delivery_destination: dDest,
          notes: notesText,
          courier_name: cName,
          tracking_number: tNumber,
          driver_pic: dPic,
          work_order_ref: selectedMR.work_order_ref || "",
          account_code: selectedMR.account_code || "BPP",
          function_code: selectedMR.function_code || "ARMADA",
          items: dispatchItems
        };

        const createdDisp = await onCreateDispatch(payload);

        // Automatically update the corresponding SPK status
        if (selectedMR.work_order_ref && spkList && onUpdateSPK) {
          const matchedSPK = spkList.find(s => s.spk_number === selectedMR.work_order_ref);
          if (matchedSPK) {
            const newSpkStatus = hasIncompleteItems ? "Incomplete" : "Dispatched";
            await onUpdateSPK(matchedSPK.id, { status: newSpkStatus });
          }
        }

        setIsCreateModalOpen(false);
        // Reset state values
        setSelectedTug5Id("");
        setDispatchItems([]);
        setCName("Internal Cargo");
        setTNumber("");
        setDPic("");
        setNotesText("");
        setWName("GUDANG UTAMA");
        setDDest("Port Agent / Vessel Side");

        let successMsg = "Pengiriman (TUG 8) berhasil dibuat dan disinkronisasikan!";
        if (selectedMR.work_order_ref) {
          successMsg += hasIncompleteItems 
            ? `\n\n⚠️ Karena beberapa barang belum lengkap, status SPK ${selectedMR.work_order_ref} telah di-update menjadi INCOMPLETE.`
            : `\n\n✓ Seluruh kargo lengkap, status SPK ${selectedMR.work_order_ref} telah di-update menjadi DISPATCHED.`;
        }
        alert(successMsg);
      } else {
        // dispatchSource === "tug10"
        if (!selectedTug10Id) {
          alert("Silakan pilih dokumen Bon Pengembalian (TUG 10) terlebih dahulu.");
          setIsLoading(false);
          return;
        }
        if (!targetVesselName.trim()) {
          alert("Silakan masukkan Nama Kapal Tujuan Transfer.");
          setIsLoading(false);
          return;
        }
        const selectedReturn = materialReturns.find(r => r.id === selectedTug10Id);
        if (!selectedReturn) {
          alert("Dokumen TUG 10 tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        const payload: Partial<OutboundDispatch> = {
          request_reference: selectedReturn.return_number,
          vessel_name: targetVesselName.trim(),
          warehouse_name: wName,
          delivery_destination: dDest,
          notes: notesText,
          courier_name: cName,
          tracking_number: tNumber,
          driver_pic: dPic,
          work_order_ref: selectedReturn.work_order_number || selectedReturn.spk_number || "",
          account_code: selectedReturn.account_code || "BPP",
          function_code: selectedReturn.function_code || "ARMADA",
          items: dispatchItems
        };

        const createdDisp = await onCreateDispatch(payload);

        // Update the TUG 10 return document status to Completed
        if (onUpdateReturn) {
          const dispNum = createdDisp?.dispatch_number || "DSP-V2V";
          await onUpdateReturn(selectedReturn.id, {
            status: "Completed",
            dispatch_reference: dispNum,
            notes: (selectedReturn.notes || "") + `\n[SINKRONISASI] Ditransfer ke kapal ${targetVesselName} dengan TUG 8: ${dispNum}`
          });
        }

        setIsCreateModalOpen(false);
        // Reset state values
        setSelectedTug10Id("");
        setDispatchItems([]);
        setTargetVesselName("");
        setDispatchSource("tug5");
        setCName("Internal Cargo");
        setTNumber("");
        setDPic("");
        setNotesText("");
        setWName("GUDANG UTAMA");
        setDDest("Port Agent / Vessel Side");

        alert(`Transfer Antar Kapal Berhasil!\n\nDokumen Pengiriman TUG 8 telah terbit untuk kapal ${targetVesselName.trim()} dan terhubung dengan penurunan barang kapal ${selectedReturn.vessel_name} (TUG 10: ${selectedReturn.return_number}).\nStatus dokumen TUG 10 otomatis diubah menjadi COMPLETED.`);
      }
    } catch (err: any) {
      alert("Gagal membuat pengiriman: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse location coordinates realistically for any spare part
  const getShelfCoordinates = (p: SparePart) => {
    const zones = ["Zone A (Heavy Mechanical)", "Zone B (Consumables)", "Zone C (Pipes & Fittings)", "Zone D (Auxiliary Spares)"];
    const textHash = p.sku || p.part_number || "A";
    const zoneIdx = Math.abs(textHash.charCodeAt(0) % zones.length);
    const rackNum = String(Math.abs((textHash.charCodeAt(1) || 1) % 5) + 1).padStart(2, "0");
    const lvlNum = String(Math.abs((textHash.charCodeAt(2) || 2) % 4) + 1).padStart(2, "0");
    const binNum = String(Math.abs((textHash.charCodeAt(3) || 3) % 20) + 1).padStart(2, "0");
    
    return {
      zone: zones[zoneIdx],
      rack: rackNum,
      level: lvlNum,
      bin: binNum,
      locationCode: `${zones[zoneIdx].split(" ")[1].substring(0, 1)}-R${rackNum}-L${lvlNum}-B${binNum}`
    };
  };

  const handleOpenUpdateModal = (dsp: OutboundDispatch) => {
    setSelectedDispatch(dsp);
    setCourierName(dsp.courier_name || "");
    setTrackingNumber(dsp.tracking_number || "");
    setDriverPic(dsp.driver_pic || "");
    setWarehouseName(dsp.warehouse_name || "Gudang Merak");
    setDeliveryDestination(dsp.delivery_destination || "");
    setNotes(dsp.notes || "");
    setDispatchStatusFlg(dsp.status);
    setErrorMessage(null);
  };

  const handleCommitDispatchUpdate = async () => {
    if (!selectedDispatch) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await onUpdateDispatch(selectedDispatch.id, {
        status: dispatchStatusFlg,
        courier_name: courierName,
        tracking_number: trackingNumber,
        driver_pic: driverPic,
        warehouse_name: warehouseName,
        delivery_destination: deliveryDestination,
        notes: notes
      });
      setSelectedDispatch(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui status pengiriman.");
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique lists of vessels for filters
  const uniqueVessels = Array.from(new Set(dispatchList.map(d => d.vessel_name))).filter(Boolean);

  // Filtering dispatches
  const filtered = dispatchList.filter(d => {
    const isQueue = activeTab === "queue" ? d.status !== DispatchStatus.DELIVERED && d.status !== DispatchStatus.COMPLETED && d.status !== "Completed" as any : d.status === DispatchStatus.DELIVERED || d.status === DispatchStatus.COMPLETED || d.status === "Completed" as any;
    
    const matchesSearch = 
      d.vessel_name.toLowerCase().includes(search.toLowerCase()) || 
      (d.dispatch_number && d.dispatch_number.toLowerCase().includes(search.toLowerCase())) || 
      (d.tug8_number && d.tug8_number.toLowerCase().includes(search.toLowerCase())) || 
      d.request_reference.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    const matchesVessel = vesselFilter === "All" || d.vessel_name === vesselFilter;

    return isQueue && matchesSearch && matchesStatus && matchesVessel;
  });

  const dspTotalPages = Math.ceil(filtered.length / dspPerPage) || 1;
  const paginatedDsp = filtered.slice((dspPage - 1) * dspPerPage, dspPage * dspPerPage);

  const statsActiveCount = dispatchList.filter(d => d.status !== DispatchStatus.DELIVERED && d.status !== DispatchStatus.COMPLETED && d.status !== "Completed" as any).length;
  const statsDraftCount = dispatchList.filter(d => d.status === DispatchStatus.DRAFT).length;
  const statsTransitCount = dispatchList.filter(d => d.status === DispatchStatus.DISPATCHED).length;
  const statsArchiveCount = dispatchList.filter(d => d.status === DispatchStatus.DELIVERED || d.status === DispatchStatus.COMPLETED || d.status === "Completed" as any).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* Upper Brand / Title Area */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs no-print">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-blue-600" /> Dispatch & Outbound Logistics (TUG 8)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Manage Picking, Packaging, Stock Allocations, and view archived Bon Pengeluaran issue slips
          </p>
        </div>

        {/* Operational Flow Stats & Action Button */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-slate-450 block uppercase font-black">Drafts</span>
              <span className="text-xs font-black text-slate-700">{statsDraftCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-blue-500 block uppercase font-black">In Progress</span>
              <span className="text-xs font-black text-blue-600">{statsActiveCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-orange-500 block uppercase font-black">On Transit</span>
              <span className="text-xs font-black text-orange-600">{statsTransitCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-green-500 block uppercase font-black">Delivered</span>
              <span className="text-xs font-black text-green-600">{statsArchiveCount}</span>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-extrabold px-5 py-3 rounded-lg shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer font-sans"
          >
            <Truck className="w-4 h-4" /> Tambah Dispatch (TUG 8)
          </button>
        </div>
      </div>

      {/* Navigation Subtabs (Active Queue vs Document Archive) */}
      <div className="flex gap-4 border-b border-slate-200 bg-white px-6 shrink-0 no-print">
        <button
          onClick={() => { setActiveTab("queue"); setDspPage(1); }}
          className={`py-3.5 text-xs uppercase font-mono font-bold border-b-2 tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "queue" 
              ? "border-blue-600 text-blue-700" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Active Dispatch Queue ({statsActiveCount})
        </button>
        <button
          onClick={() => { setActiveTab("archive"); setDspPage(1); }}
          className={`py-3.5 text-xs uppercase font-mono font-bold border-b-2 tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "archive" 
              ? "border-blue-600 text-blue-700" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          TUG 8 Document Archive ({statsArchiveCount})
        </button>
      </div>

      {/* Searching & Analytical Filters */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs no-print">
        
        {/* Keyword */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari kapal, nomor TUG 8, nomor dispatch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Status</option>
              {activeTab === "queue" ? (
                <>
                  <option value={DispatchStatus.DRAFT}>Draft</option>
                  <option value={DispatchStatus.PICKING}>Picking</option>
                  <option value={DispatchStatus.PACKED}>Packed</option>
                  <option value={DispatchStatus.READY_TO_DISPATCH}>Ready To Dispatch</option>
                  <option value={DispatchStatus.DISPATCHED}>Dispatched</option>
                </>
              ) : (
                <>
                  <option value={DispatchStatus.DELIVERED}>Delivered</option>
                  <option value={DispatchStatus.COMPLETED}>Completed</option>
                </>
              )}
            </select>
          </div>

          {/* Vessel Filter */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <Anchor className="w-3.5 h-3.5 text-slate-400" />
            <span>Vessel:</span>
            <select
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Kapal</option>
              {uniqueVessels.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

        </div>
      </section>

      {/* Main Table Segment */}
      <section className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Box className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase font-mono tracking-widest text-slate-705">
              {activeTab === "queue" ? "Antrean Pengiriman Aktif (Inbound-to-Outbound)" : "Dokumen TUG 8 Terbit & Kearsipan (Completed Delivery)"}
            </span>
          </div>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
            Total Enrols: {filtered.length}
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 italic font-mono uppercase">
                {activeTab === "queue" 
                  ? "Tidak ada antrean pengiriman aktif yang cocok dengan kriteria." 
                  : "Belum ada dokumen TUG 8 yang dikeluarkan/diselesaikan."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 text-[10px] font-mono font-extrabold text-slate-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-3.5 w-10 text-center bg-slate-50">NO</th>
                  <th className="p-3.5">Detail</th>
                  <th className="p-3.5">No. TUG 8 (Spare Part Note)</th>
                  <th className="p-3.5">No. Dispatch/Carrier</th>
                  <th className="p-3.5">Fisik Suku Cadang</th>
                  <th className="p-3.5">Alokasi Driver / PIC</th>
                  <th className="p-3.5 text-center">Metode Kurir</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right no-print">Dokumen TUG 8 / Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedDsp.map((item, idx) => {
                  const itemsCount = item.items.length;
                  const partsSummary = item.items.map(i => `${i.qty_dispatched || i.qty_requested}x ${i.part_number}`).join(", ");

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors font-semibold">
                      
                      {/* NO */}
                      <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{(dspPage - 1) * dspPerPage + idx + 1}</td>
                      
                      {/* Shipping particulars */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {item.vessel_name}
                        </div>
                        <div className="text-[10px] text-slate-450 mt-1 flex flex-col gap-0.5">
                          <span className="font-mono text-[9px] uppercase">Ref TUG 5: <span className="font-bold text-blue-800">{item.request_reference}</span></span>
                          <span className="font-sans italic">Dest: {item.delivery_destination || "Sesuai alamat TUG 5"}</span>
                        </div>
                      </td>

                      {/* TUG 8 Number */}
                      <td className="p-3.5">
                        <span className="font-mono text-xs font-black text-rose-800 bg-rose-50 border border-rose-100 rounded px-2 py-0.5 block w-fit">
                          {item.tug8_number || item.bon_pengeluaran_number || "AWAITING"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block">Tgl. Terbit: {item.dispatch_date ? new Date(item.dispatch_date).toLocaleDateString("id-ID") : "-"}</span>
                      </td>

                      {/* Dispatch No */}
                      <td className="p-3.5 font-mono text-xs">
                        <span className="font-bold text-slate-700 block">{item.dispatch_number || "DSP-PENDING"}</span>
                        <span className="text-[10px] text-slate-400 font-normal">SJL: {item.surat_jalan_number || "Awaiting"}</span>
                      </td>

                      {/* Spare parts count & summary */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Box className="w-3 h-3 text-slate-400" />
                          {itemsCount} Item Suku Cadang
                        </div>
                        <p className="text-[10px] text-slate-450 mt-1 font-mono tracking-tight leading-snug truncate animate-none" title={partsSummary}>
                          {partsSummary}
                        </p>
                      </td>

                      {/* Driver PIC */}
                      <td className="p-3.5 font-sans">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {item.driver_pic || <span className="text-slate-400 font-normal italic">Belum dialokasi</span>}
                        </div>
                        <span className="font-mono text-[9px] text-slate-400 mt-0.5 block uppercase">Asal: {item.warehouse_name || "Gudang Utama"}</span>
                      </td>

                      {/* Transporter */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="font-bold text-slate-800 text-[11px] block">{item.courier_name || "Self Pick-Up"}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{item.tracking_number || "Tanpa resi"}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider shadow-2xs inline-block border ${
                          item.status === DispatchStatus.DRAFT ? "bg-slate-100 text-slate-700 border-slate-200"
                          : item.status === DispatchStatus.PICKING ? "bg-amber-100 text-amber-800 border-amber-250 font-black"
                          : item.status === DispatchStatus.PACKED ? "bg-indigo-100 text-indigo-800 border-indigo-250"
                          : item.status === DispatchStatus.READY_TO_DISPATCH || item.status === "Ready To Dispatch" as any ? "bg-blue-100 text-blue-800 border-blue-250 animate-pulse"
                          : item.status === DispatchStatus.DISPATCHED ? "bg-orange-100 text-orange-800 border-orange-250 font-black"
                          : "bg-emerald-100 text-emerald-800 border-emerald-250"
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right no-print relative">
                        <div className="flex items-center justify-end">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionId(activeActionId === item.id ? null : item.id);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer border border-slate-850"
                            >
                              <span>Actions</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {activeActionId === item.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(null);
                                  }}
                                />
                                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-250 rounded-lg shadow-xl z-50 overflow-hidden text-left py-1.5 text-slate-700 animate-in fade-in duration-100 ring-1 ring-black/5">
                                  {role !== UserRole.VESSEL_CREW ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        handleOpenUpdateModal(item);
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                    >
                                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Update Status</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        handleOpenUpdateModal(item);
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-550" />
                                      <span>Lihat Detail</span>
                                    </button>
                                  )}

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionId(null);
                                      onPreviewDocument("bon", item);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Cetak TUG 8 Note</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionId(null);
                                      onPreviewDocument("surat_jalan", item);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Cetak Surat Jalan</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination segment */}
        <div className="bg-white border-t border-slate-200 px-6 py-4.5 flex items-center justify-between font-mono text-[11px] font-bold shrink-0 shadow-2xs no-print">
          <span className="text-slate-450 uppercase tracking-widest leading-none text-[10px] font-black">
            TOTAL REKOR DATA: {filtered.length} OUTBOUND
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={dspPage === 1}
              onClick={() => setDspPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-slate-500">
              Halaman {dspPage} dari {dspTotalPages || 1}
            </span>
            <button
              disabled={dspPage === dspTotalPages || dspTotalPages <= 1}
              onClick={() => setDspPage(p => Math.min(dspTotalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </section>

      {/* CORE CONTROLLER & PICKING COMPONENT MODAL */}
      {selectedDispatch && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-850 rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col my-8">
            
            {/* Modal Title bar */}
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                <h3 className="font-display font-black text-xs uppercase tracking-widest">
                  Outbound Logistics Dispatch Control Center (Ref: {selectedDispatch.dispatch_number})
                </h3>
              </div>
              <button onClick={() => setSelectedDispatch(null)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Modal Body (Split Side-by-Side: Form and Pick Verification Layout) */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[75vh]">
              
              {/* Left Side: Header parameters and routing states (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-xs uppercase font-mono font-bold tracking-widest text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-1">
                  <ClipboardList className="w-4 h-4 text-slate-400" /> 1. Parameter Formulir
                </h4>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-[11px] p-3 rounded flex items-start gap-2 select-none font-sans">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gagal Menyimpan:</span> {errorMessage}
                    </div>
                  </div>
                )}

                {/* General Card Information Info Box */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-1.5 select-none text-slate-600">
                  <div className="flex justify-between border-b border-slate-150 pb-1.5 mb-1.5">
                    <span className="font-mono text-[9px] font-bold text-slate-400">Kapal Tujuan (Vessel)</span>
                    <span className="font-bold text-slate-900">⚓ {selectedDispatch.vessel_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No. TUG 8:</span>
                    <span className="font-mono font-bold text-rose-800">{selectedDispatch.tug8_number || "AWAITING"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Request Ref:</span>
                    <span className="font-mono font-bold text-blue-700">{selectedDispatch.request_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinated By:</span>
                    <span>{selectedDispatch.created_by}</span>
                  </div>
                </div>

                {role === UserRole.VESSEL_CREW ? (
                  // Read-Only view for crew
                  <div className="space-y-3 font-medium text-slate-805">
                    <div className="bg-slate-50 p-3 rounded space-y-2">
                      <p className="font-bold font-mono text-[9px] uppercase text-slate-400">Status & Driver Logs</p>
                      <div><strong>Current Status:</strong> {selectedDispatch.status}</div>
                      <div><strong>Transporter:</strong> {selectedDispatch.courier_name || "Internal Dispatch"}</div>
                      <div><strong>Driver / PIC Allocated:</strong> {selectedDispatch.driver_pic || "N/A"}</div>
                      <div><strong>Cargo Tracker No:</strong> {selectedDispatch.tracking_number || "None"}</div>
                      <div><strong>Depot Dispatching Warehouse:</strong> {selectedDispatch.warehouse_name || "Gudang Utama"}</div>
                      <div><strong>Notes/Remarks:</strong> {selectedDispatch.notes || "-"}</div>
                    </div>
                  </div>
                ) : (
                  // Full inputs for coordinators
                  <div className="space-y-3">
                    
                    {/* Status Select */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Outbound State Transitions
                      </label>
                      <select
                        value={dispatchStatusFlg}
                        disabled={isLoading}
                        onChange={(e) => setDispatchStatusFlg(e.target.value as DispatchStatus)}
                        className="w-full bg-slate-50 border border-slate-250 p-2.5 rounded text-xs font-bold font-mono tracking-tight text-slate-800 cursor-pointer"
                      >
                        <option value={DispatchStatus.DRAFT}>Draft (Surat Perintah Keluar Baru)</option>
                        <option value={DispatchStatus.PICKING}>Picking (Pengambilan Suku Cadang dari Rak)</option>
                        <option value={DispatchStatus.PACKED}>Packed (Pengemasan & Seal Logistik Cargo)</option>
                        <option value={DispatchStatus.READY_TO_DISPATCH}>Ready To Dispatch (Kesiapan Muat Transporter)</option>
                        <option value={DispatchStatus.DISPATCHED}>Dispatched (Kargo Berangkat - Potong Stok Gudang)</option>
                        <option value={DispatchStatus.DELIVERED}>Delivered (Telah Diterima Onboard & TTD)</option>
                        <option value={DispatchStatus.COMPLETED}>Completed (Tutup Kasus Pengeluaran)</option>
                      </select>
                      {dispatchStatusFlg === DispatchStatus.DISPATCHED && (
                        <p className="text-[9.5px] text-amber-600 font-mono font-bold mt-1 leading-relaxed border-l-2 border-amber-500 pl-2 italic">
                          ⚠️ Status DISPATCHED secara resmi memotong Stok Fisik suku cadang pada WMS dan mencatat histori Kartu Stok (Ledger / Mutasi). Sisa kuota akan dicadangkan.
                        </p>
                      )}
                    </div>

                    {/* Warehouse Name input */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Asal Depot / Gudang WMS
                      </label>
                      <select
                        value={warehouseName}
                        disabled={isLoading}
                        onChange={(e) => setWarehouseName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      >
                        <option value="Gudang Merak">Gudang Merak</option>
                        <option value="Tanjung Priok Supply Depot">Tanjung Priok Supply Depot</option>
                        <option value="Surabaya Surabaya Transit Hub">Surabaya Transit Hub</option>
                        <option value="Batam Free Trade Storehouse">Batam Free Trade Storehouse</option>
                      </select>
                    </div>

                    {/* Delivery Destination */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Alamat / Dermaga Tujuan (Delivery Destination)
                      </label>
                      <input
                        type="text"
                        value={deliveryDestination}
                        disabled={isLoading}
                        onChange={(e) => setDeliveryDestination(e.target.value)}
                        placeholder="e.g. Dermaga 115 Terminal Tanjung Priok"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      />
                    </div>

                    {/* Courier Name */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Kurir Logistik / Transporter
                      </label>
                      <input
                        type="text"
                        value={courierName}
                        disabled={isLoading}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. PT Pelayaran Bahtera Adhiguna Launch, DHL, JNE"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      />
                    </div>

                    {/* Tracking Number */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Nomor Seri Resi Transit (Tracking No.)
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        disabled={isLoading}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. BPB-TRACE-59114"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-mono font-bold text-slate-800"
                      />
                    </div>

                    {/* Driver PIC */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Driver / Kurir PIC (Penerima Tugas)
                      </label>
                      <input
                        type="text"
                        value={driverPic}
                        disabled={isLoading}
                        onChange={(e) => setDriverPic(e.target.value)}
                        placeholder="e.g. Bambang Triyono (Driver Mobil Box)"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      />
                    </div>

                    {/* Notes / Special remarks */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Catatan Operasional / Surat Pengantar
                      </label>
                      <textarea
                        value={notes}
                        disabled={isLoading}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Keterangan tambatan kapal atau instruksi penyimpanan spesifik suku cadang..."
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                  </div>
                )}
              </div>

              {/* Right Side: Interactive WMS Picking Sheet with real coordinates & stock checking (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                  <h4 className="text-xs uppercase font-mono font-bold tracking-widest text-slate-800 flex items-center gap-1">
                    <CheckSquare className="w-4 h-4 text-orange-500" /> 2. Lembar Picking Suku Cadang (WMS Helper)
                  </h4>
                  <span className="text-[9.5px] text-slate-400 font-mono uppercase bg-slate-100 px-2 py-0.5 rounded font-bold">Automatic Allocation</span>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  Karyawan Gudang (Warehouse Operator) menggunakan informasi layout koordinat di bawah untuk mengumpulkan suku cadang sedia ada di rak fisik:
                </p>

                {/* Grid Item Cards of Suku Cadang */}
                <div className="space-y-3">
                  {selectedDispatch.items.map((itm, idx) => {
                    // Match parts state
                    const actualPart = parts.find(p => p.id === itm.spare_part_id);
                    const coords = actualPart ? getShelfCoordinates(actualPart) : {
                      zone: "Zone A (General)",
                      rack: "01",
                      level: "01",
                      bin: "02",
                      locationCode: "A-R01-L01-B02"
                    };

                    const currentStock = actualPart ? actualPart.current_stock : 0;
                    const stockIsLow = currentStock < itm.qty_dispatched;

                    return (
                      <div 
                        key={itm.spare_part_id || idx} 
                        className={`border rounded-lg p-4 font-sans relative transition-all shadow-2xs hover:shadow-xs bg-white ${
                          stockIsLow ? "border-red-200 bg-red-50/20" : "border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
                          
                          {/* Part Details */}
                          <div>
                            <span className="font-mono text-[9px] uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">ITEM #{idx+1}</span>
                            <h5 className="font-extrabold text-slate-900 text-sm mt-1">{itm.spare_part_name}</h5>
                            <p className="font-mono text-[10.5px] text-slate-450 mt-0.5">Part No: {itm.part_number} | Satuan: {itm.unit || "PCS"}</p>
                            
                            {/* Material Layout Coordinate */}
                            <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-md p-2.5 flex items-center gap-4 text-xs font-mono select-none">
                              <div>
                                <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Lokasi Rak Mekanik</span>
                                <span className="font-bold text-blue-800 text-[11px] flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  {coords.locationCode}
                                </span>
                              </div>
                              <div className="border-l border-blue-200 pl-3 leading-normal text-[10px] text-slate-500">
                                <div>Zona: {coords.zone}</div>
                                <div>Rack: {coords.rack} · Level: {coords.level} · Bin: {coords.bin}</div>
                              </div>
                            </div>
                          </div>

                          {/* Inventory Volumes */}
                          <div className="text-right flex md:flex-col justify-between items-center md:items-end gap-3 self-stretch shrink-0 md:border-l border-slate-150 md:pl-4 min-w-[120px]">
                            
                            {/* Stock Available */}
                            <div className="font-mono text-xs">
                              <span className="text-[8.5px] text-slate-400 block uppercase font-bold tracking-wider leading-none">Stok Fisik Gudang</span>
                              <span className={`text-base font-black ${stockIsLow ? "text-red-650" : "text-slate-905"}`}>{currentStock}</span>
                              <span className="text-[9px] text-slate-405 font-medium ml-1">tersedia</span>
                            </div>

                            {/* Picking quantity */}
                            <div className="font-mono text-xs bg-slate-50 p-1.5 border border-slate-200 rounded text-center min-w-[100px]">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold leading-none mb-1">Jumlah Di-Cetak</span>
                              <span className="text-sm font-black text-rose-700">{itm.qty_dispatched}</span>
                              <span className="font-sans text-[8px] text-slate-500 block uppercase font-normal mt-0.5">Approved: {itm.qty_requested}</span>
                            </div>

                          </div>
                        </div>

                        {/* Negative stock warnings */}
                        {stockIsLow && (
                          <div className="mt-3 bg-red-100 border border-red-200 text-red-800 text-[10px] p-2.5 rounded font-mono font-bold uppercase tracking-wide flex items-center gap-1.5 animate-bounce select-none">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>STOK TIDAK MENCUKUPI! SYSTEM GUDANG AKAN MEMBLOKIR TRANSAKSI OUTBOUND INI.</span>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                {/* Timeline History of transition */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-3">
                    <History className="w-4 h-4 text-violet-500" /> Catatan Histori Logistik Kargo (Live Tracker)
                  </h5>

                  <div className="relative border-l border-slate-200 ml-3 pl-5 space-y-4 font-sans text-[11px] leading-relaxed select-none">
                    
                    {/* Step Delivered */}
                    {selectedDispatch.status === DispatchStatus.DELIVERED && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-0.5 bg-green-500 text-white rounded-full p-0.5 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs uppercase">Cargo Delivered</strong>
                          <p className="text-slate-505">Spares successfully loaded and confirmed signed off onboard target vessel by ship officers.</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded">Action: Completed Signoff</span>
                        </div>
                      </div>
                    )}

                    {/* Step Dispatched */}
                    {["Dispatched", "Delivered", "Completed"].includes(selectedDispatch.status) && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-0.5 bg-orange-500 text-white rounded-full p-0.5 flex items-center justify-center">
                          <Truck className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs uppercase">Released (Dispatched)</strong>
                          <p className="text-slate-505">Transporter loaded with the sealed consignments and officially cleared depot gate. Warehouse physical stock deducted.</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded">Carrier: {selectedDispatch.courier_name} (Resi: {selectedDispatch.tracking_number || "Tanpa Resi"})</span>
                        </div>
                      </div>
                    )}

                    {/* Step Picking / Packed */}
                    {["Picking", "Packed", "Ready To Dispatch", "Dispatched", "Delivered", "Completed"].includes(selectedDispatch.status) && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-0.5 bg-blue-500 text-white rounded-full p-0.5 flex items-center justify-center">
                          <Box className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs uppercase">Prepared (Picked & Packed)</strong>
                          <p className="text-slate-505">Items localized on designated WMS coordinates and carefully packaged in sealed shipping crates.</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5">Assigned Warehouse: {selectedDispatch.warehouse_name || "Headquarters"}</span>
                        </div>
                      </div>
                    )}

                    {/* Step Created Draft */}
                    <div className="relative">
                      <span className="absolute -left-[25px] top-0.5 bg-slate-700 text-white rounded-full p-0.5 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <strong className="text-slate-900 block font-bold text-xs uppercase">Outbound Transaction Initiated (Draft)</strong>
                        <p className="text-slate-505">Automatically generated in Draft upon Material Request (TUG 5) approval. Connected to requirements seamlessly.</p>
                        <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5">Initiator: {selectedDispatch.created_by}</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* Modal Bottom toolbar (Action buttons) */}
            <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 no-print font-mono">
              
              {/* Left side printer bypass */}
              <div className="flex gap-2.5 items-center w-full sm:w-auto">
                <button
                  onClick={() => {
                    onPreviewDocument("bon", selectedDispatch);
                    setSelectedDispatch(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-700 hover:bg-rose-600 font-mono font-bold text-[10.5px] uppercase rounded-md text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-rose-300" /> Preview & Cetak TUG 8
                </button>
                <button
                  onClick={() => {
                    onPreviewDocument("surat_jalan", selectedDispatch);
                    setSelectedDispatch(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 font-mono font-bold text-[10.5px] uppercase rounded-md text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Preview Surat Jalan
                </button>
              </div>

              {/* Right side Commit buttons */}
              <div className="flex justify-end gap-3 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSelectedDispatch(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-751 text-slate-300 font-bold uppercase rounded-md text-xs cursor-pointer transition-colors text-center"
                >
                  Close Detail Panel
                </button>
                
                {role !== UserRole.VESSEL_CREW && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleCommitDispatchUpdate}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold uppercase rounded-md text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? "Saving Data..." : "Commit Changes"}
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 4. CREATE DISPATCH MODAL (TUG 8 CREATION & TUG 5 INTEGRATION) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/15 rounded text-blue-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-sans uppercase tracking-wider">
                    Tambah Dispatch / Pengiriman Baru (TUG 8)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Membuat dokumen pengiriman TUG 8 terintegrasi data Permintaan Barang TUG 5
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateDispatchSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* SOURCE SELECTOR TABS */}
                <div className="grid grid-cols-2 gap-4 bg-slate-100 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchSource("tug5");
                      setSelectedTug10Id("");
                    }}
                    className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                      dispatchSource === "tug5"
                        ? "bg-white text-blue-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    📦 Sumber TUG 5 (Permintaan Kapal)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchSource("tug10");
                      setSelectedTug5Id("");
                    }}
                    className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                      dispatchSource === "tug10"
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🔄 Sumber TUG 10 (Transfer Antar Kapal)
                  </button>
                </div>

                {/* Section 1 (TUG 5): Integrasi Permintaan Barang TUG 5 */}
                {dispatchSource === "tug5" && (
                  <div className="bg-blue-50/50 border border-blue-150 p-4.5 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-blue-900 border-b border-blue-100 pb-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black font-mono uppercase tracking-wider">
                        1. Pilih Permintaan Barang (TUG 5)
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Dokumen TUG 5 (Permintaan Barang) yang Siap Dikirim
                      </label>
                      <select
                        value={selectedTug5Id}
                        onChange={(e) => setSelectedTug5Id(e.target.value)}
                        required={dispatchSource === "tug5"}
                        className="w-full bg-white border border-slate-300 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- SILAKAN PILIH DOKUMEN TUG 5 --</option>
                        {requests
                          .filter(r => r.status === "Approved" || r.status === "Processed" || r.status === "Submitted")
                          .map(r => (
                            <option key={r.id} value={r.id}>
                              [{r.request_number}] - {r.vessel_name} (Status: {r.status} &bull; {r.items.length} item)
                            </option>
                          ))}
                        {/* Fallback showing other statuses if none of above are available, to keep it extremely resilient */}
                        {requests.filter(r => !["Approved", "Processed", "Submitted"].includes(r.status)).length > 0 && (
                          <optgroup label="Suku Cadang Lainnya">
                            {requests
                              .filter(r => !["Approved", "Processed", "Submitted"].includes(r.status))
                              .map(r => (
                                <option key={r.id} value={r.id}>
                                  [{r.request_number}] - {r.vessel_name} (Status: {r.status} &bull; {r.items.length} item)
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      <span className="text-[9.5px] text-slate-400 block mt-1.5">
                        Memilih TUG 5 akan mensinkronisasikan Nama Kapal, Daftar Suku Cadang, Nomor Work Order, Kode Akun ERP, Kode Fungsi, dan Alamat Tujuan secara otomatis.
                      </span>
                    </div>

                    {selectedTug5Id && (() => {
                      const selMR = requests.find(r => r.id === selectedTug5Id);
                      if (!selMR) return null;
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3.5 rounded-lg border border-blue-100/70 text-xs">
                          <div>
                            <span className="text-slate-400 font-mono text-[10px] block uppercase">Kapal Penerima</span>
                            <span className="font-bold text-slate-900">{selMR.vessel_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-mono text-[10px] block uppercase">No. Work Order</span>
                            <span className="font-bold text-slate-900">{selMR.work_order_ref || "NP"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-mono text-[10px] block uppercase">Kode Akun</span>
                            <span className="font-bold text-slate-900">{selMR.account_code || "BPP"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-mono text-[10px] block uppercase">Kode Fungsi</span>
                            <span className="font-bold text-slate-900">{selMR.function_code || "ARMADA"}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Section 1 (TUG 10): Integrasi Penurunan Barang TUG 10 */}
                {dispatchSource === "tug10" && (
                  <div className="bg-emerald-50/50 border border-emerald-150 p-4.5 rounded-xl space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black font-mono uppercase tracking-wider">
                        1. Pilih Bon Pengembalian / Penurunan (TUG 10)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Dokumen TUG 10 (Penurunan Suku Cadang)
                        </label>
                        <select
                          value={selectedTug10Id}
                          onChange={(e) => setSelectedTug10Id(e.target.value)}
                          required={dispatchSource === "tug10"}
                          className="w-full bg-white border border-slate-300 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- SILAKAN PILIH DOKUMEN TUG 10 --</option>
                          {materialReturns
                            .filter(r => r.status === "Approved" || r.status === "Completed")
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                [{r.return_number}] - Dari Kapal: {r.vessel_name} ({r.items.length} item)
                              </option>
                            ))}
                        </select>
                        <span className="text-[9.5px] text-slate-400 block mt-1.5">
                          Memilih TUG 10 akan mensinkronisasikan daftar barang penurunan untuk ditransfer ke kapal baru.
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Kapal Tujuan Transfer (Vessel Destination)
                        </label>
                        <input
                          type="text"
                          value={targetVesselName}
                          onChange={(e) => setTargetVesselName(e.target.value)}
                          required={dispatchSource === "tug10"}
                          placeholder="Contoh: MV Ocean Voyager"
                          className="w-full bg-white border border-slate-300 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-[9.5px] text-slate-400 block mt-1.5">
                          Tuliskan nama kapal penerima baru untuk suku cadang transfer ini.
                        </span>
                      </div>
                    </div>

                    {selectedTug10Id && (() => {
                      const selReturn = materialReturns.find(r => r.id === selectedTug10Id);
                      if (!selReturn) return null;
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3.5 rounded-lg border border-emerald-100/70 text-xs">
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kapal Asal (Penurunan)</span>
                              <span className="font-bold text-slate-900">⚓ {selReturn.vessel_name}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">No. Work Order / SPK</span>
                              <span className="font-bold text-slate-900">{selReturn.work_order_number || selReturn.spk_number || "NP"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kode Akun</span>
                              <span className="font-bold text-slate-900">{selReturn.account_code || "BPP"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kode Fungsi</span>
                              <span className="font-bold text-slate-900">{selReturn.function_code || "ARMADA"}</span>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                              Suku Cadang yang Akan Ditransfer ({dispatchItems.length} Item)
                            </span>
                            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-100 rounded">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-150 font-bold">
                                    <th className="p-2">Suku Cadang / Part Number</th>
                                    <th className="p-2 text-center w-24">Unit</th>
                                    <th className="p-2 text-center w-28">QTY Transfer</th>
                                    <th className="p-2 text-right w-36">Harga Stn (IDR)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dispatchItems.map((itm, index) => (
                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="p-2">
                                        <div className="font-bold text-slate-800">{itm.spare_part_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{itm.part_number}</div>
                                      </td>
                                      <td className="p-2 text-center text-slate-600 font-bold">{itm.unit}</td>
                                      <td className="p-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                                        {itm.qty_dispatched}
                                      </td>
                                      <td className="p-2">
                                        <div className="relative">
                                          <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400 font-bold">Rp</span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={itm.unit_price}
                                            onChange={(e) => {
                                              const val = Math.max(0, parseInt(e.target.value) || 0);
                                              setDispatchItems(prev => prev.map((item, i) => i === index ? { ...item, unit_price: val } : item));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 pl-6 text-xs font-bold font-mono text-right text-slate-800 focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Section 2: Detail Transporter & Expedisi */}
                <div className="border border-slate-200 p-4.5 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black font-mono uppercase tracking-wider">
                      2. Informasi Pengiriman & Transporter
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Nama Gudang Pengirim
                      </label>
                      <input
                        type="text"
                        value={wName}
                        onChange={(e) => setWName(e.target.value)}
                        placeholder="GUDANG UTAMA"
                        required
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Alamat / Pelabuhan Tujuan
                      </label>
                      <input
                        type="text"
                        value={dDest}
                        onChange={(e) => setDDest(e.target.value)}
                        placeholder="Port Agent / Vessel Side"
                        required
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Ekspedisi / Courier Name
                      </label>
                      <input
                        type="text"
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        placeholder="Internal Cargo / JNE / Vendor"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        No. Kendaraan / No. Resi Tracking
                      </label>
                      <input
                        type="text"
                        value={tNumber}
                        onChange={(e) => setTNumber(e.target.value)}
                        placeholder="B 9482 TQA"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Driver / PIC Transporter
                      </label>
                      <input
                        type="text"
                        value={dPic}
                        onChange={(e) => setDPic(e.target.value)}
                        placeholder="Ahmad Subarjo"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                      Catatan / Keterangan Tambahan
                    </label>
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Catatan pengiriman kargo, instruksi bongkar muat..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Section 3: Ringkasan Suku Cadang yang Akan Dikirim */}
                {dispatchSource === "tug5" && selectedTug5Id && (() => {
                  const selMR = requests.find(r => r.id === selectedTug5Id);
                  if (!selMR || !selMR.items || selMR.items.length === 0) return null;
                  
                  const hasIncompleteItems = selMR.items.some(
                    itm => itm.item_status === "Pending" || itm.item_status === "Returned"
                  );

                  return (
                    <div className="border border-slate-200 p-4.5 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-slate-800 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-black font-mono uppercase tracking-wider">
                            3. Ringkasan Material / Suku Cadang ({selMR.items.length} Item)
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          hasIncompleteItems 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {hasIncompleteItems ? "Parsial (Incomplete)" : "Sinkron (Lengkap)"}
                        </span>
                      </div>

                      {hasIncompleteItems && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-lg p-3.5 text-xs flex gap-2.5 leading-relaxed">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-amber-900">Perhatian: Kargo Belum Lengkap!</span>
                            Beberapa item ditandai sebagai <span className="font-bold">Belum Datang</span> atau <span className="font-bold">Diretur</span> pada TUG 5. Hanya item "Sudah Datang" yang dikirimkan. Sisa barang akan ditinggal, dan status SPK <span className="font-mono font-bold text-slate-900">{selMR.work_order_ref || "NP"}</span> otomatis berubah menjadi <span className="bg-rose-100 text-rose-800 font-mono font-black px-1.5 py-0.5 rounded">INCOMPLETE</span>.
                          </div>
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {dispatchItems.map((itm, idx) => {
                          const isSent = itm.qty_dispatched > 0;
                          return (
                            <div key={idx} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                              <div className="flex-1">
                                <strong className={`block font-bold ${isSent ? "text-slate-900" : "text-slate-400 line-through font-medium"}`}>
                                  {itm.spare_part_name}
                                </strong>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-slate-400 font-mono text-[10px]">Part No: {itm.part_number} &bull; Unit: {itm.unit || "PCS"}</span>
                                  {itm.qty_requested > 0 && !isSent && (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.1 rounded font-bold text-[8.5px] uppercase">
                                      Tidak Dikirim
                                    </span>
                                  )}
                                  {isSent && (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.1 rounded font-bold text-[8.5px] uppercase">
                                      Siap Dikirim
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-right">
                                <div className="font-mono text-center bg-slate-50 border border-slate-150 p-1.5 rounded min-w-[90px]">
                                  <span className="text-slate-400 text-[8px] block uppercase font-bold leading-none mb-1">QTY Kirim</span>
                                  <strong className={`font-extrabold text-xs ${isSent ? "text-blue-700" : "text-slate-450"}`}>
                                    {itm.qty_dispatched} / {itm.qty_requested} {itm.unit || "PCS"}
                                  </strong>
                                </div>

                                {/* INPUT HARGA SATUAN (HARGA STN) */}
                                <div className="w-36 text-left">
                                  <label className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Harga Stn (IDR)</label>
                                  <div className="relative">
                                    <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400 font-bold font-sans">Rp</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={itm.unit_price}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setDispatchItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: val } : item));
                                      }}
                                      className="w-full bg-slate-50 border border-slate-250 rounded p-1 pl-6 text-xs font-bold font-mono text-right text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold uppercase rounded text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isLoading || 
                    (dispatchSource === "tug5" && !selectedTug5Id) || 
                    (dispatchSource === "tug10" && (!selectedTug10Id || !targetVesselName.trim()))
                  }
                  className={`px-5 py-2.5 rounded text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    isLoading || 
                    (dispatchSource === "tug5" && !selectedTug5Id) || 
                    (dispatchSource === "tug10" && (!selectedTug10Id || !targetVesselName.trim()))
                      ? "bg-slate-300 border-slate-300 cursor-not-allowed text-slate-500"
                      : dispatchSource === "tug10"
                        ? "bg-emerald-600 hover:bg-emerald-500 border border-emerald-700"
                        : "bg-blue-600 hover:bg-blue-500 border border-blue-700"
                  }`}
                >
                  {isLoading ? "Memproses..." : dispatchSource === "tug10" ? "Proses Transfer Antar Kapal" : "Simpan & Kirim Cargo"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
