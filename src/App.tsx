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
  MaterialReturnStatus
} from "./types.js";

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
import MaterialReturnView from "./components/MaterialReturnView.js";
import SparePartCatalogView from "./components/SparePartCatalogView.js";
import UsersManagementView from "./components/UsersManagementView.js";

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
  const [materialReturns, setMaterialReturns] = useState<MaterialReturn[]>([]);
  
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
    type: "bon" | "surat_jalan" | "manifest" | "stock_report" | "mutation_report" | "tug5" | "tug10";
    data?: any;
    inventoryList?: SparePart[];
    mutationList?: any[];
    stats?: any;
    timeFilter?: string;
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
      // 1. Fetch User directory & authentic operator profile
      const usrList = await api.getUsers();
      setSimulatedUsers(usrList);
      
      const savedUser = localStorage.getItem("wms_username");
      if (savedUser) {
        const matchedUser = usrList.find(u => u.username === savedUser);
        if (matchedUser) {
          setCurrentUser(matchedUser);
          setCurrentUserHeader(matchedUser.username);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }

      // 2. Fetch full static lists
      const locList = await api.getLocations();
      setLocations(locList);

      const vendList = await api.getVendors();
      setVendors(vendList);

      // 3. Fire transactions synchronizer
      if (savedUser) {
        await syncAllTables();
      }
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

      const returnsData = await api.getMaterialReturns();
      setMaterialReturns(returnsData);

      const usrList = await api.getUsers();
      setSimulatedUsers(usrList);
      const savedUser = localStorage.getItem("wms_username");
      if (savedUser) {
        const matchedSelf = usrList.find(u => u.username === savedUser);
        if (matchedSelf) {
          setCurrentUser(matchedSelf);
          setCurrentUserHeader(matchedSelf.username);
        }
      }
    } catch(err: any) {
      console.error("Synch tables failed:", err);
    }
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
    await api.createReceiving(recData);
    await syncAllTables();
  };

  // RECEIVING ACTION: QC VERIFY & COMMIT TO PHYSICAL STORAGE
  const handleVerifyReceiving = async (
    id: string, 
    update: { status: ReceivingStatus; items: any[]; reject_reason?: string; return_note_num?: string }
  ) => {
    await api.updateReceiving(id, update);
    await syncAllTables();
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
  if (loading && !currentUser && localStorage.getItem("wms_username")) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 font-mono selection:bg-rose-500">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
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
    <div className="h-screen flex flex-col bg-slate-50 text-slate-850 overflow-hidden font-sans">
      
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
          
          {/* Dashboard Tab */}
          {currentTab === "dashboard" && (
            <DashboardView 
              summary={summary}
              onQuickOrder={handleQuickOrder}
              onNavigateTab={setCurrentTab}
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
            <SparePartCatalogView />
          )}

          {/* Receiving inbound queue */}
          {currentTab === "receiving" && (
            <ReceivingView 
              receivingList={receivingList}
              parts={parts}
              role={currentUser!.role}
              onAddReceiving={handleAddReceiving}
              onVerifyReceiving={handleVerifyReceiving}
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
              onPreviewDocument={handleOpenDispatchDoc}
              parts={parts}
              requests={materialRequests}
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

          {/* Integrated Stock Reports (Keluar Masuk) */}
          {currentTab === "reports" && (
            <ReportsView 
              movements={ledger}
              parts={parts}
              onPrintReport={(filteredMovements, stats, timeFilter) => {
                setPrintDoc({
                  isOpen: true,
                  type: "mutation_report",
                  mutationList: filteredMovements,
                  stats,
                  timeFilter
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
          {currentTab === "users-management" && currentUser?.role === UserRole.SUPER_ADMIN && (
            <UsersManagementView 
              users={simulatedUsers}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onRefresh={syncAllTables}
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
          onClose={() => setPrintDoc({ isOpen: false, type: "stock_report" })}
        />
      )}

    </div>
  );
}
