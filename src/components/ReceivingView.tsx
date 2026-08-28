/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  FileText, 
  Search, 
  Grid, 
  CheckCircle2, 
  AlertOctagon, 
  X, 
  ShieldAlert, 
  ArrowRight, 
  Eye, 
  Camera, 
  Truck,
  ArrowDownLeft,
  ChevronDown,
  Trash2
} from "lucide-react";
import { InboundReceiving, ReceivingStatus, SparePart, UserRole } from "../types.js";

interface ReceivingViewProps {
  receivingList: InboundReceiving[];
  parts: SparePart[];
  role: UserRole;
  onAddReceiving: (rec: Partial<InboundReceiving>) => Promise<any>;
  onVerifyReceiving: (id: string, update: { status: ReceivingStatus; items: any[]; reject_reason?: string; return_note_num?: string; signature_data_url?: string }) => Promise<any>;
  onPreviewDocument: (rec: InboundReceiving) => void;
  onDeleteReceiving?: (id: string) => Promise<any>;
}

export default function ReceivingView({
  receivingList,
  parts,
  role,
  onAddReceiving,
  onVerifyReceiving,
  onPreviewDocument,
  onDeleteReceiving
}: ReceivingViewProps) {
  const [search, setSearch] = useState("");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  // Inbound Pagination states
  const [recPage, setRecPage] = useState(1);
  const recPerPage = 8;

  React.useEffect(() => {
    setRecPage(1);
  }, [search]);

  const [activeReceiving, setActiveReceiving] = useState<InboundReceiving | null>(null);
  const [isNewRecOpen, setIsNewRecOpen] = useState(false);

  // Verification state in detail modal
  const [verificationItems, setVerificationItems] = useState<any[]>([]);
  const [overallStatus, setOverallStatus] = useState<ReceivingStatus>(ReceivingStatus.ACCEPTED);
  const [overallRejectReason, setOverallRejectReason] = useState("");
  const [returnNoteNum, setReturnNoteNum] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "#1e3a8a"; // Dark navy blue signature ink
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();

    // continuously cache drawing data
    setSignatureDataUrl(canvas.toDataURL());
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
  };

  // New PO creation state
  const [newPoForm, setNewPoForm] = useState({
    purchase_order_num: "",
    delivery_note_num: "",
    vendor_id: "vnd-1",
    selectedPartId: parts[0]?.id || "",
    qty_ordered: 5
  });

  const handleOpenVerifyModal = (rec: InboundReceiving) => {
    setActiveReceiving(rec);
    setVerificationItems(
      rec.items.map(itm => ({
        ...itm,
        qty_received: itm.qty_received || itm.qty_ordered,
        qty_rejected: itm.qty_rejected || 0,
        qc_status: itm.qc_status || "Verified",
        reject_reason: itm.reject_reason || ""
      }))
    );
    setOverallStatus(rec.status === ReceivingStatus.PENDING ? ReceivingStatus.ACCEPTED : rec.status);
    setOverallRejectReason(rec.reject_reason || "");
    setReturnNoteNum(rec.return_note_num || "");
    setPhotoUploaded(!!rec.photo_evidence_url);
    setSignatureDataUrl((rec as any).signature_data_url || "");
  };

  const handleItemQtyChange = (idx: number, qtyReceived: number) => {
    const updated = [...verificationItems];
    const ordered = updated[idx].qty_ordered;
    const diff = ordered - qtyReceived;
    
    updated[idx].qty_received = Math.max(0, Math.min(ordered, qtyReceived));
    updated[idx].qty_rejected = Math.max(0, diff);

    if (updated[idx].qty_rejected > 0) {
      updated[idx].qc_status = "Rejected";
      if (!updated[idx].reject_reason) {
        updated[idx].reject_reason = "Physical dimension mismatch / carriage box compromised";
      }
    } else {
      updated[idx].qc_status = "Verified";
      updated[idx].reject_reason = "";
    }
    setVerificationItems(updated);

    // Auto calculate overall status
    const anyRejected = updated.some(u => u.qty_rejected > 0);
    if (anyRejected) {
      setOverallStatus(ReceivingStatus.PARTIAL_REJECT);
    } else {
      setOverallStatus(ReceivingStatus.ACCEPTED);
    }
  };

  const handleCommitVerification = async () => {
    if (!activeReceiving) return;

    try {
      await onVerifyReceiving(activeReceiving.id, {
        status: overallStatus,
        items: verificationItems,
        reject_reason: overallRejectReason || (overallStatus !== ReceivingStatus.ACCEPTED ? "Quality inspection partial/full rejection logged" : ""),
        return_note_num: overallStatus !== ReceivingStatus.ACCEPTED ? returnNoteNum || `RET-${Date.now().toString().slice(-4)}` : "",
        signature_data_url: signatureDataUrl
      });
      setActiveReceiving(null);
    } catch (err: any) {
      alert(err.message || "Failed to commit verification");
    }
  };

  const handleCreateInboundPo = async () => {
    if (!newPoForm.purchase_order_num) {
      alert("PO number is required");
      return;
    }

    try {
      const part = parts.find(p => p.id === newPoForm.selectedPartId) || parts[0];
      await onAddReceiving({
        purchase_order_num: newPoForm.purchase_order_num,
        delivery_note_num: newPoForm.delivery_note_num || `DN-${Math.floor(1000 + Math.random() * 9000)}`,
        vendor_id: part.vendor_id,
        items: [{
          spare_part_id: part.id,
          spare_part_name: part.part_name,
          part_number: part.part_number,
          qty_ordered: Number(newPoForm.qty_ordered),
          qty_received: 0,
          qty_rejected: 0,
          qc_status: "Pending"
        }]
      });
      setIsNewRecOpen(false);
      setNewPoForm({
        purchase_order_num: "",
        delivery_note_num: "",
        vendor_id: "vnd-1",
        selectedPartId: parts[0]?.id || "",
        qty_ordered: 5
      });
    } catch(e: any) {
      alert(e.message || "Failed to submit inbound PO");
    }
  };

  const filtered = receivingList.filter(r => 
    r.purchase_order_num.toLowerCase().includes(search.toLowerCase()) || 
    r.delivery_note_num.toLowerCase().includes(search.toLowerCase()) || 
    r.vendor_name.toLowerCase().includes(search.toLowerCase())
  );

  const recTotalPages = Math.ceil(filtered.length / recPerPage);
  const paginatedRec = filtered.slice((recPage - 1) * recPerPage, recPage * recPerPage);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* Module Title */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
            Inbound Receiving & Warehousing
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Execute goods acceptance audits, physical item barcode matching, and log logistics returns
          </p>
        </div>

        {/* PO Creation Trigger */}
        {role !== UserRole.VESSEL_CREW && (
          <button
            onClick={() => setIsNewRecOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-extrabold px-5 py-3 rounded-lg shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-blue-300" />
            Simulate Inbound Delivery
          </button>
        )}
      </div>

      {/* Advanced search and filters bar */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-3 items-center shrink-0 shadow-xs no-print">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search PO references, carrier bills, or manufacturer names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-blue-605 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>
        <div className="ml-auto text-[10px] text-slate-450 font-mono tracking-wider font-extrabold uppercase">
          {filtered.length} Deliveries Pending Check-In
        </div>
      </section>

      {/* Main Receiving Orders data grid */}
      <section className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Truck className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase font-mono tracking-widest">
              Consignments Cargo Manifest verification ledger
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs italic font-mono uppercase">
              No cargo consignments currently logged under active transport lanes.
            </div>
          ) : (
             <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-mono font-extrabold text-slate-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-3.5 w-10 text-center bg-slate-50">NO</th>
                  <th className="p-3.5">Purchase Order</th>
                  <th className="p-3.5">Delivery Airbill (Note)</th>
                  <th className="p-3.5">Supplying Vendor</th>
                  <th className="p-3.5">Consigned Parts</th>
                  <th className="p-3.5">Inbound Date</th>
                  <th className="p-3.5 text-center">Audit Status</th>
                  <th className="p-3.5 text-right no-print">Actions Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {paginatedRec.map((item, idx) => {
                  const itemsCount = item.items.length;
                  const totalUnits = item.items.reduce((sum, i) => sum + i.qty_ordered, 0);

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors font-semibold">
                      <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{(recPage - 1) * recPerPage + idx + 1}</td>
                      <td className="p-3.5 font-mono text-blue-600 font-bold">{item.purchase_order_num}</td>
                      <td className="p-3.5 font-mono text-slate-550">{item.delivery_note_num}</td>
                      <td className="p-3.5 truncate max-w-[150px]">{item.vendor_name}</td>
                      <td className="p-3.5">
                        <span className="font-bold block text-slate-900">{itemsCount} uniquely referenced SKUs</span>
                        <span className="text-[10px] text-slate-400 font-mono">({totalUnits} aggregate physical units package)</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 truncate">
                        {new Date(item.received_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider shadow-2xs inline-block ${
                          item.status === ReceivingStatus.PENDING ? "bg-amber-100 text-amber-800 border border-amber-250 font-black"
                          : item.status === ReceivingStatus.ACCEPTED ? "bg-emerald-100 text-emerald-800 border border-emerald-250"
                          : item.status === ReceivingStatus.PARTIAL_REJECT ? "bg-orange-100 text-orange-800 border border-orange-250"
                          : "bg-rose-100 text-rose-800 border border-rose-250"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right no-print relative">
                        <div className="flex items-center justify-end">
                          {item.status === ReceivingStatus.PENDING && role === UserRole.VESSEL_CREW ? (
                            <span className="text-slate-400 font-mono italic text-[11px]">Waiting HQ Inspector</span>
                          ) : (
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
                                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-250 rounded-lg shadow-xl z-50 overflow-hidden text-left py-1.5 text-slate-700 animate-in fade-in duration-100 ring-1 ring-black/5">
                                    {item.status === ReceivingStatus.PENDING ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          handleOpenVerifyModal(item);
                                        }}
                                        className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Verify Cargo</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          
                                          // Simulate converting receiving data to custom document context
                                          const mappedDispatchLike: any = {
                                            id: item.id,
                                            request_reference: item.purchase_order_num,
                                            vessel_name: "Tanjung Priok HQ Depot Storage",
                                            consignee: "Inbound Check-in verification slip",
                                            items: item.items,
                                            status: item.status,
                                            bon_pengeluaran_number: item.return_note_num || "INBOUND-PASS",
                                            manifest_number: item.delivery_note_num,
                                            surat_jalan_number: "PO-VERIFIED",
                                            created_by: item.created_by
                                          };
                                          onPreviewDocument(mappedDispatchLike);
                                        }}
                                        className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-550" />
                                        <span>View Slip</span>
                                      </button>
                                    )}

                                    {onDeleteReceiving && (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          if (confirm(`Apakah Anda yakin ingin menghapus data Penerimaan Barang PO [${item.purchase_order_num}]?`)) {
                                            await onDeleteReceiving(item.id);
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-xs font-semibold hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors text-left border-t border-slate-100"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Hapus Data</span>
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar for Inbound/Receiving */}
        <div className="bg-white border-t border-slate-200 px-6 py-4.5 flex items-center justify-between font-mono text-[11px] font-bold shrink-0 shadow-2xs no-print">
          <span className="text-slate-450 uppercase tracking-widest leading-none text-[10px] font-black">
            TOTAL REKOR DATA: {filtered.length} INBOUND
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={recPage === 1}
              onClick={() => setRecPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-slate-500">
              Halaman {recPage} dari {recTotalPages || 1}
            </span>
            <button
              disabled={recPage === recTotalPages || recTotalPages <= 1}
              onClick={() => setRecPage(p => Math.min(recTotalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </section>

      {/* DETAIL MODAL: QA VERIFICATION OF INBOUND SPARE SHIPMENTS */}
      {activeReceiving && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col border border-slate-200">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-semibold text-xs uppercase tracking-widest">
                  QA Cargo Inspection Audit Checklist: {activeReceiving.purchase_order_num}
                </h3>
              </div>
              <button onClick={() => setActiveReceiving(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh] font-sans">
              
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 border border-slate-150 rounded text-xs select-none leading-relaxed">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Inbound Particulars</p>
                  <p className="text-slate-900 font-bold">PO Code: {activeReceiving.purchase_order_num}</p>
                  <p className="text-slate-655 mt-0.5">Delivery Note Airbill: {activeReceiving.delivery_note_num}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Manufacturer / Vendor</p>
                  <p className="text-slate-950 font-extrabold">{activeReceiving.vendor_name}</p>
                  <p className="text-slate-400 mt-0.5 font-mono text-[9.5px]">Awaiting active ledger update authorization</p>
                </div>
              </div>

              {/* Items Verification check boxes */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Physical item SKU checks & quantity check-in verification
                </h4>

                <div className="border border-slate-200 rounded divide-y divide-slate-100 overflow-hidden">
                  {verificationItems.map((vItem, idx) => (
                    <div key={idx} className="p-4 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0 pr-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                          {vItem.part_number}
                        </span>
                        <p className="font-bold text-xs text-slate-900 mt-1">{vItem.spare_part_name}</p>
                        <p className="text-[10.5px] italic text-slate-400 mt-0.5">Ordered SKU volume: {vItem.qty_ordered} units</p>
                      </div>

                      {/* QC inputs */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col">
                          <label className="text-[9px] pb-1 uppercase font-bold text-slate-400 text-right">Qty Received Verified</label>
                          <input 
                            type="number" 
                            value={vItem.qty_received}
                            onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 p-1 w-20 text-center font-mono font-bold text-xs text-slate-950 rounded"
                          />
                        </div>

                        <div className="flex flex-col text-right pr-2">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Rejected</span>
                          <span className={`font-mono text-sm font-bold ${vItem.qty_rejected > 0 ? "text-red-500" : "text-slate-400"}`}>
                            {vItem.qty_rejected}
                          </span>
                        </div>

                        {/* Rejected reason line */}
                        {vItem.qty_rejected > 0 && (
                          <div className="flex flex-col">
                            <label className="text-[9px] pb-1 uppercase font-bold text-red-505">Reject Reason</label>
                            <input 
                              type="text" 
                              required
                              value={vItem.reject_reason || ""}
                              onChange={(e) => {
                                const up = [...verificationItems];
                                up[idx].reject_reason = e.target.value;
                                setVerificationItems(up);
                              }}
                              placeholder="Friction scars / salt damage"
                              className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 text-[11px] rounded max-w-[150px]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload evidence simulation */}
              <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold font-display uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-slate-500" />
                    Inspection Photo Evidence Log
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Must attach digital container freight snapshots for any partial/full rejection arguments
                  </p>
                </div>
                <div className="shrink-0 font-mono">
                  {photoUploaded ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Evidence Registered
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPhotoUploaded(true)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-105 text-blue-700 text-xs font-bold uppercase rounded border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      Upload Snapshot Code
                    </button>
                  )}
                </div>
              </div>

              {/* INTERACTIVE DIGITAL SIGNATURE PAD */}
              <div className="bg-slate-50 border border-slate-205 rounded p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold font-display uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                      Digital Endorsement Signature Pad
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Authorize cargo check-in with your official hand-drawn signature
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                  >
                    Clear Slate
                  </button>
                </div>
                
                <div className="relative border border-slate-205 rounded bg-white overflow-hidden shadow-inner h-[120px] cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full block"
                  />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[85%] border-b border-dashed border-slate-300 pointer-events-none text-center pb-0.5 select-none">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                      Draw above this verification seal line
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Action decision */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 font-mono select-none">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Overall Admission Decision Status
                  </label>
                  <select
                    value={overallStatus}
                    onChange={(e) => setOverallStatus(e.target.value as ReceivingStatus)}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-bold font-mono tracking-tight text-slate-800 cursor-pointer"
                  >
                    <option value={ReceivingStatus.ACCEPTED}>Accepted (All items verified)</option>
                    <option value={ReceivingStatus.PARTIAL_REJECT}>Partial Reject (Accept survivors, generate returns)</option>
                    <option value={ReceivingStatus.FULL_REJECT}>Full Reject (Reject whole batch load)</option>
                  </select>
                </div>

                {overallStatus !== ReceivingStatus.ACCEPTED && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-red-500 block mb-1">
                      Return Note Serial & Rejection Remarks
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        value={returnNoteNum}
                        onChange={(e) => setReturnNoteNum(e.target.value)}
                        placeholder="RET-2026-991A" 
                        className="bg-slate-50 border border-slate-250 text-xs px-2 py-1.5 rounded w-1/2 font-mono"
                      />
                      <input 
                        type="text" 
                        required
                        value={overallRejectReason}
                        onChange={(e) => setOverallRejectReason(e.target.value)}
                        placeholder="E.g. Broken sealing" 
                        className="bg-slate-50 border border-slate-250 text-xs px-2 py-1.5 rounded w-1/2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons and confirmation */}
              <div className="bg-slate-900 border-t border-slate-100 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setActiveReceiving(null)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitVerification}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer leading-none"
                >
                  Authorize Check-In to Storage
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* NEW INBOUND DELIVERY MODAL */}
      {isNewRecOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-850 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-205">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-rose-950">
              <h3 className="font-display font-semibold text-xs uppercase tracking-widest flex items-center gap-1">
                Simulate PO Inbound freight consignment
              </h3>
              <button onClick={() => setIsNewRecOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Purchase Order (PO) Identifier Serial *
                </label>
                <input
                  type="text"
                  required
                  value={newPoForm.purchase_order_num}
                  onChange={(e) => setNewPoForm({ ...newPoForm, purchase_order_num: e.target.value })}
                  placeholder="PO-2026-X9921"
                  className="w-full bg-slate-50 border border-slate-250 p-2 text-xs font-mono font-bold text-slate-800 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Delivery Airbill / Note Code
                </label>
                <input
                  type="text"
                  value={newPoForm.delivery_note_num}
                  onChange={(e) => setNewPoForm({ ...newPoForm, delivery_note_num: e.target.value })}
                  placeholder="DN-VND-442"
                  className="w-full bg-slate-50 border border-slate-250 p-2 text-xs font-mono rounded"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Select Spare Item for Inbound check-in
                </label>
                <select
                  value={newPoForm.selectedPartId}
                  onChange={(e) => setNewPoForm({ ...newPoForm, selectedPartId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 p-2 text-xs text-slate-950 font-bold rounded cursor-pointer"
                >
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.part_name} ({p.part_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Quantity for transport consignment
                </label>
                <input
                  type="number"
                  value={newPoForm.qty_ordered}
                  onChange={(e) => setNewPoForm({ ...newPoForm, qty_ordered: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-250 p-2 text-xs text-slate-900 font-mono rounded"
                />
              </div>

              <div className="bg-slate-900 border-t border-slate-200 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setIsNewRecOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCreateInboundPo}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Queue Inbound Entry
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
