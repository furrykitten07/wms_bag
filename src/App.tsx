/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  api, 
  setCurrentUserHeader, 
  getCurrentUserHeader 
} from "./api.js";
import { 
  User, 
  UserRole, 
  SparePart, 
  WarehouseLocation, 
  Vendor, 
  InboundReceiving, 
  OutboundDispatch, 
  VesselRequest, 
  ApprovalTask, 
  MovementLedgerEntry, 
  AuditLog, 
  ReceivingStatus, 
  DispatchStatus,
  SPKWorkOrder,
  MaterialRequest,
  MaterialRequestStatus,
  MaterialReturn,
  MaterialReturnStatus,
  DigitalSignature
} from "./types.js";
import { ChevronRight, ShieldAlert, CheckCircle } from "lucide-react";

// Import modular sub-components
import Sidebar from "./components/Sidebar.js";
import Header from "./components/Header.js";
import DashboardView from "./components/DashboardView.js";
import MasterPartsView from "./components/MasterPartsView.js";
import ReceivingView from "./components/ReceivingView.js";
import DispatchView from "./components/DispatchView.js";
import LedgerView from "./components/LedgerView.js";
import PrintDocument from "./components/PrintDocument.js";
import LoginView from "./components/LoginView.js";
import ReportsView from "./components/ReportsView.js";
import SPKView from "./components/SPKView.js";
import MaterialRequestView from "./components/MaterialRequestView.js";
import MaterialRequestTUG6View from "./components/MaterialRequestTUG6View.js";
import MaterialReturnView from "./components/MaterialReturnView.js";
import SparePartCatalogView from "./components/SparePartCatalogView.js";
import UsersManagementView from "./components/UsersManagementView.js";
import SignatureManagementView from "./components/SignatureManagementView.js";

