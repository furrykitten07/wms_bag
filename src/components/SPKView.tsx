import React, { useState } from "react";
import { 
  FileText, 
  Plus, 
  Ship, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Printer, 
  MapPin, 
  User, 
  Clock, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  AlertTriangle,
  Eye,
  Anchor,
  Building2,
  Barcode
} from "lucide-react";
import { 
  SPKWorkOrder, 
  SPKVesselItem, 
  SPKItemSelection, 
  SparePart, 
  WarehouseLocation, 
  UserRole 
} from "../types.js";

interface SPKViewProps {
  spkList: SPKWorkOrder[];
  parts: SparePart[];
  locations: WarehouseLocation[];
  role: UserRole;
  onAddSPK: (spk: Partial<SPKWorkOrder>) => Promise<any>;
  onUpdateSPK: (id: string, spk: Partial<SPKWorkOrder>) => Promise<any>;
  onDeleteSPK: (id: string) => Promise<any>;
  onUpdatePart?: (id: string, part: Partial<SparePart>) => Promise<any>;
}

export default function SPKView({
  spkList,
  parts,
  locations,
  role,
  onAddSPK,
  onUpdateSPK,
  onDeleteSPK,
  onUpdatePart
}: SPKViewProps) {
  const [selectedSPK, setSelectedSPK] = useState<SPKWorkOrder | null>(spkList[0] || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState<{ id: string; status: string }>({ id: "", status: "" });

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Status Filter, Details Viewing Modal, and Print Overlay states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [spkPage, setSpkPage] = useState(1);
  const spkPerPage = 10;
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSPKDetail, setSelectedSPKDetail] = useState<SPKWorkOrder | null>(null);
  const [isPrintOverlayOpen, setIsPrintOverlayOpen] = useState(false);
  const [printTargetSPK, setPrintTargetSPK] = useState<SPKWorkOrder | null>(null);

  // Creation form states
  const [targetPort, setTargetPort] = useState("");
  const [remarks, setRemarks] = useState("");
  const [vessels, setVessels] = useState<Array<{ vessel_name: string; items: Array<{ spare_part_id: string; qty_to_pick: number }> }>>([
    { vessel_name: "", items: [{ spare_part_id: "", qty_to_pick: 1 }] }
  ]);

  const handleOpenCreateModal = () => {
    setTargetPort("");
    setRemarks("");
    setVessels([{ vessel_name: "", items: [{ spare_part_id: "", qty_to_pick: 1 }] }]);
    setIsCreateModalOpen(true);
  };

  const handleAddVesselToForm = () => {
    setVessels([...vessels, { vessel_name: "", items: [{ spare_part_id: "", qty_to_pick: 1 }] }]);
  };

  const handleRemoveVesselFromForm = (vIdx: number) => {
    const updated = [...vessels];
    updated.splice(vIdx, 1);
    setVessels(updated);
  };

  const handleVesselNameChange = (vIdx: number, value: string) => {
    const updated = [...vessels];
    updated[vIdx].vessel_name = value;
    setVessels(updated);
  };

  const handleAddItemToVessel = (vIdx: number) => {
    const updated = [...vessels];
    updated[vIdx].items.push({ spare_part_id: "", qty_to_pick: 1 });
    setVessels(updated);
  };

  const handleRemoveItemFromVessel = (vIdx: number, itemIdx: number) => {
    const updated = [...vessels];
    updated[vIdx].items.splice(itemIdx, 1);
    setVessels(updated);
  };

  const handleItemPartChange = (vIdx: number, itemIdx: number, partId: string) => {
    const updated = [...vessels];
    updated[vIdx].items[itemIdx].spare_part_id = partId;
    setVessels(updated);
  };

  const handleItemQtyChange = (vIdx: number, itemIdx: number, qty: number) => {
    const updated = [...vessels];
    updated[vIdx].items[itemIdx].qty_to_pick = qty <= 0 ? 1 : qty;
    setVessels(updated);
  };

  const handleSubmitSPK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPort) {
      alert("Tujuan Port Pelabuhan wajib diisi!");
      return;
    }

    // Verify vessels and items
    const finalVessels: SPKVesselItem[] = [];
    for (const v of vessels) {
      if (!v.vessel_name.trim()) {
        alert("Semua nama kapal tujuan harus diisi!");
        return;
      }
      const finalItems: SPKItemSelection[] = [];
      for (const item of v.items) {
        if (!item.spare_part_id) {
          alert(`Pilih spare part untuk kapal ${v.vessel_name}!`);
          return;
        }
        const matchedPart = parts.find(p => p.id === item.spare_part_id);
        if (!matchedPart) continue;

        finalItems.push({
          spare_part_id: item.spare_part_id,
          spare_part_name: matchedPart.part_name,
          part_number: matchedPart.part_number,
          qty_to_pick: item.qty_to_pick,
          unit: matchedPart.unit || "PCS"
        });
      }

      if (finalItems.length === 0) {
        alert(`Kapal ${v.vessel_name} harus memiliki minimal 1 item barang yang diambil!`);
        return;
      }

      finalVessels.push({
        vessel_name: v.vessel_name,
        items: finalItems
      });
    }

    if (finalVessels.length === 0) {
      alert("SPK minimal harus memiliki 1 kapal tujuan!");
      return;
    }

    // Auto-generate SPK Number
    const randNum = Math.floor(Math.random() * 9000) + 1000;
    const year = new Date().getFullYear();
    const spk_number = `SPK-${year}-${randNum}`;

    try {
      const payload: Partial<SPKWorkOrder> = {
        spk_number,
        target_port: targetPort,
        remarks,
        status: "Pending Picking",
        vessels: finalVessels
      };

      const result = await onAddSPK(payload);
      setIsCreateModalOpen(false);
      // Select the newly created SPK
      if (result) {
        setSelectedSPK(result);
      } else {
        alert("SPK berhasil ditambahkan.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal membuat SPK.");
    }
  };

  const handleOpenStatusModal = (spk: SPKWorkOrder) => {
    setStatusForm({ id: spk.id, status: spk.status });
    setIsEditStatusModalOpen(true);
  };

  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSPK(statusForm.id, { status: statusForm.status as any });
      setIsEditStatusModalOpen(false);
      // Update selected SPK reference
      if (selectedSPK && selectedSPK.id === statusForm.id) {
        setSelectedSPK({ ...selectedSPK, status: statusForm.status as any });
      }
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status SPK");
    }
  };

  // Helper inside rendering to get part location details
  const getPartLocationInfo = (partId: string) => {
    const matchedPart = parts.find(p => p.id === partId);
    if (!matchedPart) return { code: "N/A", label: "Tidak Diketahui", isHigh: false };
    const matchedLocation = locations.find(l => l.id === matchedPart.location_id || l.code === matchedPart.location_id);
    
    if (!matchedLocation) {
      return { 
        code: matchedPart.location_id || "Unassigned", 
        label: "Belum Ditetapkan", 
        isHigh: false 
      };
    }

    const codeLower = matchedLocation.code.toLowerCase();
    const isHigh = codeLower.includes("3") || matchedLocation.shelf.toLowerCase().includes("3") || matchedLocation.shelf.toLowerCase().includes("high");
    const isMid = codeLower.includes("2") || matchedLocation.shelf.toLowerCase().includes("2") || matchedLocation.shelf.toLowerCase().includes("mid");

    let label = "LEVEL 1 (Dasar)";
    if (isHigh) {
      label = "LEVEL 3 (Tinggi, Forklift/Tangga!)";
    } else if (isMid) {
      label = "LEVEL 2 (Sedang)";
    }

    return {
      code: matchedLocation.code,
      label,
      isHigh,
      isMid,
      fullDetails: `${matchedLocation.warehouse} - Grid ${matchedLocation.rack} Bin ${matchedLocation.bin}`
    };
  };

  // PRINT CURRENT SPK
  const handlePrintSPK = () => {
    window.focus();
    window.print();
  };

  // Filter SPK list based on search query and status filter
  const filteredSPKList = spkList.filter((spk) => {
    // 1. Status Filter
    if (statusFilter !== "all" && spk.status !== statusFilter) return false;
    
    // 2. Keyword Search
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchNum = spk.spk_number.toLowerCase().includes(q);
      const matchPort = spk.target_port.toLowerCase().includes(q);
      const matchOfficer = spk.created_by.toLowerCase().includes(q);
      const matchVessels = spk.vessels.some(v => v.vessel_name.toLowerCase().includes(q));
      
      return matchNum || matchPort || matchOfficer || matchVessels;
    }
    
    return true;
  });

  const totalSpkPages = Math.ceil(filteredSPKList.length / spkPerPage);
  const paginatedSPKList = filteredSPKList.slice((spkPage - 1) * spkPerPage, spkPage * spkPerPage);

  // Status counters for modern KPI display
  const countTotal = spkList.length;
  const countPending = spkList.filter(s => s.status === "Pending Picking").length;
  const countProgress = spkList.filter(s => s.status === "Picking in Progress").length;
  const countReady = spkList.filter(s => s.status === "Picked & Ready").length;
  const countDispatched = spkList.filter(s => s.status === "Dispatched").length;

  return (
    <div id="spk-work-orders-container" className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans selection:bg-blue-105 animate-fade-in">
      
      {/* HEADER SECTION */}
      <section id="spk-header-section" className="bg-white border border-slate-200 p-5 rounded-md shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600 w-5 h-5" />
            Manajemen Surat Perintah Kerja (SPK) Picking Gudang
          </h2>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Sistem pengarsipan dan penugasan penyiapan barang kargo laut multi-kapal secara sistematis.
          </p>
        </div>
        {role !== UserRole.VESSEL_CREW && (
          <button
            id="btn-create-spk-trigger"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-650 hover:bg-blue-600 text-white font-mono text-[10px] font-bold uppercase rounded shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat SPK Baru
          </button>
        )}
      </section>

      {/* KPI METRIC CARDS ROW */}
      <div id="spk-kpi-metrics-row" className="max-w-sm no-print">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Total Surat Perintah Kerja (SPK)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{countTotal}</span>
            <span className="text-[10px] font-mono text-slate-400">spk</span>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full w-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL ROW */}
      <div id="spk-controls-bar" className="bg-slate-900 text-slate-200 px-5 py-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 no-print shadow-sm">
        <div className="flex flex-1 flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-[10px] font-mono uppercase">
              Cari &bull;
            </span>
            <input
              type="text"
              placeholder="Masukkan No. SPK, Pelabuhan, Nama Kapal atau Pembuat..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSpkPage(1);
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg pl-14 pr-4 py-2 text-xs font-sans text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSpkPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2.5 items-center">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Status Laju SPK:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSpkPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-white font-mono text-xs rounded-lg px-3 py-1.8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="all">SAMPIR (Semua Status)</option>
              <option value="Pending Picking">Pending Picking</option>
              <option value="Picking in Progress">Picking in Progress</option>
              <option value="Picked & Ready">Picked & Ready</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Incomplete">Incomplete</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 text-right shrink-0 flex items-center gap-1">
          <span>Menampilkan</span>
          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
            {filteredSPKList.length}
          </span>
          <span>SPK Terdaftar</span>
        </div>
      </div>

      {/* CORE DATATABLE VIEW */}
      <div id="spk-table-card" className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col border-t-4 border-t-blue-600 no-print">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-700">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase font-mono tracking-widest">
              DAFTAR TUGAS DAN HISTORI PENGAMBILAN BARANG (SPK LEDGER)
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-auto pb-24">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 py-3.5 pl-6 font-bold">No. SPK / Work Order</th>
                <th className="p-4 py-3.5 font-bold">Tanggal Pembuatan</th>
                <th className="p-4 py-3.5 font-bold">Tujuan Port Pelabuhan</th>
                <th className="p-4 py-3.5 font-bold">Kapal Penerima Cargo</th>
                <th className="p-4 py-3.5 text-center font-bold">Status Laju</th>
                <th className="p-4 py-3.5 text-center font-bold">Keberagaman Item</th>
                <th className="p-4 py-3.5 text-right pr-8 font-bold">Aksi Operasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedSPKList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <FileText className="w-10 h-10 text-slate-300" />
                       <p className="font-medium text-slate-500">Tidak ada SPK (Surat Perintah Kerja) yang didokumentasikan.</p>
                       <p className="text-[11px] text-slate-400">Ubah filter status laju atau kata pencarian kata kunci Anda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSPKList.map((spk) => {
                  const totalItemsType = spk.vessels.reduce((acc, v) => acc + v.items.length, 0);
                  const vesselNames = spk.vessels.map(v => v.vessel_name).join(", ");
                  
                  const isActionOpen = activeActionId === spk.id;
                  return (
                    <tr key={spk.id} className={`hover:bg-slate-50/70 transition-colors ${isActionOpen ? "relative z-30 bg-slate-50/80 shadow-xs" : ""}`}>
                      <td className="p-4 pl-6 font-mono font-bold text-[12px] text-blue-700">
                        {spk.spk_number}
                      </td>
                      <td className="p-4 text-slate-500 font-mono">
                        {new Date(spk.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })} <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(spk.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 max-w-[180px] truncate" title={spk.target_port}>
                        {spk.target_port}
                      </td>
                      <td className="p-4 text-slate-700 font-medium font-sans">
                        <div className="flex flex-col gap-0.5 max-w-[200px]" title={vesselNames}>
                          <span className="truncate text-[11.5px] font-bold text-slate-800">{vesselNames}</span>
                          <span className="text-[9.5px] text-slate-400 font-mono">{spk.vessels.length} Kapal Pelayaran</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {spk.status === "Pending Picking" && (
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase">
                            Pending
                          </span>
                        )}
                        {spk.status === "Picking in Progress" && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase">
                            Picking
                          </span>
                        )}
                        {spk.status === "Picked & Ready" && (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase">
                            Ready
                          </span>
                        )}
                        {spk.status === "Dispatched" && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase">
                            Dispatched
                          </span>
                        )}
                        {spk.status === "Incomplete" && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase animate-pulse">
                            Incomplete
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-[12px] text-slate-800">
                        {totalItemsType} <span className="text-[9px] font-normal text-slate-400 block">Item Part</span>
                      </td>
                      <td className={`p-4 text-right pr-8 relative ${isActionOpen ? "z-40" : ""}`}>
                        <div className="inline-block text-left relative z-20">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionId(activeActionId === spk.id ? null : spk.id);
                              setSelectedSPK(spk);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer border border-slate-850"
                          >
                            <span>Actions</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {activeActionId === spk.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionId(null);
                                }}
                              />
                              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-250 rounded-lg shadow-xl z-50 overflow-hidden text-left py-1.5 text-slate-705 font-sans">
                                <span className="px-3.5 py-1 text-[9px] uppercase font-bold text-slate-400 font-mono block border-b border-slate-100 pb-1.5 mb-1">
                                  Navigasi SPK
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(null);
                                    setSelectedSPK(spk);
                                    setSelectedSPKDetail(spk);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Detail Penugasan SPK</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(null);
                                    setSelectedSPK(spk);
                                    handleOpenStatusModal(spk);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Kelola Status Laju</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(null);
                                    setSelectedSPK(spk);
                                    setPrintTargetSPK(spk);
                                    setIsPrintOverlayOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Lembar Picking (Print)</span>
                                </button>

                                {role !== UserRole.VESSEL_CREW && (
                                  <div className="border-t border-slate-100 mt-1 pt-1">
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        const confirm = window.confirm(`Apakah Anda yakin ingin membatalkan & menghapus SPK ${spk.spk_number}?`);
                                        if (confirm) {
                                          try {
                                            await onDeleteSPK(spk.id);
                                            alert("SPK work order telah dihapus.");
                                          } catch (err: any) {
                                            alert(err.message || "Gagal menghapus.");
                                          }
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-xs font-bold hover:bg-red-50 text-red-650 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      <span>Batalkan & Hapus SPK</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* COMPACT FLOATING PAGINATION */}
        <div id="spk-pagination-bar" className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-mono text-slate-500 font-medium">
            Menampilkan data <strong className="text-slate-800">{(spkPage - 1) * spkPerPage + 1}</strong> s/d{" "}
            <strong className="text-slate-800">
              {Math.min(spkPage * spkPerPage, filteredSPKList.length)}
            </strong>{" "}
            dari total <strong className="text-slate-800">{filteredSPKList.length}</strong> data SPK
          </span>

          {totalSpkPages > 1 && (
            <div className="flex items-center gap-1 font-mono text-xs select-none">
              <button
                type="button"
                disabled={spkPage === 1}
                onClick={() => setSpkPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.8 bg-white border border-slate-200 hover:border-slate-350 disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed font-bold text-slate-700 hover:text-blue-650 transition-all shadow-xs"
              >
                &larr; Prev
              </button>
              
              {Array.from({ length: totalSpkPages }).map((_, i) => {
                const pageNum = i + 1;
                const isPageActive = spkPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setSpkPage(pageNum)}
                    className={`w-8.5 h-8.5 flex items-center justify-center rounded-lg border font-bold h-8 w-8 cursor-pointer transition-all ${
                      isPageActive
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-350 text-slate-650"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={spkPage === totalSpkPages}
                onClick={() => setSpkPage((p) => Math.min(totalSpkPages, p + 1))}
                className="px-3 py-1.8 bg-white border border-slate-200 hover:border-slate-350 disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed font-bold text-slate-700 hover:text-blue-650 transition-all shadow-xs"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL WINDOW: CREATE NEW WORK ORDER (SPK) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col border border-slate-200 my-4">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-display font-semibold text-xs uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Penerbitan SPK baru (Multi-Vessel & Multi-Part)
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSPK} className="p-6 overflow-y-auto max-h-[80vh] space-y-6 text-xs text-slate-800">
              
              {/* BASIC METADATA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Tujuan Port Pelabuhan Kapal Bersandar *
                  </label>
                  <input
                    type="text"
                    required
                    value={targetPort}
                    onChange={(e) => setTargetPort(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.8 font-bold"
                    placeholder="e.g. Pelabuhan Tanjung Priok, Jakarta Utara"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Remarks / Catatan Petunjuk Pengiriman
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.8"
                    placeholder="e.g. Segera paking peti kayu, kirim sebelum hari sabtu."
                  />
                </div>
              </div>

              {/* VESSELS BUILDER SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs font-display text-slate-800 uppercase tracking-wide">
                    Daftar Kapal Tujuan & Item yang akan di-Pick
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVesselToForm}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[9px] uppercase font-bold rounded inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Kapal Penerima
                  </button>
                </div>

                {vessels.map((vForm, vIdx) => (
                  <div key={vIdx} className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3 relative">
                    {vessels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVesselFromForm(vIdx)}
                        className="absolute right-3 top-3 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                        title="Hapus Kapal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-505 font-mono block mb-1">
                        Nama Kapal Penerima *
                      </label>
                      <input
                        type="text"
                        required
                        value={vForm.vessel_name}
                        onChange={(e) => handleVesselNameChange(vIdx, e.target.value)}
                        className="w-full max-w-md bg-white border border-slate-250 rounded text-xs px-2.5 py-1.5 font-bold"
                        placeholder="e.g. MV. KARTINI BARUNA"
                      />
                    </div>

                    {/* ITEMS SUB-FORMS */}
                    <div className="space-y-2 pt-2 border-t border-slate-150">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 font-mono tracking-wider">
                          Daftar Suku Cadang (Spare Part List)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddItemToVessel(vIdx)}
                          className="text-[9px] font-mono font-bold text-blue-600 hover:text-blue-500 uppercase flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Tambah Item Spares
                        </button>
                      </div>

                      {vForm.items.map((itemForm, itemIdx) => {
                        // Find matched part location inline to show warehouse coordinates helper in creation form!
                        const matchedPart = parts.find(p => p.id === itemForm.spare_part_id);
                        const matchedLoc = matchedPart ? locations.find(l => l.id === matchedPart.location_id || l.code === matchedPart.location_id) : null;
                        
                        return (
                          <div key={itemIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            
                            <div className="md:col-span-6">
                              <select
                                required
                                value={itemForm.spare_part_id}
                                onChange={(e) => handleItemPartChange(vIdx, itemIdx, e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded text-xs px-2 py-1.5 text-slate-905"
                              >
                                <option value="">-- Pilih Suku Cadang --</option>
                                {parts.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.part_name} [{p.part_number}] (Stock: {p.current_stock} {p.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <input
                                type="number"
                                required
                                min="1"
                                value={itemForm.qty_to_pick}
                                onChange={(e) => handleItemQtyChange(vIdx, itemIdx, parseInt(e.target.value) || 1)}
                                className="w-full bg-white border border-slate-250 rounded text-xs px-2 py-1.5 font-mono text-center font-bold"
                                placeholder="Qty"
                              />
                            </div>

                            <div className="md:col-span-3 text-[10px] text-slate-500 font-mono bg-white border border-slate-205 p-1 rounded font-bold">
                              {matchedLoc ? (
                                <span className="text-blue-650 flex items-center justify-between">
                                  <span>Slot Gdg: {matchedLoc.code}</span>
                                  <span className="text-[8px] bg-blue-50 px-1 rounded uppercase">{matchedLoc.shelf.split(" ")[0]}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">Pilih part untuk cek letak</span>
                              )}
                            </div>

                            <div className="md:col-span-1 text-center">
                              {vForm.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromVessel(vIdx, itemIdx)}
                                  className="text-red-500 hover:text-red-700 font-bold font-mono transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  ×
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

              {/* SAVE BUTTONS */}
              <div className="bg-slate-900 border-t border-slate-105 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer animate-pulse-subtle"
                >
                  Penerbitan Surat Kerja SPK
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* STATUS UPDATE DIALOG MODAL */}
      {isEditStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-display font-semibold text-xs uppercase tracking-widest">
                Ubah Status Progress Alokasi SPK
              </h3>
              <button onClick={() => setIsEditStatusModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStatus} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-2">
                  Pilih Tahapan Progress *
                </label>
                <select
                  required
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-3 py-2.5 font-sans font-bold text-slate-800"
                >
                  <option value="Pending Picking">Pending Picking (Dalam Antrean)</option>
                  <option value="Picking in Progress">Picking in Progress (Sedang Diambil Staff)</option>
                  <option value="Picked & Ready">Picked & Ready (Siap Kirim di Dermaga)</option>
                  <option value="Dispatched">Dispatched (Sudah Diserahkan Kepada Kru Kapal)</option>
                </select>
              </div>

              <div className="bg-slate-900 border-t border-slate-100 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setIsEditStatusModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Ubah Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. DETAILED SPK VIEW OVERLAY MODAL        */}
      {/* ========================================== */}
      {isDetailModalOpen && selectedSPKDetail && (() => {
        const spk = selectedSPKDetail;
        const totalItemsCount = spk.vessels.reduce((acc, v) => acc + v.items.length, 0);
        
        // Progress steps list for visual progress stepper
        const steps = ["Pending Picking", "Picking in Progress", "Picked & Ready", spk.status === "Incomplete" ? "Incomplete" : "Dispatched"];
        const currentStepIdx = steps.indexOf(spk.status);

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white text-slate-850 rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-slate-205 transition-all">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-450" />
                  <div>
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-200">
                      Rincian Detil Surat Perintah Kerja (SPK)
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      No. SPK: <span className="text-yellow-405 font-bold font-mono">{spk.spk_number}</span> &bull; Pelabuhan: <span className="text-blue-300 font-bold">{spk.target_port}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSPKDetail(null);
                    setIsDetailModalOpen(false);
                  }} 
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Scroll Container */}
              <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
                
                {/* Visual Status Progress Stepper */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block mb-3 text-center">
                    Garis Laju Tahapan Alokasi SPK (Progress Stepper)
                  </span>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 px-2">
                    {steps.map((step, idx) => {
                      const isCompleted = idx < currentStepIdx;
                      const isActive = idx === currentStepIdx;
                      const isIncomplete = step === "Incomplete";
                      
                      const counterColor = isIncomplete
                        ? "bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse"
                        : isCompleted 
                          ? "bg-emerald-600 text-white" 
                          : isActive 
                            ? "bg-blue-600 text-white ring-4 ring-blue-100" 
                            : "bg-slate-200 text-slate-500";

                      const textColor = isIncomplete
                        ? "text-rose-600 font-bold"
                        : isActive
                          ? "text-blue-600"
                          : isCompleted
                            ? "text-emerald-700"
                            : "text-slate-500";

                      const subtextLabel = isIncomplete
                        ? "Incomplete Delivery"
                        : isActive
                          ? "Saat Ini"
                          : isCompleted
                            ? "Selesai"
                            : "Antrean";
                      
                      return (
                        <div key={step} className="flex-1 w-full flex flex-col md:flex-row items-center gap-2">
                          
                          {/* Circle Counter Accent */}
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${counterColor}`}>
                              {isCompleted && !isIncomplete ? "✓" : idx + 1}
                            </div>
                            
                            <div className="text-left">
                              <p className={`text-[10.5px] font-sans font-bold leading-tight ${textColor}`}>
                                {step}
                              </p>
                              <span className="text-[8.5px] text-slate-400 font-mono block leading-none">
                                {subtextLabel}
                              </span>
                            </div>
                          </div>

                          {/* Line Spacer Connector */}
                          {idx < steps.length - 1 && (
                            <div className={`hidden md:block h-0.5 flex-1 mx-3 ${
                              idx < currentStepIdx ? "bg-emerald-500" : "bg-slate-200"
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {spk.status === "Incomplete" && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs flex items-start gap-3 text-rose-950">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-[12px] block text-rose-900 uppercase tracking-wide">
                        STATUS SPK: INCOMPLETE / KURANG BARANG
                      </span>
                      <p className="mt-1 leading-relaxed">
                        Surat Perintah Kerja ini ditandai sebagai <span className="font-extrabold text-rose-700">Incomplete</span> karena saat proses sinkronisasi TUG 5 (Permintaan Barang) dan pembuatan TUG 8 (Pengiriman), terdapat satu atau lebih barang yang <span className="font-semibold">belum datang</span> atau <span className="font-semibold">diretur</span>. Dispatch pengiriman tetap diproses untuk barang yang siap dikirim guna menghemat waktu (Urgent Delivery).
                      </p>
                    </div>
                  </div>
                )}

                {/* Grid info: Port and Administrative footing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-slate-200 rounded p-3.5 bg-slate-50/50">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Tujuan Terminal Port:</span>
                    <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {spk.target_port}
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded p-3.5 bg-slate-50/50">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Logistics Officer:</span>
                    <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {spk.created_by}
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded p-3.5 bg-slate-50/50">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Tanggal Penerbitan:</span>
                    <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {new Date(spk.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Supplementary footnotes text box */}
                {spk.remarks && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block mb-1">
                      Catatan Tambahan Petugas (Remarks):
                    </span>
                    <p className="text-slate-700 italic">"{spk.remarks}"</p>
                  </div>
                )}

                {/* Subheading list for multi-vessel contents */}
                <div className="space-y-4">
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 flex justify-between items-center">
                    <span>Instruksi Alokasi Sektor Suku Cadang Per Kapal</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold lowercase">
                      {spk.vessels.length} Kapal &bull; {totalItemsCount} Macam barang
                    </span>
                  </h4>

                  {spk.vessels.map((vessel, vIdx) => (
                    <div key={vIdx} className="border border-slate-200 rounded-md p-4 bg-white shadow-xs">
                      
                      {/* Vessel title */}
                      <div className="flex justify-between items-center bg-slate-100 p-2 px-3 rounded border border-slate-200 -mx-4 -mt-4 mb-3">
                        <span className="font-mono font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                          <Ship className="w-4 h-4 text-blue-600 shrink-0" />
                          Nama Kapal: {vessel.vessel_name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded">
                          {vessel.items.length} Suku Cadang
                        </span>
                      </div>

                      {/* Items Grid Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-mono font-semibold tracking-wide">
                              <th className="py-2 pb-1.5">Item Suku Cadang & Nomor Part</th>
                              <th className="py-2 pb-1.5 text-center w-20">Volume Pick</th>
                              <th className="py-2 pb-1.5 text-right w-48">Posisi Gudang Gudang / Rak</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {vessel.items.map((item, itemIdx) => {
                              const locInfo = getPartLocationInfo(item.spare_part_id);
                              const internalPartObj = parts.find(p => p.id === item.spare_part_id);
                              
                              return (
                                <tr key={itemIdx} className="hover:bg-slate-50/40">
                                  <td className="py-3 pr-2">
                                    <span className="font-bold text-slate-900 block leading-tight">{item.spare_part_name}</span>
                                    <span className="text-[9px] text-slate-400 font-mono block mt-0.5">OEM No: {item.part_number}</span>
                                  </td>
                                  <td className="py-3 font-mono font-bold text-center text-slate-800 text-sm">
                                    {item.qty_to_pick} <span className="text-[9.5px] text-slate-400 font-normal">{item.unit}</span>
                                  </td>
                                  <td className="py-3 text-right font-mono">
                                    <div className="inline-flex flex-col items-end">
                                      <div className="flex items-center gap-1 font-bold text-blue-750">
                                        <MapPin className="w-3 h-3 text-blue-550 shrink-0" />
                                        <span>Slot Gudang {locInfo.code}</span>
                                      </div>
                                      <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${
                                        locInfo.isHigh 
                                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                                          : locInfo.isMid 
                                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      }`}>
                                        {locInfo.label}
                                      </span>
                                      
                                      {/* DYNAMIC SHIFT OF WAREHOUSE COORDINATES ON THE FLY */}
                                      {role !== UserRole.VESSEL_CREW && onUpdatePart && internalPartObj && (
                                        <div className="mt-2 text-right">
                                          <label className="text-[8.5px] font-mono text-slate-400 block mb-1">Pindahkan Koordinat Rak:</label>
                                          <select
                                            defaultValue={internalPartObj.location_id}
                                            onChange={async (e) => {
                                              const newLocId = e.target.value;
                                              if (newLocId) {
                                                try {
                                                  await onUpdatePart(internalPartObj.id, { location_id: newLocId });
                                                  alert(`Sukses memindahkan part [${internalPartObj.part_name}] ke slot letak: ${locations.find(l => l.id === newLocId || l.code === newLocId)?.code || newLocId}`);
                                                } catch (err: any) {
                                                  alert(`Gagal memindahkan part: ${err.message}`);
                                                }
                                              }
                                            }}
                                            className="bg-white border border-slate-200 rounded font-mono text-[9px] px-1 py-0.5 cursor-pointer max-w-[130px]"
                                          >
                                            {locations.map((loc) => (
                                              <option key={loc.id} value={loc.id}>
                                                {loc.code} ({loc.zone})
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Printed signatures card outline */}
                <div className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-[9.5px] text-slate-500 leading-relaxed space-y-1">
                  <p className="font-bold text-slate-700 uppercase">Protokol Verifikasi Picking Gudang:</p>
                  <p>1. Operator wajib menyamakan nomor part sesuai daftar OEM.</p>
                  <p>2. Pastikan ketinggian level rak (Level 3) diturunkan menggunakan alat forklift / tangga pengaman.</p>
                  <p>3. Berikan cap paraf basah di lembar cetak fisik setelah serah terima barang dilakukan di dermaga.</p>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex justify-between items-center font-mono">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                  Mare-WMS Logistics Module
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSPKDetail(null);
                      setIsDetailModalOpen(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold uppercase cursor-pointer"
                  >
                    Tutup Detail
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintTargetSPK(spk);
                      setIsPrintOverlayOpen(true);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Lembar Picking
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}


      {/* ========================================== */}
      {/* 2. PRINT-READY SHEET & PDF TEMPLATE OVERLAY */}
      {/* ========================================== */}
      {isPrintOverlayOpen && printTargetSPK && (() => {
        const spk = printTargetSPK;
        const totalItemsCount = spk.vessels.reduce((acc, v) => acc + v.items.length, 0);
        
        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto no-print-overlay">
            <div className="bg-white text-slate-800 rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-8 border border-slate-200">
              
              {/* Header toolbar for web browser preview */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-850 no-print">
                <div className="flex items-center gap-2 font-mono">
                  <Printer className="text-blue-400 w-5 h-5" />
                  <h3 className="font-display font-semibold text-xs uppercase tracking-wider">
                    Logistics Document Print Tool &mdash; SPK PICKING SHEET
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePrintSPK}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase font-mono px-4 py-2 rounded transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak / Print PDF
                  </button>
                  <button 
                    onClick={() => {
                      setPrintTargetSPK(null);
                      setIsPrintOverlayOpen(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded transition-colors text-slate-400 cursor-pointer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Document Body Wrapper (Paper emulation) */}
              <div className="p-10 flex-1 overflow-y-auto bg-white text-slate-900 print:p-0 print-card" id="spk-picking-doc">
                
                {/* Official Letterhead */}
                <div className="border-b-2 border-slate-950 pb-4 mb-6 flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-slate-950 rounded flex items-center justify-center text-white border border-slate-800 shrink-0">
                      <Ship className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h1 className="font-display font-bold text-lg leading-tight uppercase tracking-tight text-slate-950">
                        PT. PELAYARAN BAHTERA ADHIGUNA (BAG)
                      </h1>
                      <p className="text-[10px] text-slate-500 font-mono leading-relaxed mt-0.5">
                        Logistics & Fleet Supply Depot Division | Gudang Utama Tanjung Priok Jakarta<br />
                        Komp. Pelabuhan Tanjung Priok Blok C-12, Jakarta Utara | Phone: +62 21 4390 1234
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-slate-900 text-white px-2.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                      PICKING ORDER
                    </span>
                    <h2 className="text-sm font-mono font-bold mt-1 text-slate-950">{spk.spk_number}</h2>
                    <p className="text-[9px] text-slate-500 mt-1">Tgl Cetak: {new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Sub title */}
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-base uppercase tracking-wider text-slate-900 underline underline-offset-4">
                    LEMBAR KERJA PENGAMBILAN & PICKING BARANG
                  </h2>
                  <p className="text-[9.5px] uppercase font-mono tracking-widest text-slate-500 mt-1">
                    WAREHOUSE STOCK ISSUE DIRECTIONS & VERIFICATION MATRIX
                  </p>
                </div>

                {/* Basic particulars */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 p-4 rounded text-xs mb-6 font-sans">
                  <div className="space-y-1.5">
                    <p className="text-slate-450 uppercase font-mono text-[9px] font-bold tracking-wider">Informasi Pengiriman</p>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Port Pelabuhan:</span>
                      <span className="col-span-2 text-slate-950 font-bold">{spk.target_port}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Catatan Memo:</span>
                      <span className="col-span-2 text-slate-800 italic">"{spk.remarks || "Tidak ada catatan tambahan."}"</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-slate-450 uppercase font-mono text-[9px] font-bold tracking-wider">Statistik & Petugas</p>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Dibuat Oleh:</span>
                      <span className="col-span-2 text-slate-950 font-bold">{spk.created_by}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Jumlah Kapal:</span>
                      <span className="col-span-2 text-slate-950 font-bold">{spk.vessels.length} Kapal Pelayaran ({totalItemsCount} Types Parts)</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Vessel-by-Vessel picking checklist */}
                <div className="space-y-8 mt-4">
                  {spk.vessels.map((vessel, vIdx) => (
                    <div key={vIdx} className="border border-slate-300 rounded p-4">
                      
                      {/* Vessel Identifier bar */}
                      <div className="flex justify-between items-center bg-slate-900 text-white p-2 px-3 rounded-sm -mx-4 -mt-4 mb-3">
                        <span className="font-sans font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                          <Ship className="w-4 h-4 text-blue-400" /> Kapal Tujuan: {vessel.vessel_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300 font-semibold">{vessel.items.length} Macam Part</span>
                      </div>

                      {/* Pick Checklist Grid list */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 text-[9.5px] uppercase font-mono font-bold tracking-wide text-slate-500">
                            <th className="py-2 pb-1.5">Nama Suku Cadang</th>
                            <th className="py-2 pb-1.5">Nomor OEM Part</th>
                            <th className="py-2 pb-1.5 text-center w-20">Qty Pick</th>
                            <th className="py-2 pb-1.5 text-right w-44">Letak Rak & Elevasi</th>
                            <th className="py-2 pb-1.5 text-center w-20">Selesai [✓]</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {vessel.items.map((item, itemIdx) => {
                            const locInfo = getPartLocationInfo(item.spare_part_id);
                            
                            return (
                              <tr key={itemIdx} className="hover:bg-slate-550/20">
                                <td className="py-3 font-semibold text-slate-900 pr-2">
                                  {item.spare_part_name}
                                  <span className="block text-[8px] font-mono text-slate-400 uppercase mt-0.5 font-bold">ID: {item.spare_part_id}</span>
                                </td>
                                <td className="py-3 font-mono text-slate-700 font-bold">
                                  {item.part_number}
                                </td>
                                <td className="py-3 font-mono font-bold text-center text-sm text-slate-950">
                                  {item.qty_to_pick} {item.unit}
                                </td>
                                <td className="py-3 text-right font-mono">
                                  <div className="inline-flex flex-col items-end">
                                    <span className="font-extrabold text-blue-700 text-xs">Slot {locInfo.code}</span>
                                    <span className="text-[8.5px] text-slate-500 block mt-0.5">{locInfo.label}</span>
                                    <span className="text-[8px] font-sans text-slate-400 block mt-0.5 max-w-[180px] break-words text-right">{locInfo.fullDetails}</span>
                                  </div>
                                </td>
                                <td className="py-3 text-center">
                                  <div className="w-5 h-5 border border-slate-400 mx-auto rounded-sm flex items-center justify-center font-mono font-bold text-slate-600 select-none">
                                    [ ]
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                {/* Printed Signatures signatures */}
                <div className="mt-14 grid grid-cols-3 gap-8 pt-8 border-t border-slate-400 font-mono text-center text-[10.5px]">
                  <div>
                    <p className="text-slate-500">Mempersiapkan,</p>
                    <div className="h-16"></div>
                    <p className="font-bold uppercase text-slate-900 border-t border-slate-400 pt-1.5">
                      {spk.created_by}
                    </p>
                    <p className="text-[9px] text-slate-400">Logistics Administrator</p>
                  </div>

                  <div>
                    <p className="text-slate-550">Petugas Picking Picker,</p>
                    <div className="h-16"></div>
                    <p className="font-bold uppercase text-slate-900 border-t border-slate-400 pt-1.5">
                      .....................................
                    </p>
                    <p className="text-[9px] text-slate-400">Warehouse Staff Operator</p>
                  </div>

                  <div>
                    <p className="text-slate-550">Verifikasi Checker,</p>
                    <div className="h-16"></div>
                    <p className="font-bold uppercase text-slate-900 border-t border-slate-400 pt-1.5">
                      .....................................
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono-normal">Depot Head Superintendent</p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
