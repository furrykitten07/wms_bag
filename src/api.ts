/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, 
  SparePart, 
  Vendor, 
  WarehouseLocation, 
  InboundReceiving, 
  OutboundDispatch, 
  VesselRequest, 
  ApprovalTask, 
  MovementLedgerEntry, 
  AuditLog,
  SPKWorkOrder,
  MaterialRequest,
  MaterialReturn
} from "./types.js";

// We dynamically track the current simulated user's username for the headers
let currentUsername = "admin";

export function setCurrentUserHeader(username: string) {
  currentUsername = username;
}

export function getCurrentUserHeader(): string {
  return currentUsername;
}

async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "x-user-username": currentUsername,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Auth & Profile
  async login(username: string, password?: string): Promise<{ success: boolean; user: User }> {
    return fetcher<{ success: boolean; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async getMe(): Promise<User> {
    return fetcher<User>("/api/auth/me");
  },

  async getUsers(): Promise<User[]> {
    return fetcher<User[]>("/api/users");
  },

  async createUser(data: Partial<User>): Promise<User> {
    return fetcher<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return fetcher<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  // Inventory / Spare parts
  async getInventory(filters?: { search?: string; category?: string; alerts?: string }): Promise<SparePart[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.alerts) params.append("alerts", filters.alerts);
    return fetcher<SparePart[]>(`/api/inventory?${params.toString()}`);
  },

  async createSparePart(data: Partial<SparePart>): Promise<SparePart> {
    return fetcher<SparePart>("/api/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSparePart(id: string, data: Partial<SparePart>): Promise<SparePart> {
    return fetcher<SparePart>(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSparePart(id: string): Promise<{ success: boolean; message: string }> {
    return fetcher<{ success: boolean; message: string }>(`/api/inventory/${id}`, {
      method: "DELETE",
    });
  },

  // Locations & Vendors
  async getLocations(): Promise<WarehouseLocation[]> {
    return fetcher<WarehouseLocation[]>("/api/warehouse/locations");
  },

  async createLocation(data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    return fetcher<WarehouseLocation>("/api/warehouse/locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateLocation(id: string, data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    return fetcher<WarehouseLocation>(`/api/warehouse/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteLocation(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/warehouse/locations/${id}`, {
      method: "DELETE",
    });
  },

  // SPK (Work Order)
  async getSPKs(): Promise<SPKWorkOrder[]> {
    return fetcher<SPKWorkOrder[]>("/api/spk");
  },

  async createSPK(data: Partial<SPKWorkOrder>): Promise<SPKWorkOrder> {
    return fetcher<SPKWorkOrder>("/api/spk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSPK(id: string, data: Partial<SPKWorkOrder>): Promise<SPKWorkOrder> {
    return fetcher<SPKWorkOrder>(`/api/spk/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSPK(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/spk/${id}`, {
      method: "DELETE",
    });
  },

  async getVendors(): Promise<Vendor[]> {
    return fetcher<Vendor[]>("/api/vendors");
  },

  async createVendor(data: Partial<Vendor>): Promise<Vendor> {
    return fetcher<Vendor>("/api/vendors", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Receiving (Inbound)
  async getReceiving(): Promise<InboundReceiving[]> {
    return fetcher<InboundReceiving[]>("/api/receiving");
  },

  async createReceiving(data: Partial<InboundReceiving>): Promise<InboundReceiving> {
    return fetcher<InboundReceiving>("/api/receiving", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateReceiving(id: string, data: { status: string; items: any[]; reject_reason?: string; return_note_num?: string; signature_data_url?: string }): Promise<InboundReceiving> {
    return fetcher<InboundReceiving>(`/api/receiving/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Dispatch (Outbound)
  async getDispatch(): Promise<OutboundDispatch[]> {
    return fetcher<OutboundDispatch[]>("/api/dispatch");
  },

  async createDispatch(data: Partial<OutboundDispatch>): Promise<OutboundDispatch> {
    return fetcher<OutboundDispatch>("/api/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateDispatch(id: string, data: Partial<OutboundDispatch>): Promise<OutboundDispatch> {
    return fetcher<OutboundDispatch>(`/api/dispatch/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async logDispatchAction(id: string, action: "Printed" | "Downloaded" | "Edited" | "Created" | "Picked" | "Packed" | "Dispatched" | "Delivered"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/dispatch/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // Vessel Requests
  async getRequests(): Promise<VesselRequest[]> {
    return fetcher<VesselRequest[]>("/api/requests");
  },

  async createRequest(data: Partial<VesselRequest>): Promise<VesselRequest> {
    return fetcher<VesselRequest>("/api/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateRequest(id: string, data: { status: string }): Promise<VesselRequest> {
    return fetcher<VesselRequest>(`/api/requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Approvals Workflow
  async getApprovals(): Promise<ApprovalTask[]> {
    return fetcher<ApprovalTask[]>("/api/approvals");
  },

  async submitApprovalDecision(id: string, decision: "Approved" | "Rejected", remarks?: string): Promise<ApprovalTask> {
    return fetcher<ApprovalTask>(`/api/approvals/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, remarks }),
    });
  },

  // Ledger & Audits
  async getLedger(): Promise<MovementLedgerEntry[]> {
    return fetcher<MovementLedgerEntry[]>("/api/ledger");
  },

  async getAudit(): Promise<AuditLog[]> {
    return fetcher<AuditLog[]>("/api/audit");
  },

  // Dashboard Stats Summary Combined
  async getDashboardSummary(): Promise<{
    totalParts: number;
    lowStockParts: number;
    pendingApprovalsCount: number;
    activeDispatchesCount: number;
    totalReceivingCount: number;
    lowStockAlerts: Array<{
      id: string;
      part_name: string;
      part_number: string;
      current_stock: number;
      reorder_point: number;
      sku: string;
    }>;
    recentActivities: AuditLog[];
  }> {
    return fetcher("/api/dashboard/summary");
  },

  // Material requests and TUG 5 integration
  async getMaterialRequests(): Promise<MaterialRequest[]> {
    return fetcher<MaterialRequest[]>("/api/material-requests");
  },

  async createMaterialRequest(data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return fetcher<MaterialRequest>("/api/material-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createMaterialRequestBatch(data: Partial<MaterialRequest>[]): Promise<MaterialRequest[]> {
    return fetcher<MaterialRequest[]>("/api/material-requests/batch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMaterialRequest(id: string, data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return fetcher<MaterialRequest>(`/api/material-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteMaterialRequest(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/material-requests/${id}`, {
      method: "DELETE",
    });
  },

  async logMaterialRequestAction(id: string, action: "Printed" | "Downloaded"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/material-requests/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // Material returns (TUG 10) integration
  async getMaterialReturns(): Promise<MaterialReturn[]> {
    return fetcher<MaterialReturn[]>("/api/material-returns");
  },

  async createMaterialReturn(data: Partial<MaterialReturn>): Promise<MaterialReturn> {
    return fetcher<MaterialReturn>("/api/material-returns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMaterialReturn(id: string, data: Partial<MaterialReturn>): Promise<MaterialReturn> {
    return fetcher<MaterialReturn>(`/api/material-returns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteMaterialReturn(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/material-returns/${id}`, {
      method: "DELETE",
    });
  },

  async logMaterialReturnAction(id: string, action: "Printed" | "Downloaded"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/material-returns/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }
};