import { AlertCircle, RefreshCw, Layers } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Global search managed in Header
  const [searchValue, setSearchValue] = useState<string>("");

  // Simulated actors list & current active profile
  const [simulatedUsers, setSimulatedUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Navigation Auto Open Request Detail State
  const [autoOpenMRId, setAutoOpenMRId] = useState<string | null>(null);

  // In-Memory dynamic DB tables
  const [parts, setParts] = useState<SparePart[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [receivingList, setReceivingList] = useState<InboundReceiving[]>([]);
  const [dispatchList, setDispatchList] = useState<OutboundDispatch[]>([]);
  const [requests, setRequests] = useState<VesselRequest[]>([]);
  const [approvals, setApprovals] = useState<ApprovalTask[]>([]);
  const [ledger, setLedger] = useState<MovementLedgerEntry[]>([]);
  const [spkList, setSpkList] = useState<SPKWorkOrder[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [materialRequestsTUG6, setMaterialRequestsTUG6] = useState<MaterialRequest[]>([]);
  const [materialReturns, setMaterialReturns] = useState<MaterialReturn[]>([]);
  const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
  
  // Dashboard summary combined calculations
  const [summary, setSummary] = useState<any>({
    totalParts: 0,
    lowStockParts: 0,
    pendingApprovalsCount: 0,
    activeDispatchesCount: 0,
    totalReceivingCount: 0,
    lowStockAlerts: [],
    recentActivities: []
  });

  // Printable Document Modal State
  const [printDoc, setPrintDoc] = useState<{
    isOpen: boolean;
    type: "bon" | "surat_jalan" | "manifest" | "stock_report" | "mutation_report" | "spk_report" | "tug5" | "tug6" | "tug10";
    data?: any;
    inventoryList?: SparePart[];
    mutationList?: any[];
    stats?: any;
    timeFilter?: string;
    selectedDocTypes?: {
      inbound?: boolean;
      tug5?: boolean;
      tug8?: boolean;
      tug10?: boolean;
    };
  }>({
    isOpen: false,
    type: "stock_report"
  });

  // Initial Boot-up Sync loader
  useEffect(() => {
    bootApp();
  }, []);

  const bootApp = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch User directory
      const usrList = await api.getUsers();
      setSimulatedUsers(usrList);
      
      // Restore user session if stored in localStorage
      const savedUser = localStorage.getItem("wms_username");
      if (savedUser) {
        const matchedSelf = usrList.find(u => u.username === savedUser);
        if (matchedSelf) {
          setCurrentUser(matchedSelf);
          setIsAuthenticated(true);
          setCurrentUserHeader(matchedSelf.username);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }

      // 2. Fetch full static lists
      const locList = await api.getLocations();
      setLocations(locList);

      const vendList = await api.getVendors();
      setVendors(vendList);

      // 3. Fire transactions synchronizer for all tables
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not successfully establish handshake with Express WMS Engine");
    } finally {
      setLoading(false);
    }
  };

  // Dedicated table data refresh launcher
  const syncAllTables = async () => {
    try {
      const partsData = await api.getInventory();
      setParts(partsData);

      const recData = await api.getReceiving();
      setReceivingList(recData);

      const dspData = await api.getDispatch();
      setDispatchList(dspData);

      const reqsData = await api.getRequests();
      setRequests(reqsData);

      const appvsData = await api.getApprovals();
      setApprovals(appvsData);

      const ledgData = await api.getLedger();
      const mappedLedger: MovementLedgerEntry[] = ledgData.map((x: any) => ({
        ...x,
        quantity_changed: x.qty_in > 0 ? x.qty_in : -x.qty_out,
        running_balance: x.after_stock,
        operator_username: x.created_by,
        remarks: x.remarks,
        timestamp: x.transaction_date,
        reference_code: x.reference_number
      }));
      setLedger(mappedLedger);

      const summ = await api.getDashboardSummary();
      setSummary(summ);

      const spkData = await api.getSPKs();
      setSpkList(spkData);

      const mrData = await api.getMaterialRequests();
      setMaterialRequests(mrData);

      const mrTUG6Data = await api.getMaterialRequestsTUG6();
      setMaterialRequestsTUG6(mrTUG6Data);

      const returnsData = await api.getMaterialReturns();
      setMaterialReturns(returnsData);

      const sigsData = await api.getSignatures();
      setSignatures(sigsData);

      const usrList = await api.getUsers();
      setSimulatedUsers(usrList);
      const savedUser = localStorage.getItem("wms_username");
      if (savedUser) {
        const matchedSelf = usrList.find(u => u.username === savedUser);
        if (matchedSelf) {
          setCurrentUser(matchedSelf);
          setIsAuthenticated(true);
          setCurrentUserHeader(matchedSelf.username);
        }
      }
    } catch(err: any) {
      console.error("Synch tables failed:", err);
    }
  };

  // Digital Signatures Action Handlers
  const handleAddSignature = async (data: Partial<DigitalSignature>) => {
    await api.createSignature(data);
    await syncAllTables();
  };

  const handleUpdateSignature = async (id: string, data: Partial<DigitalSignature>) => {
    await api.updateSignature(id, data);
    await syncAllTables();
  };

  const handleDeleteSignature = async (id: string) => {
    await api.deleteSignature(id);
    await syncAllTables();
  };

  const handleResetDefaultSignatures = async () => {
    await api.resetDefaultSignatures();
    await syncAllTables();
  };

  // Auth triggers
  const handleLoginSuccess = async (usernameStr: string) => {
    setLoading(true);
    try {
      localStorage.setItem("wms_username", usernameStr);
      setCurrentUserHeader(usernameStr);
      
      const matched = simulatedUsers.find(u => u.username === usernameStr);
      if (matched) {
        setCurrentUser(matched);
        setIsAuthenticated(true);
        
        // Auto routing based on tasks affinity
        if (usernameStr === "staff_gudang_1") {
          setCurrentTab("receiving");
        } else if (usernameStr === "staff_gudang_2") {
          setCurrentTab("dispatch");
        } else if (matched.role === UserRole.VESSEL_CREW) {
          setCurrentTab("material-requests");
        } else if (matched.role === UserRole.SUPERINTENDENT) {
          setCurrentTab("material-requests");
        } else {
          setCurrentTab("dashboard");
        }

        await syncAllTables();
      } else {
        alert("Otorisasi WMS gagal - operator tidak sinkron.");
      }
    } catch (err: any) {
      alert("Autentikasi gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wms_username");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentTab("dashboard");
  };

  // Handle active simulation role change
  const handleRoleChange = async (role: UserRole) => {
    const matchedUser = simulatedUsers.find(u => u.role === role);
    if (!matchedUser) return;

    setLoading(true);
    try {
      setCurrentUser(matchedUser);
      setCurrentUserHeader(matchedUser.username);
      
      // Auto target tab based on typical task affinities for role testing
      if (role === UserRole.VESSEL_CREW) {
        setCurrentTab("material-requests");
      } else if (role === UserRole.SUPERINTENDENT) {
        setCurrentTab("material-requests");
      } else {
        setCurrentTab("dashboard");
      }

      await syncAllTables();
    } catch (err: any) {
      alert("Role mapping failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // USER ACTIONS (SUPER ADMIN ONLY)
  const handleCreateUser = async (uData: Partial<User>) => {
    await api.createUser(uData);
    await syncAllTables();
  };

  const handleUpdateUser = async (id: string, uData: Partial<User>) => {
    await api.updateUser(id, uData);
    await syncAllTables();
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    await syncAllTables();
  };

  // PARTS ACTION: CREATE
  const handleAddPart = async (partData: Partial<SparePart>) => {
    await api.createSparePart(partData);
    await syncAllTables();
  };

  // PARTS ACTION: UPDATE & ADJUST STATE
  const handleUpdatePart = async (id: string, partData: Partial<SparePart>) => {
    await api.updateSparePart(id, partData);
    await syncAllTables();
  };

  // PARTS ACTION: HARD PURGE
  const handleDeletePart = async (id: string) => {
    await api.deleteSparePart(id);
    await syncAllTables();
  };

  // VENDOR ACTION: REGISTER
  const handleAddVendor = async (vData: Partial<Vendor>) => {
    await api.createVendor(vData);
    await syncAllTables();
  };

  // LOCATIONS ACTIONS
  const handleAddLocation = async (locData: Partial<WarehouseLocation>) => {
    await api.createLocation(locData);
    await syncAllTables();
  };

  const handleUpdateLocation = async (id: string, locData: Partial<WarehouseLocation>) => {
    await api.updateLocation(id, locData);
    await syncAllTables();
  };

  const handleDeleteLocation = async (id: string) => {
    await api.deleteLocation(id);
    await syncAllTables();
  };

  // SPK WORK ORDERS ACTIONS
  const handleAddSPK = async (spkData: Partial<SPKWorkOrder>) => {
    const fresh = await api.createSPK(spkData);
    await syncAllTables();
    return fresh;
  };

  const handleUpdateSPK = async (id: string, spkData: Partial<SPKWorkOrder>) => {
    const updated = await api.updateSPK(id, spkData);
    await syncAllTables();
    return updated;
  };

  const handleDeleteSPK = async (id: string) => {
    await api.deleteSPK(id);
    await syncAllTables();
  };

  // RECEIVING ACTION: SIMULATE NEW ARRIVAL DELIVERY
  const handleAddReceiving = async (recData: Partial<InboundReceiving>) => {
    const created = await api.createReceiving(recData);
    if (created && created.id) {
      setReceivingList(prev => [created, ...prev.filter(r => r && r.id !== created.id)]);
    }
    await syncAllTables();
    return created;
  };

  // RECEIVING ACTION: QC VERIFY & COMMIT TO PHYSICAL STORAGE
  const handleVerifyReceiving = async (
    id: string, 
    update: Partial<InboundReceiving>
  ) => {
    await api.updateReceiving(id, update);
    await syncAllTables();
  };

  const handleDeleteReceiving = async (id: string) => {
    try {
      await api.deleteReceiving(id);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menghapus data penerimaan");
    }
  };

  // DISPATCH ACTION: LOGISTICS ADVANCEMENT & STOCK RESERVATION EXCLUSION
  const handleUpdateDispatch = async (
    id: string, 
    update: Partial<OutboundDispatch>
  ) => {
    await api.updateDispatch(id, update);
    await syncAllTables();
  };

  const handleCreateDispatch = async (data: Partial<OutboundDispatch>) => {
    await api.createDispatch(data);
    await syncAllTables();
  };

  const handleDeleteDispatch = async (id: string) => {
    try {
      await api.deleteDispatch(id);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menghapus data pengeluaran");
    }
  };

  // REQUISITIONS ACTION: VESSEL CREW SUBMITS SUPPLY ORDER
  const handleSubmitVesselRequest = async (reqData: Partial<VesselRequest>) => {
    await api.createRequest(reqData);
    await syncAllTables();
  };

  // APPROVAL WORKFLOW ACTION: SUPERINTENDENT AUTHS DISBURSEMENT
  const handleApproveRejectTask = async (id: string, decision: "Approved" | "Rejected", remarks?: string) => {
    await api.submitApprovalDecision(id, decision, remarks);
    await syncAllTables();
  };

  // DASHBOARD ALERTS QUICK REORDER ACTION
  const handleQuickOrder = async (partId: string) => {
    const targetPart = parts.find(p => p.id === partId);
    if (!targetPart) return;

    try {
      const orderQty = Math.max(5, targetPart.maximum_stock - targetPart.current_stock);
      await api.createReceiving({
        purchase_order_num: `PO-QUICK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        delivery_note_num: `DN-Q-${Math.floor(100 + Math.random() * 900)}`,
        vendor_id: targetPart.vendor_id,
        items: [{
          spare_part_id: targetPart.id,
          spare_part_name: targetPart.part_name,
          part_number: targetPart.part_number,
          qty_ordered: orderQty,
          qty_received: 0,
          qty_rejected: 0,
          qc_status: "Pending"
        }]
      });
      alert(`Requested quick cargo reorder of ${orderQty} SET/PCS for: ${targetPart.part_name}. Created pending Inbound PO.`);
      setCurrentTab("receiving");
      await syncAllTables();
    } catch (e: any) {
      alert("Failed quick booking: " + e.message);
    }
  };

  // Open Document Modal helpers
  const handleOpenReportDoc = () => {
    setPrintDoc({
      isOpen: true,
      type: "stock_report",
      inventoryList: parts
    });
  };

  const handleOpenDispatchDoc = (type: "bon" | "surat_jalan" | "manifest", data: OutboundDispatch) => {
    setPrintDoc({
      isOpen: true,
      type,
      data
    });
  };

  const handleCreateMaterialRequest = async (data: Partial<MaterialRequest>) => {
    try {
      await api.createMaterialRequest(data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create material request");
    }
  };

  const handleCreateMaterialRequestBatch = async (data: Partial<MaterialRequest>[]) => {
    try {
      await api.createMaterialRequestBatch(data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to batch create material requests");
    }
  };

  const handleUpdateMaterialRequest = async (id: string, data: Partial<MaterialRequest>) => {
    try {
      await api.updateMaterialRequest(id, data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update material request");
    }
  };

  const handleDeleteMaterialRequest = async (id: string) => {
    try {
      await api.deleteMaterialRequest(id);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete material request");
    }
  };

  const handleLogMRAction = async (id: string, action: "Printed" | "Downloaded") => {
    try {
      await api.logMaterialRequestAction(id, action);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePreviewTUG5 = (request: MaterialRequest) => {
    setPrintDoc({
      isOpen: true,
      type: "tug5",
      data: request
    });
  };

  // Material Request (TUG 6) Event Handlers
  const handleCreateMaterialRequestTUG6 = async (data: Partial<MaterialRequest>) => {
    try {
      await api.createMaterialRequestTUG6(data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create TUG 6 material request");
    }
  };

  const handleCreateMaterialRequestTUG6Batch = async (data: Partial<MaterialRequest>[]) => {
    try {
      await api.createMaterialRequestTUG6Batch(data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to batch create TUG 6 material requests");
    }
  };

  const handleUpdateMaterialRequestTUG6 = async (id: string, data: Partial<MaterialRequest>) => {
    try {
      await api.updateMaterialRequestTUG6(id, data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update TUG 6 material request");
    }
  };

  const handleDeleteMaterialRequestTUG6 = async (id: string) => {
    try {
      await api.deleteMaterialRequestTUG6(id);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete TUG 6 material request");
    }
  };

  const handleLogMR6Action = async (id: string, action: "Printed" | "Downloaded") => {
    try {
      await api.logMaterialRequestTUG6Action(id, action);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePreviewTUG6 = (request: MaterialRequest) => {
    setPrintDoc({
      isOpen: true,
      type: "tug6",
      data: request
    });
  };

  // Material Return (TUG 10) Event Handlers
  const handleCreateMaterialReturn = async (data: Partial<MaterialReturn>) => {
    try {
      await api.createMaterialReturn(data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create material return");
    }
  };

  const handleUpdateMaterialReturn = async (id: string, data: Partial<MaterialReturn>) => {
    try {
      await api.updateMaterialReturn(id, data);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update material return");
    }
  };

  const handleDeleteMaterialReturn = async (id: string) => {
    try {
      await api.deleteMaterialReturn(id);
      await syncAllTables();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete material return");
    }
  };

  const handlePreviewTUG10 = (ret: MaterialReturn) => {
    setPrintDoc({
      isOpen: true,
      type: "tug10",
      data: ret
    });
  };

  // Spinner Screen
  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 font-mono selection:bg-rose-500">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">MARE-WMS SYSTEM RECONCILING</h2>
        <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">Syncing local data structures with backend in-memory databases...</p>
      </div>
    );
  }

  // Intercept and display login if unauthenticated or active user is state-null
  if (!isAuthenticated || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} loading={loading} />;
  }

  // Error boundary Screen
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 font-mono">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-red-400">WMS Connection Error</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-md text-center bg-slate-900 border border-slate-800 p-4 rounded leading-relaxed">{error}</p>
        <button 
          onClick={bootApp}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded transition-colors cursor-pointer"
        >
          Retry Connection handshake
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-850 overflow-hidden print:h-auto print:overflow-visible font-sans">
      
      {/* Main UI Layout wrapper (hides during browser print) */}
      <div className="flex-1 flex flex-col overflow-hidden no-print">
        {/* Absolute Navbar Header */}
        <Header 
          currentUser={currentUser!} 
          onLogout={handleLogout}
        />

        {/* Main Structural Frame split */}
        <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar Drawer */}
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={setCurrentTab}
          currentUser={currentUser!}
          counts={{
            pendingApprovals: summary.pendingApprovalsCount,
            lowStock: summary.lowStockParts,
            activeDispatches: summary.activeDispatchesCount
          }}
        />

        {/* Active Application tab switches */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
          
          {/* Interactive Per-TUG Digital Signature Notification Banner */}
          {currentUser && (() => {
            const u = (currentUser.username || "").toLowerCase();
            const r = (currentUser.role || "").toLowerCase();
            
            // Check if document needs ANY signature in the 3-level approval hierarchy
            const isPending = (doc: any) => {
              if (!doc || doc.status === "Rejected") return false;
              return !doc.alfin_signed || !doc.emir_signed || !doc.sumbono_signed;
            };

            // Check if action is specifically waiting on current user's level
            const isActionRequiredForMe = (doc: any) => {
              if (!doc || doc.status === "Rejected") return false;
              if (u.includes("alfin") || r.includes("kepala") || r.includes("verifikator") || r.includes("petugas")) return !doc.alfin_signed;
              if (u.includes("emir") || r.includes("manager")) return doc.alfin_signed && !doc.emir_signed;
              if (u.includes("sumbono") || r.includes("vp")) return doc.emir_signed && !doc.sumbono_signed;
              return !doc.alfin_signed || !doc.emir_signed || !doc.sumbono_signed;
            };

            const tug5 = (materialRequests || []).filter(isPending).length;
            const tug6 = (materialRequestsTUG6 || []).filter(isPending).length;
            const tug8 = (dispatchList || []).filter(isPending).length;
            const tug10 = (materialReturns || []).filter(isPending).length;
            const total = tug5 + tug6 + tug8 + tug10;

            const myTug5Action = (materialRequests || []).filter(isActionRequiredForMe).length;
            const myTug6Action = (materialRequestsTUG6 || []).filter(isActionRequiredForMe).length;
            const myTug8Action = (dispatchList || []).filter(isActionRequiredForMe).length;
            const myTug10Action = (materialReturns || []).filter(isActionRequiredForMe).length;
            const myTotalAction = myTug5Action + myTug6Action + myTug8Action + myTug10Action;

            return (
              <div className="bg-slate-900 text-slate-100 px-6 py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800 shadow-sm shrink-0 font-sans">
                
                {/* Left: Icon & Notification Summary */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg border text-sm flex items-center justify-center shrink-0 ${
                    myTotalAction > 0 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse" 
                      : total > 0 
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}>
                    <ShieldAlert className="w-4.5 h-4.5" />
                  </div>

                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 uppercase tracking-wide text-[11px] font-mono">
                        Status TTD Digital Berjenjang
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">•</span>
                      <span className="text-slate-300 text-[11px] font-medium">
                        <strong className="text-slate-100 font-bold">{currentUser.name}</strong>
                        <span className="text-slate-400 ml-1">({currentUser.role})</span>
                      </span>
                    </div>

                    <div className="text-[11px] font-sans mt-0.5 flex items-center gap-2 flex-wrap">
                      {total > 0 ? (
                        <>
                          <span className="text-amber-300 font-semibold flex items-center gap-1">
                            ⚠️ Terdapat <strong className="text-amber-300 font-bold">{total}</strong> Dokumen TUG belum lengkap TTD Digital
                          </span>
                          {myTotalAction > 0 && (
                            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              {myTotalAction} Siap Anda Setujui
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Seluruh Dokumen TUG telah lengkap diverifikasi & ditandatangani secara digital.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Modern Compact Quick Filter Navigation Pills */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-1 hidden sm:inline">
                    Quick Filter:
                  </span>

                  {/* TUG 5 */}
                  <button
                    onClick={() => setCurrentTab("material-requests")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
                      currentTab === "material-requests"
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-sm ring-2 ring-indigo-500/30"
                        : tug5 > 0
                        ? "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
                        : "bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-800"
                    }`}
                    title="Buka Permintaan Barang TUG 5"
                  >
                    <span>📄 TUG 5</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                      tug5 > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"
                    }`}>
                      {tug5 > 0 ? `${tug5} Pending` : "✓ Complete"}
                    </span>
                  </button>

                  {/* TUG 6 */}
                  <button
                    onClick={() => setCurrentTab("material-requests-tug6")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
                      currentTab === "material-requests-tug6"
                        ? "bg-purple-600 text-white border-purple-400 shadow-sm ring-2 ring-purple-500/30"
                        : tug6 > 0
                        ? "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
                        : "bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-800"
                    }`}
                    title="Buka Requisition TUG 6"
                  >
                    <span>📑 TUG 6</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                      tug6 > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"
                    }`}>
                      {tug6 > 0 ? `${tug6} Pending` : "✓ Complete"}
                    </span>
                  </button>

                  {/* TUG 8 */}
                  <button
                    onClick={() => setCurrentTab("dispatch")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
                      currentTab === "dispatch"
                        ? "bg-blue-600 text-white border-blue-400 shadow-sm ring-2 ring-blue-500/30"
                        : tug8 > 0
                        ? "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
                        : "bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-800"
                    }`}
                    title="Buka Dispatch TUG 8"
                  >
                    <span>🚚 TUG 8</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                      tug8 > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"
                    }`}>
                      {tug8 > 0 ? `${tug8} Pending` : "✓ Complete"}
                    </span>
                  </button>

                  {/* TUG 10 */}
                  <button
                    onClick={() => setCurrentTab("material-returns")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
                      currentTab === "material-returns"
                        ? "bg-emerald-600 text-white border-emerald-400 shadow-sm ring-2 ring-emerald-500/30"
                        : tug10 > 0
                        ? "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
                        : "bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-800"
                    }`}
                    title="Buka Pengembalian TUG 10"
                  >
                    <span>🔄 TUG 10</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                      tug10 > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"
                    }`}>
                      {tug10 > 0 ? `${tug10} Pending` : "✓ Complete"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}
          
          {/* Dashboard Tab */}
          {currentTab === "dashboard" && (
            <DashboardView 
              summary={{
                ...summary,
                tug5Count: materialRequests.length,
                tug6Count: materialRequestsTUG6.length,
                tug8Count: dispatchList.length,
                tug10Count: materialReturns.length
              }}
              materialRequests={materialRequests}
              materialRequestsTUG6={materialRequestsTUG6}
              dispatches={dispatchList}
              materialReturns={materialReturns}
              spkList={spkList}
              onQuickOrder={handleQuickOrder}
              onNavigateTab={setCurrentTab}
              onProcessTUG5={(req) => {
                setAutoOpenMRId(req.id);
                setCurrentTab("material-requests");
              }}
              onRefresh={syncAllTables}
              loading={loading}
            />
          )}

          {/* Master records inventory subtabs */}
          {currentTab === "master-parts" && (
            <MasterPartsView 
              parts={parts}
              locations={locations}
              vendors={vendors}
              role={currentUser!.role}
              onAddPart={handleAddPart}
              onUpdatePart={handleUpdatePart}
              onDeletePart={handleDeletePart}
              onAddVendor={handleAddVendor}
              onExportStockReport={handleOpenReportDoc}
              onAddLocation={handleAddLocation}
              onUpdateLocation={handleUpdateLocation}
              onDeleteLocation={handleDeleteLocation}
            />
          )}

          {/* Sparepart Catalog View */}
          {currentTab === "sparepart-catalog" && (
            <SparePartCatalogView parts={parts} />
          )}

          {/* Receiving inbound queue */}
          {currentTab === "receiving" && (
            <ReceivingView 
              receivingList={receivingList}
              parts={parts}
              spkList={spkList}
              locations={locations}
              role={currentUser!.role}
              onAddReceiving={handleAddReceiving}
              onAddPart={handleAddPart}
              onVerifyReceiving={handleVerifyReceiving}
              onDeleteReceiving={handleDeleteReceiving}
              onPreviewDocument={(rec) => {
                setPrintDoc({
                  isOpen: true,
                  type: "manifest",
                  data: rec
                });
              }}
            />
          )}

          {/* Dispatch outbound routing tracking */}
          {currentTab === "dispatch" && (
            <DispatchView 
              dispatchList={dispatchList}
              role={currentUser!.role}
              onUpdateDispatch={handleUpdateDispatch}
              onCreateDispatch={handleCreateDispatch}
              onDeleteDispatch={handleDeleteDispatch}
              onPreviewDocument={handleOpenDispatchDoc}
              parts={parts}
              requests={materialRequests}
              requestsTUG6={materialRequestsTUG6}
              receivingList={receivingList}
              onPreviewTUG5={(req) => setPrintDoc({ isOpen: true, type: "tug5", data: req })}
              onPreviewTUG6={(req) => setPrintDoc({ isOpen: true, type: "tug6", data: req })}
              spkList={spkList}
              onUpdateSPK={handleUpdateSPK}
              materialReturns={materialReturns}
              onUpdateReturn={handleUpdateMaterialReturn}
            />
          )}

          {/* SPK (Surat Perintah Kerja) Work Orders */}
          {currentTab === "spk-orders" && (
            <SPKView 
              spkList={spkList}
              parts={parts}
              locations={locations}
              role={currentUser!.role}
              onAddSPK={handleAddSPK}
              onUpdateSPK={handleUpdateSPK}
              onDeleteSPK={handleDeleteSPK}
              onUpdatePart={handleUpdatePart}
            />
          )}

          {/* Absolute ledger tracking trail */}
          {currentTab === "ledger" && (
            <LedgerView 
              movements={ledger}
              parts={parts}
            />
          )}

          {/* Integrated Stock Reports (Keluar Masuk & Per SPK TUG) */}
          {currentTab === "reports" && (
            <ReportsView 
              movements={ledger}
              parts={parts}
              receivingList={receivingList}
              dispatchList={dispatchList}
              spkList={spkList}
              materialRequests={materialRequests}
              materialReturns={materialReturns}
              onPrintReport={(filteredMovements, stats, timeFilter, selectedDocTypes) => {
                setPrintDoc({
                  isOpen: true,
                  type: "mutation_report",
                  mutationList: filteredMovements,
                  stats,
                  timeFilter,
                  selectedDocTypes
                });
              }}
              onPrintSPKReport={(spkData, selectedDocTypes) => {
                setPrintDoc({
                  isOpen: true,
                  type: "spk_report",
                  data: { ...spkData, selectedDocTypes },
                  selectedDocTypes
                });
              }}
            />
          )}

          {/* Material Requests (TUG 5 Form Generator) */}
          {currentTab === "material-requests" && (
            <MaterialRequestView 
              requests={materialRequests}
              parts={parts}
              currentUser={currentUser!}
              onCreateRequest={handleCreateMaterialRequest}
              onCreateRequestBatch={handleCreateMaterialRequestBatch}
              onUpdateRequest={handleUpdateMaterialRequest}
              onDeleteRequest={handleDeleteMaterialRequest}
              onLogMRAction={handleLogMRAction}
              onPreviewTUG5={handlePreviewTUG5}
              spkList={spkList}
              receivingList={receivingList}
              autoOpenMRId={autoOpenMRId}
              onClearAutoOpenMRId={() => setAutoOpenMRId(null)}
              signatures={signatures}
            />
          )}

          {/* Material Requests TUG 6 Form Generator */}
          {currentTab === "material-requests-tug6" && (
            <MaterialRequestTUG6View 
              requests={materialRequestsTUG6}
              parts={parts}
              currentUser={currentUser!}
              onCreateRequest={handleCreateMaterialRequestTUG6}
              onCreateRequestBatch={handleCreateMaterialRequestTUG6Batch}
              onUpdateRequest={handleUpdateMaterialRequestTUG6}
              onDeleteRequest={handleDeleteMaterialRequestTUG6}
              onLogMRAction={handleLogMR6Action}
              onPreviewTUG6={handlePreviewTUG6}
              spkList={spkList}
              signatures={signatures}
            />
          )}

          {/* Material Returns (TUG 10 Form Generator) */}
          {currentTab === "material-returns" && (
            <MaterialReturnView 
              returns={materialReturns}
              parts={parts}
              requests={materialRequests}
              currentUser={currentUser!}
              onCreateReturn={handleCreateMaterialReturn}
              onUpdateReturn={handleUpdateMaterialReturn}
              onDeleteReturn={handleDeleteMaterialReturn}
              onLogMRAction={handleLogMRAction}
              onPreviewTUG10={handlePreviewTUG10}
              spkList={spkList}
            />
          )}

          {/* Database User & Role Management (Super Admin only) */}
          {currentTab === "users-management" && (
            <UsersManagementView 
              users={simulatedUsers}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onRefresh={syncAllTables}
            />
          )}

          {/* Digital Signatures Management */}
          {currentTab === "signature-management" && (
            <SignatureManagementView 
              signatures={signatures}
              onAddSignature={handleAddSignature}
              onUpdateSignature={handleUpdateSignature}
              onDeleteSignature={handleDeleteSignature}
              onResetDefaults={handleResetDefaultSignatures}
            />
          )}

        </main>
      </div>
      </div>

      {/* GLOBAL MODAL COVER: PRINTABLE WAREHOUSE ERP OFFICIAL FORM SCHEMES */}
      {printDoc.isOpen && (
        <PrintDocument 
          type={printDoc.type}
          data={printDoc.data}
          inventoryList={printDoc.inventoryList}
          mutationList={printDoc.mutationList}
          stats={printDoc.stats}
          timeFilter={printDoc.timeFilter}
          spkList={spkList}
          signatures={signatures}
          selectedDocTypes={printDoc.selectedDocTypes}
          onClose={() => setPrintDoc({ isOpen: false, type: "stock_report" })}
        />
      )}

    </div>
  );
}
