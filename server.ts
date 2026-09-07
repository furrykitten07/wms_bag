/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDatabase, isDbConnected, getPool, seedDatabase } from "./db.js";
import { 
  User, 
  UserRole, 
  Vendor, 
  WarehouseLocation, 
  SparePart, 
  MovementLedgerEntry, 
  InboundReceiving, 
  OutboundDispatch, 
  VesselRequest, 
  ApprovalTask, 
  AuditLog, 
  TransactionType, 
  ReceivingStatus, 
  DispatchStatus, 
  RequestStatus, 
  RequestUrgency,
  ApprovalType,
  SPKWorkOrder,
  SPKVesselItem,
  SPKItemSelection,
  MaterialRequest,
  MaterialRequestStatus,
  MaterialReturn,
  MaterialReturnStatus
} from "./src/types.js";
import { 
  demoSpareParts, 
  demoSPKs, 
  demoMaterialRequests, 
  demoMaterialRequestsTUG6,
  demoDispatches, 
  demoReceiving, 
  demoMaterialReturns 
} from "./src/demoSeedData.js";
import { deriveTUG6FromTUG5 } from "./src/utils/criticalItemsMatcher.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// --- IN-MEMORY DATABASE STATE (STATEFUL DURING SERVER LIFETIME) ---

const users: User[] = [
  { id: "usr-1", username: "superadmin", name: "Fikri Haikal (Superadmin)", email: "superadmin@maritime-logistics.com", role: UserRole.SUPER_ADMIN, password: "admin123" },
  { id: "usr-3", username: "alfin", name: "Maghfur Muhammad Alfin", email: "alfin.rendalhar@maritime-logistics.com", role: UserRole.WAREHOUSE_STAFF, password: "admin123" },
  { id: "usr-4", username: "emir", name: "Mohamat Emir Ferdian", email: "emir.ferdian@maritime-logistics.com", role: UserRole.LOGISTICS_MANAGER, password: "admin123" },
  { id: "usr-5", username: "sumbono", name: "Sumbono", email: "sumbono@maritime-logistics.com", role: UserRole.VP_RENDALHAR, password: "admin123" }
];

const vendors: Vendor[] = [
  { id: "vnd-1", name: "Wärtsilä Marine Power Systems", code: "VND-WRT-01", email: "parts.marine@wartsila.com", phone: "+358 10 709 0000", address: "Helsinki, Finland", contactPerson: "Mikael Lindqvist" },
  { id: "vnd-2", name: "MAN Energy Solutions SE", code: "VND-MAN-02", email: "prime-serv@man-es.com", phone: "+49 821 3220", address: "Augsburg, Germany", contactPerson: "Hans Müller" },
  { id: "vnd-3", name: "Nagasaki Ship Propeller Co.", code: "VND-NSP-03", email: "sales@nagasaki-prop.jp", phone: "+81 95 824 1111", address: "Nagasaki, Japan", contactPerson: "Hiroshi Sato" },
  { id: "vnd-4", name: "Jakarta Maritime Sparepart Ind.", code: "VND-JMS-04", email: "sales@jakartamaritime.co.id", phone: "+62 21 4390 1234", address: "Tanjung Priok, Jakarta, Indonesia", contactPerson: "Yudi Pratama" }
];

let locations: WarehouseLocation[] = [
  { id: "loc-1", code: "A1", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (Ground level, Max 1m)", rack: "Rack A", shelf: "Level 1 (Low)", bin: "A1-G" },
  { id: "loc-2", code: "A2", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (Mid level, 1m - 2m)", rack: "Rack A", shelf: "Level 2 (Mid)", bin: "A2-M" },
  { id: "loc-3", code: "A3", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (High level, 2m+, Use Ladder!)", rack: "Rack A", shelf: "Level 3 (High)", bin: "A3-H" },
  { id: "loc-4", code: "B1", warehouse: "Jakarta HQ Warehouse", zone: "Zone B (Ground level, Max 1m)", rack: "Rack B", shelf: "Level 1 (Low)", bin: "B1-G" },
  { id: "loc-5", code: "B2", warehouse: "Jakarta HQ Warehouse", zone: "Zone B (Mid level, 1m - 2m)", rack: "Rack B", shelf: "Level 2 (Mid)", bin: "B2-M" },
  { id: "loc-6", code: "B3", warehouse: "Jakarta HQ Warehouse", zone: "Zone B (High level, 2m+, Use Ladder!)", rack: "Rack B", shelf: "Level 3 (High)", bin: "B3-H" },
  { id: "loc-7", code: "C1", warehouse: "Jakarta HQ Warehouse", zone: "Zone C (Ground level, Max 1m)", rack: "Rack C", shelf: "Level 1 (Low)", bin: "C1-G" },
  { id: "loc-8", code: "C2", warehouse: "Jakarta HQ Warehouse", zone: "Zone C (Mid level, 1m - 2m)", rack: "Rack C", shelf: "Level 2 (Mid)", bin: "C2-M" },
  { id: "loc-9", code: "C3", warehouse: "Jakarta HQ Warehouse", zone: "Zone C (High level, 2m+, Use Ladder!)", rack: "Rack C", shelf: "Level 3 (High)", bin: "C3-H" }
];

// Synchronized in-memory demo data arrays (Anchored to Jan-Jun 2026, July 2026 empty)
let spareParts: SparePart[] = demoSpareParts;
let spkRequests: SPKWorkOrder[] = demoSPKs;
let materialRequests: MaterialRequest[] = demoMaterialRequests.map(mr => ({
  ...mr,
  status: "Submitted" as any,
  alfin_signed: false,
  alfin_signed_at: undefined,
  alfin_signature_url: undefined,
  emir_signed: false,
  emir_signed_at: undefined,
  emir_signature_url: undefined,
  sumbono_signed: false,
  sumbono_signed_at: undefined,
  sumbono_signature_url: undefined
}));
let materialRequestsTUG6: MaterialRequest[] = demoMaterialRequestsTUG6;
let dispatch: OutboundDispatch[] = demoDispatches;
let receiving: InboundReceiving[] = demoReceiving;
let materialReturns: MaterialReturn[] = demoMaterialReturns;

const ledger: MovementLedgerEntry[] = [
  {
    id: "mvt-1",
    transaction_type: TransactionType.STOCK_ADJUSTMENT,
    spare_part_id: "sp-1",
    spare_part_name: "Piston Ring Set (2 Stroke Main Engine)",
    part_number: "MAN-560-1282",
    source_location: undefined,
    destination_location: "WH-JKT-A-R01-S01-B01",
    qty_in: 5,
    qty_out: 0,
    before_stock: 0,
    after_stock: 5,
    reference_number: "ADJ-2026-001",
    remarks: "Initial seed stock counting and registration verify",
    transaction_date: "2026-06-01T08:00:00Z",
    created_by: "Fikri Haikal (Superadmin)"
  }
];

const requests: VesselRequest[] = [];
const approvals: ApprovalTask[] = [];

const auditLogs: AuditLog[] = [
  {
    id: "lg-1",
    action: "Seed Demo State",
    module: "System",
    description: "Database initialized with 100+ synchronized records across 7 WMS modules",
    username: "superadmin",
    role: UserRole.SUPER_ADMIN,
    timestamp: "2026-06-11T08:00:00Z"
  },
  {
    id: "lg-2",
    action: "Verify Inbound Item",
    module: "Receiving",
    description: "Inbound PO-2026-99011 item standard QA audit passed and registered to system ledger",
    username: "wh_jkt",
    role: UserRole.WAREHOUSE_ADMIN,
    timestamp: "2026-06-11T02:00:00Z"
  }
];

// Helper to log audit trail
function createAudit(action: string, module: string, description: string, reqHeaderUser?: string) {
  const user = users.find(u => u.username === (reqHeaderUser || "admin")) || users[0];
  const newLog: AuditLog = {
    id: `lg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action,
    module,
    description,
    username: user.username,
    role: user.role,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(newLog);
}

// Helper to register ledger entry
function createLedgerEntry(
  txnType: TransactionType,
  sparePartId: string,
  qtyIn: number,
  qtyOut: number,
  ref: string,
  remarks: string,
  operator: string,
  sourceLoc?: string,
  destLoc?: string
) {
  const part = spareParts.find(p => p.id === sparePartId);
  if (!part) return;

  const before = part.current_stock;
  if (qtyIn > 0) {
    part.current_stock += qtyIn;
  }
  if (qtyOut > 0) {
    part.current_stock = Math.max(0, part.current_stock - qtyOut);
  }
  const after = part.current_stock;

  const newEntry: MovementLedgerEntry = {
    id: `mvt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    transaction_type: txnType,
    spare_part_id: sparePartId,
    spare_part_name: part.part_name,
    part_number: part.part_number,
    source_location: sourceLoc,
    destination_location: destLoc || part.location_id,
    qty_in: qtyIn,
    qty_out: qtyOut,
    before_stock: before,
    after_stock: after,
    reference_number: ref,
    remarks,
    transaction_date: new Date().toISOString(),
    created_by: operator
  };

  ledger.unshift(newEntry);
}

// --- API ENDPOINTS ---

// AUTH & USERS
app.get("/api/users", async (req, res) => {
  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        const [rows]: any = await pool.query("SELECT * FROM users ORDER BY created_at ASC");
        return res.json(rows);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to fetch users:", err.message);
    }
  }
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const currentUserObj = users.find(u => u.username === userHeader);
  if (!currentUserObj || currentUserObj.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({ error: "Forbidden: Only Super Admins can manage users" });
    return;
  }

  const { username, name, email, role, vesselName, password } = req.body;
  if (!username || !name || !email || !role) {
    res.status(400).json({ error: "Missing required fields: username, name, email, role are required" });
    return;
  }

  const exists = users.some(u => u.username === username.trim().toLowerCase());
  if (exists) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: username.trim().toLowerCase(),
    name: name.trim(),
    email: email.trim(),
    role: role as UserRole,
    vesselName: role === UserRole.VESSEL_CREW ? (vesselName ? vesselName.trim() : "MV. KARTINI BARUNA") : undefined,
    password: password ? password.trim() : "admin123"
  };

  users.push(newUser);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query(
          "INSERT INTO users (id, username, name, email, role, password, vessel_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [newUser.id, newUser.username, newUser.name, newUser.email, newUser.role, newUser.password, newUser.vesselName || null]
        );
        console.log(`✅ [MySQL DB] Saved new user '${newUser.username}' into MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to save user:", err.message);
    }
  }

  createAudit("Created User", "Users Management", `Created user ${newUser.username} (${newUser.role})`, userHeader);
  res.status(201).json(newUser);
});

app.put("/api/users/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const currentUserObj = users.find(u => u.username === userHeader);
  if (!currentUserObj || currentUserObj.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({ error: "Forbidden: Only Super Admins can manage users" });
    return;
  }

  const { id } = req.params;
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const oldUser = users[idx];
  const { username, name, email, role, vesselName, password } = req.body;

  if (username) {
    const exists = users.some(u => u.id !== id && u.username === username.trim().toLowerCase());
    if (exists) {
      res.status(400).json({ error: "Username already exists" });
      return;
    }
  }

  const updatedUser: User = {
    ...oldUser,
    username: username ? username.trim().toLowerCase() : oldUser.username,
    name: name !== undefined ? name.trim() : oldUser.name,
    email: email !== undefined ? email.trim() : oldUser.email,
    role: role !== undefined ? role as UserRole : oldUser.role,
    vesselName: role === UserRole.VESSEL_CREW ? (vesselName !== undefined ? vesselName.trim() : (oldUser.vesselName || "MV. KARTINI BARUNA")) : undefined,
    password: password !== undefined ? password.trim() : oldUser.password
  };

  users[idx] = updatedUser;

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query(
          "UPDATE users SET username = ?, name = ?, email = ?, role = ?, password = ?, vessel_name = ? WHERE id = ?",
          [updatedUser.username, updatedUser.name, updatedUser.email, updatedUser.role, updatedUser.password, updatedUser.vesselName || null, id]
        );
        console.log(`✅ [MySQL DB] Updated user '${updatedUser.username}' in MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to update user:", err.message);
    }
  }

  createAudit("Updated User", "Users Management", `Updated user details/role for ${updatedUser.username}`, userHeader);
  res.json(updatedUser);
});

app.delete("/api/users/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const currentUserObj = users.find(u => u.username === userHeader);
  if (!currentUserObj || currentUserObj.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({ error: "Forbidden: Only Super Admins can manage users" });
    return;
  }

  const { id } = req.params;
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const targetUser = users[idx];
  if (targetUser.username === userHeader) {
    res.status(400).json({ error: "Cannot delete your own user account" });
    return;
  }

  if (targetUser.username === "superadmin") {
    res.status(400).json({ error: "Cannot delete the primary superadmin account" });
    return;
  }

  users.splice(idx, 1);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query("DELETE FROM users WHERE id = ?", [id]);
        console.log(`✅ [MySQL DB] Deleted user '${id}' from MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to delete user:", err.message);
    }
  }

  createAudit("Deleted User", "Users Management", `Deleted user account ${targetUser.username}`, userHeader);
  res.json({ success: true, id });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    res.status(400).json({ error: "Username wajib diisi" });
    return;
  }
  const user = users.find(u => u.username === username.trim().toLowerCase());
  if (!user) {
    res.status(401).json({ error: `User '${username}' tidak terdaftar di sistem WMS.` });
    return;
  }
  // Check password
  const expectedPassword = user.password || "admin123";
  if (password !== expectedPassword) {
    res.status(401).json({ error: "Password yang Anda masukkan salah." });
    return;
  }
  res.json({ success: true, user });
});

app.get("/api/auth/me", (req, res) => {
  const username = req.headers["x-user-username"] || "admin";
  const user = users.find(u => u.username === username) || users[0];
  res.json(user);
});

// DIGITAL SIGNATURES ENDPOINTS
let signatures: any[] = [
  { id: "sig-2", role_title: "Verifikator Rendalhar (Level 1 Approval)", user_name: "Maghfur Muhammad Alfin", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=MaghfurAlfin", notes: "Tanda tangan verifikasi dokumen Rendalhar Level 1" },
  { id: "sig-3", role_title: "Manager Logistik (Level 2 Approval)", user_name: "Mohamat Emir Ferdian", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian", notes: "Tanda tangan persetujuan operasional logistik Level 2" },
  { id: "sig-4", role_title: "VP Rendalhar (Level 3 Pengesahan)", user_name: "Sumbono", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono", notes: "Tanda tangan pengesahan VP Rendalhar Level 3" }
];

app.get("/api/signatures", async (req, res) => {
  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        const [rows]: any = await pool.query("SELECT * FROM digital_signatures ORDER BY created_at ASC");
        if (rows.length > 0) return res.json(rows);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to fetch digital_signatures:", err.message);
    }
  }
  res.json(signatures);
});

app.post("/api/signatures", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { role_title, user_name, signature_url, notes } = req.body;
  const newSig = {
    id: `sig-${Date.now()}`,
    role_title: role_title || "Role Kustom",
    user_name: user_name || "Nama Kustom",
    signature_url: signature_url || "",
    notes: notes || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  signatures.push(newSig);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query(
          "INSERT INTO digital_signatures (id, role_title, user_name, signature_url, notes) VALUES (?, ?, ?, ?, ?)",
          [newSig.id, newSig.role_title, newSig.user_name, newSig.signature_url, newSig.notes]
        );
        console.log(`✅ [MySQL DB] Saved new digital signature '${newSig.user_name}' into MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to save digital_signature:", err.message);
    }
  }

  createAudit("Create Signature", "Digital Signatures", `Created digital signature for ${newSig.user_name} (${newSig.role_title})`, userHeader);
  res.json(newSig);
});

app.put("/api/signatures/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const idx = signatures.findIndex(s => s.id === id);
  if (idx !== -1) {
    signatures[idx] = { ...signatures[idx], ...req.body, updated_at: new Date().toISOString() };
    if (isDbConnected()) {
      try {
        const pool = getPool();
        if (pool) {
          await pool.query(
            "UPDATE digital_signatures SET role_title = ?, user_name = ?, signature_url = ?, notes = ? WHERE id = ?",
            [signatures[idx].role_title, signatures[idx].user_name, signatures[idx].signature_url, signatures[idx].notes, id]
          );
          console.log(`✅ [MySQL DB] Updated digital signature '${signatures[idx].user_name}' in MySQL database!`);
        }
      } catch (err: any) {
        console.error("❌ [MySQL DB] Failed to update digital_signature:", err.message);
      }
    }
    createAudit("Update Signature", "Digital Signatures", `Updated digital signature for ${signatures[idx].user_name}`, userHeader);
    return res.json(signatures[idx]);
  }
  res.status(404).json({ error: "Signature not found" });
});

app.delete("/api/signatures/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const idx = signatures.findIndex(s => s.id === id);
  if (idx !== -1) {
    const name = signatures[idx].user_name;
    signatures.splice(idx, 1);
    if (isDbConnected()) {
      try {
        const pool = getPool();
        if (pool) {
          await pool.query("DELETE FROM digital_signatures WHERE id = ?", [id]);
          console.log(`✅ [MySQL DB] Deleted digital signature '${id}' from MySQL database!`);
        }
      } catch (err: any) {
        console.error("❌ [MySQL DB] Failed to delete digital_signature:", err.message);
      }
    }
    createAudit("Delete Signature", "Digital Signatures", `Deleted digital signature for ${name}`, userHeader);
    return res.json({ success: true, id });
  }
  res.status(404).json({ error: "Signature not found" });
});

// SPARE PARTS (MASTER DATA)
app.get("/api/inventory", (req, res) => {
  const search = (req.query.search as string || "").toLowerCase();
  const category = req.query.category as string || "";
  const location = req.query.location as string || "";
  const alertStatus = req.query.alerts as string || "";

  let filtered = [...spareParts];

  if (search) {
    filtered = filtered.filter(p => 
      p.part_name.toLowerCase().includes(search) || 
      p.part_number.toLowerCase().includes(search) || 
      p.sku.toLowerCase().includes(search) ||
      (p.alternative_part_number && p.alternative_part_number.toLowerCase().includes(search)) ||
      p.maker.toLowerCase().includes(search)
    );
  }

  if (category && category !== "all") {
    filtered = filtered.filter(p => p.category === category);
  }

  if (location && location !== "all") {
    filtered = filtered.filter(p => p.location_id.includes(location));
  }

  // Low stock alert means inventory is below or equal to reorder_point
  if (alertStatus === "low_stock") {
    filtered = filtered.filter(p => p.current_stock <= p.reorder_point);
  }

  res.json(filtered);
});

app.post("/api/inventory", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const itemData = req.body;
  
  const id = `sp-${Date.now()}`;
  const newItem: SparePart = {
    id,
    sku: itemData.sku || `SKU-ME-${Date.now().toString().slice(-4)}`,
    part_number: itemData.part_number,
    part_name: itemData.part_name,
    alternative_part_number: itemData.alternative_part_number,
    category: itemData.category || "General Spares",
    vendor_id: itemData.vendor_id || "vnd-4",
    vessel_compatibility: itemData.vessel_compatibility || "All",
    unit: itemData.unit || "PCS",
    brand: itemData.brand || "Generic",
    maker: itemData.maker || "Unknown",
    minimum_stock: Number(itemData.minimum_stock || 2),
    maximum_stock: Number(itemData.maximum_stock || 10),
    reorder_point: Number(itemData.reorder_point || 4),
    current_stock: Number(itemData.current_stock || 0),
    reserved_stock: 0,
    location_id: itemData.location_id || "loc-1",
    barcode: itemData.barcode || `BC-${Math.floor(Math.random() * 900000) + 100000}`,
    qr_code: `QR_${itemData.part_number || "BC"}`,
    description: itemData.description,
    created_by: userHeader || "Budi Santoso",
    updated_by: userHeader || "Budi Santoso",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  spareParts.push(newItem);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        const qrCodeVal = newItem.qr_code || newItem.part_number || newItem.sku;
        const qrUrlVal = newItem.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newItem.sku || newItem.part_number)}`;
        const qrSlugVal = newItem.qr_slug || newItem.sku;
        const barcodeVal = newItem.barcode || newItem.sku || newItem.id;

        await pool.query(
          `INSERT INTO spare_parts (
            id, sku, part_number, alternative_part_number, part_name, category, vendor_id,
            vessel_compatibility, unit, brand, maker, minimum_stock, maximum_stock,
            reorder_point, current_stock, reserved_stock, location_id, barcode, qr_code, qr_url, qr_slug, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newItem.id, newItem.sku, newItem.part_number, newItem.alternative_part_number || null,
            newItem.part_name, newItem.category, newItem.vendor_id || null,
            Array.isArray(newItem.vessel_compatibility) ? JSON.stringify(newItem.vessel_compatibility) : (newItem.vessel_compatibility || null),
            newItem.unit, newItem.brand || null, newItem.maker || null, newItem.minimum_stock,
            newItem.maximum_stock, newItem.reorder_point, newItem.current_stock, 0,
            newItem.location_id || null, barcodeVal, qrCodeVal, qrUrlVal, qrSlugVal, newItem.description || null
          ]
        );
        console.log(`✅ [MySQL DB] Saved new spare part '${newItem.part_name}' into MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to save spare_part:", err.message);
    }
  }

  // Register into Ledger as stock adjustment init
  if (newItem.current_stock > 0) {
    createLedgerEntry(
      TransactionType.STOCK_ADJUSTMENT,
      newItem.id,
      newItem.current_stock,
      0,
      "INIT-REG",
      "Initial stock registration movement",
      userHeader || "Budi Santoso"
    );
  }

  createAudit("Create Spare Part", "Inventory", `Created spare part item ${newItem.part_name} (${newItem.part_number})`, userHeader);
  res.status(201).json(newItem);
});

app.put("/api/inventory/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const updateData = req.body;

  const itemIdx = spareParts.findIndex(p => p.id === id);
  if (itemIdx === -1) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const oldItem = spareParts[itemIdx];
  const beforeStock = oldItem.current_stock;
  const targetStock = Number(updateData.current_stock ?? beforeStock);

  const updatedItem = {
    ...oldItem,
    ...updateData,
    current_stock: targetStock,
    updated_by: userHeader || "Budi Santoso",
    updated_at: new Date().toISOString()
  };

  spareParts[itemIdx] = updatedItem;

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        const qrCodeVal = updatedItem.qr_code || updatedItem.part_number || updatedItem.sku;
        const qrUrlVal = updatedItem.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(updatedItem.sku || updatedItem.part_number)}`;
        const qrSlugVal = updatedItem.qr_slug || updatedItem.sku;
        const barcodeVal = updatedItem.barcode || updatedItem.sku || updatedItem.id;

        await pool.query(
          `UPDATE spare_parts SET 
            part_name = ?, part_number = ?, category = ?, current_stock = ?,
            unit = ?, reorder_point = ?, minimum_stock = ?, maximum_stock = ?,
            barcode = ?, qr_code = ?, qr_url = ?, qr_slug = ?
           WHERE id = ?`,
          [
            updatedItem.part_name, updatedItem.part_number, updatedItem.category,
            updatedItem.current_stock, updatedItem.unit, updatedItem.reorder_point,
            updatedItem.minimum_stock, updatedItem.maximum_stock,
            barcodeVal, qrCodeVal, qrUrlVal, qrSlugVal, id
          ]
        );
        console.log(`✅ [MySQL DB] Updated spare part '${updatedItem.part_name}' in MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to update spare_part:", err.message);
    }
  }

  // If manual stock was adjusted directly
  if (beforeStock !== targetStock) {
    const stockDiff = targetStock - beforeStock;
    if (stockDiff > 0) {
      createLedgerEntry(
        TransactionType.STOCK_ADJUSTMENT,
        id,
        stockDiff,
        0,
        "STK-ADJ-" + Date.now().toString().slice(-4),
        "Manual inventory stock alignment audit update",
        userHeader || "Budi Santoso"
      );
    } else {
      createLedgerEntry(
        TransactionType.STOCK_ADJUSTMENT,
        id,
        0,
        Math.abs(stockDiff),
        "STK-ADJ-" + Date.now().toString().slice(-4),
        "Manual inventory stock alignment audit update",
        userHeader || "Budi Santoso"
      );
    }
    createAudit("Adjust Stock", "Inventory", `Adjusted stock for ${updatedItem.part_name} from ${beforeStock} to ${targetStock}`, userHeader);
  } else {
    createAudit("Update Spare Part", "Inventory", `Updated master data details for ${updatedItem.part_name}`, userHeader);
  }

  res.json(updatedItem);
});

app.delete("/api/inventory/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const itemIdx = spareParts.findIndex(p => p.id === id);
  if (itemIdx === -1) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const part = spareParts[itemIdx];
  spareParts.splice(itemIdx, 1);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query("DELETE FROM spare_parts WHERE id = ?", [id]);
        console.log(`✅ [MySQL DB] Deleted spare part '${id}' from MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to delete spare_part:", err.message);
    }
  }

  createAudit("Delete Spare Part", "Inventory", `Deleted spare part item ${part.part_name}`, userHeader);
  res.json({ success: true, message: `Spare part ${part.part_name} deleted successfully` });
});

// WAREHOUSE LOCATIONS & VENDORS
app.get("/api/warehouse/locations", (req, res) => {
  res.json(locations);
});

app.post("/api/warehouse/locations", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const loc = req.body;
  const newLoc: WarehouseLocation = {
    id: `loc-${Date.now()}`,
    code: loc.code || "A1",
    warehouse: loc.warehouse || "Jakarta HQ Warehouse",
    zone: loc.zone || "Zone A",
    rack: loc.rack || "Rack A",
    shelf: loc.shelf || "Level 1",
    bin: loc.bin || "A1-G"
  };
  locations.push(newLoc);
  createAudit("Create Location", "Locations", `Added new storage slot ${newLoc.code}`, userHeader);
  res.status(201).json(newLoc);
});

app.put("/api/warehouse/locations/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const locIdx = locations.findIndex(l => l.id === id);
  if (locIdx === -1) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  const updatedLoc = {
    ...locations[locIdx],
    ...req.body
  };
  locations[locIdx] = updatedLoc;
  createAudit("Update Location", "Locations", `Updated storage slot code details for ${updatedLoc.code}`, userHeader);
  res.json(updatedLoc);
});

app.delete("/api/warehouse/locations/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const locIdx = locations.findIndex(l => l.id === id);
  if (locIdx === -1) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  const code = locations[locIdx].code;
  locations.splice(locIdx, 1);
  createAudit("Delete Location", "Locations", `Deleted storage slot ${code}`, userHeader);
  res.json({ success: true });
});

// SPK (WORK ORDER) ENDPOINTS
app.get("/api/spk", (req, res) => {
  res.json(spkRequests);
});

app.post("/api/spk", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const body = req.body;
  const newSpk: SPKWorkOrder = {
    id: `spk-${Date.now()}`,
    spk_number: body.spk_number || `SPK-${Date.now().toString().slice(-6)}`,
    target_port: body.target_port || "Tanjung Priok, JKT",
    status: body.status || "Pending Picking",
    created_at: new Date().toISOString(),
    created_by: userHeader || "Budi Santoso",
    remarks: body.remarks || "",
    vessels: body.vessels || []
  };
  spkRequests.push(newSpk);
  createAudit("Create SPK", "SPK", `Created Work Order list ${newSpk.spk_number}`, userHeader);
  res.status(201).json(newSpk);
});

app.put("/api/spk/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const spkIdx = spkRequests.findIndex(s => s.id === id);
  if (spkIdx === -1) {
    res.status(404).json({ error: "SPK Work Order not found" });
    return;
  }
  const updatedSpk = {
    ...spkRequests[spkIdx],
    ...req.body
  };
  spkRequests[spkIdx] = updatedSpk;

  // Sync SPK status to connected MaterialRequest (TUG 5)
  const relatedMR = materialRequests.find(mr => mr.work_order_ref === updatedSpk.spk_number);
  if (relatedMR) {
    if (updatedSpk.status === "Pending Picking" || updatedSpk.status === "Draft" as any) {
      relatedMR.status = "Draft";
    } else if (updatedSpk.status === "Picking in Progress") {
      relatedMR.status = "Submitted";
    } else if (updatedSpk.status === "Picked & Ready") {
      relatedMR.status = "Approved";
    } else if (updatedSpk.status === "Dispatched") {
      relatedMR.status = "Processed";
    }
  }

  createAudit("Update SPK", "SPK", `Updated Work Order ${updatedSpk.spk_number} Status to ${updatedSpk.status}`, userHeader);
  res.json(updatedSpk);
});

app.delete("/api/spk/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const spkIdx = spkRequests.findIndex(s => s.id === id);
  if (spkIdx === -1) {
    res.status(404).json({ error: "SPK Work Order not found" });
    return;
  }
  const num = spkRequests[spkIdx].spk_number;
  spkRequests.splice(spkIdx, 1);
  createAudit("Delete SPK", "SPK", `Deleted Work Order ${num}`, userHeader);
  res.json({ success: true });
});

app.get("/api/vendors", (req, res) => {
  res.json(vendors);
});

app.post("/api/vendors", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const v = req.body;
  const newVendor: Vendor = {
    id: `vnd-${Date.now()}`,
    name: v.name,
    code: v.code || `VND-${v.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-2)}`,
    email: v.email,
    phone: v.phone,
    address: v.address,
    contactPerson: v.contactPerson
  };
  vendors.push(newVendor);
  createAudit("Add Vendor", "Vendors", `Registered new vendor supplier ${newVendor.name}`, userHeader);
  res.status(201).json(newVendor);
});

// RECEIVING (INBOUND)
app.get("/api/receiving", (req, res) => {
  res.json(receiving);
});

app.post("/api/receiving", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const body = req.body;
  const vendorObj = vendors.find(v => v.id === body.vendor_id) || vendors[0];

  const newReceiving: InboundReceiving = {
    id: `rec-${Date.now()}`,
    purchase_order_num: body.purchase_order_num || `PO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    delivery_note_num: body.delivery_note_num || `DN-${Date.now().toString().slice(-5)}`,
    vendor_id: vendorObj.id,
    vendor_name: vendorObj.name,
    items: (body.items || []).map((itm: any) => {
      const part = spareParts.find(p => p.id === itm.spare_part_id);
      return {
        spare_part_id: itm.spare_part_id,
        spare_part_name: part ? part.part_name : "General Marine Spares",
        part_number: part ? part.part_number : "PN-GENERIC",
        qty_ordered: Number(itm.qty_ordered || 1),
        qty_received: Number(itm.qty_received || 0),
        qty_rejected: Number(itm.qty_rejected || 0),
        qc_status: itm.qc_status || "Pending",
        reject_reason: itm.reject_reason
      };
    }),
    status: (body.status as ReceivingStatus) || ReceivingStatus.PENDING,
    reject_reason: body.reject_reason,
    return_note_num: body.return_note_num,
    photo_evidence_url: body.photo_evidence_url || "",
    received_date: new Date().toISOString(),
    created_by: userHeader || "Budi Santoso"
  };

  receiving.unshift(newReceiving);
  createAudit("Inbound Created", "Receiving", `Logged receiving order for PO ${newReceiving.purchase_order_num}`, userHeader);
  res.status(201).json(newReceiving);
});

app.put("/api/receiving/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const updateBody = req.body;

  const recIdx = receiving.findIndex(r => r.id === id);
  if (recIdx === -1) {
    res.status(404).json({ error: "Receiving entry not found" });
    return;
  }

  const oldRec = receiving[recIdx];
  const newStatus = updateBody.status as ReceivingStatus;

  const updatedRec: InboundReceiving = {
    ...oldRec,
    status: newStatus,
    items: (updateBody.items || oldRec.items).map((itm: any) => ({
      ...itm,
      qty_received: Number(itm.qty_received),
      qty_rejected: Number(itm.qty_rejected)
    })),
    reject_reason: updateBody.reject_reason,
    return_note_num: updateBody.return_note_num,
    photo_evidence_url: updateBody.photo_evidence_url || oldRec.photo_evidence_url,
    signature_data_url: updateBody.signature_data_url || oldRec.signature_data_url
  };

  // If transition to non-pending (Accepted or Partial/Full Reject) we update actual stocks & ledger!
  if (oldRec.status === ReceivingStatus.PENDING && newStatus !== ReceivingStatus.PENDING) {
    updatedRec.items.forEach(itm => {
      const qtyToCredit = itm.qty_received; // Quantity successfully check-in verified
      if (qtyToCredit > 0) {
        // Find spare part
        const part = spareParts.find(p => p.id === itm.spare_part_id);
        if (part) {
          createLedgerEntry(
            TransactionType.RECEIVING,
            part.id,
            qtyToCredit,
            0,
            oldRec.purchase_order_num,
            `Verified goods receipt inbound from ${oldRec.vendor_name}`,
            userHeader || "Budi Santoso",
            `Vendor: ${oldRec.vendor_name}`
          );
        }
      }
    });

    createAudit(
      "Process Inbound", 
      "Receiving", 
      `Processed receiving consignment for PO ${oldRec.purchase_order_num}. Status changed to ${newStatus}`, 
      userHeader
    );
  }

  receiving[recIdx] = updatedRec;
  res.json(updatedRec);
});

app.delete("/api/receiving/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const idx = receiving.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Receiving entry not found" });
  }
  const removedRec = receiving[idx];
  receiving.splice(idx, 1);
  createAudit("Delete Inbound", "Receiving", `Deleted receiving order PO ${removedRec.purchase_order_num}`, userHeader);
  res.json({ success: true, id });
});

// DISPATCH (OUTBOUND)
app.get("/api/dispatch", (req, res) => {
  res.json(dispatch);
});

app.post("/api/dispatch", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const body = req.body;
  const nowStr = new Date().toISOString();
  const dspNum = `DSP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const bpbNum = body.bon_pengeluaran_number || `BPB-2026-${Math.floor(10000 + Math.random() * 90000)}`;

  const newDispatch: OutboundDispatch = {
    id: `dsp-${Date.now()}`,
    dispatch_number: dspNum,
    tug8_number: bpbNum,
    request_reference: body.request_reference || "Direct WMS Order",
    vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
    consignee: body.consignee || `Port Agent - ${body.vessel_name || "Baruna Vessel"}`,
    items: (body.items || []).map((itm: any) => {
      const sp = spareParts.find(p => p.id === itm.spare_part_id);
      return {
        spare_part_id: itm.spare_part_id,
        spare_part_name: itm.spare_part_name || (sp ? sp.part_name : "Marine Spare"),
        part_number: itm.part_number || (sp ? sp.part_number : "PN-GEN"),
        qty_requested: Number(itm.qty_requested || 1),
        qty_dispatched: Number(itm.qty_dispatched || itm.qty_requested || 1),
        unit: itm.unit || (sp ? sp.unit : "PCS"),
        unit_price: Number(itm.unit_price || 150)
      };
    }),
    status: body.status || DispatchStatus.WAITING,
    bon_pengeluaran_number: bpbNum,
    surat_jalan_number: body.surat_jalan_number || `SJL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    manifest_number: body.manifest_number || `MNF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    courier_name: body.courier_name || "Internal Cargo",
    tracking_number: body.tracking_number || "-",
    driver_pic: body.driver_pic || "-",
    warehouse_name: body.warehouse_name || "Gudang Merak",
    delivery_destination: body.delivery_destination || "Port Agent / Vessel Side",
    notes: body.notes || "",
    created_by: userHeader || "Budi Santoso",
    created_at: nowStr,
    updated_at: nowStr,
    work_order_ref: body.work_order_ref || "",
    account_code: body.account_code || "BPP",
    function_code: body.function_code || "ARMADA"
  };

  // Add stock reservations
  newDispatch.items.forEach(itm => {
    const part = spareParts.find(p => p.id === itm.spare_part_id);
    if (part) {
      part.reserved_stock += itm.qty_requested;
    }
  });

  dispatch.unshift(newDispatch);

  try {
    const dbPool = getPool();
    if (dbPool) {
      await dbPool.query(
        `INSERT INTO outbound_dispatches (
          id, dispatch_number, tug8_number, bon_pengeluaran_number, surat_jalan_number,
          manifest_number, spk_id, spk_number, vessel_name, destination_port, warehouse_origin,
          transporter_name, vehicle_number, driver_name, driver_phone, status, items, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newDispatch.id, newDispatch.dispatch_number, newDispatch.tug8_number, newDispatch.bon_pengeluaran_number,
          newDispatch.surat_jalan_number, newDispatch.manifest_number, newDispatch.spk_id || null,
          newDispatch.work_order_ref || null, newDispatch.vessel_name, newDispatch.delivery_destination || "Pelabuhan Merak",
          newDispatch.warehouse_name || "Gudang Merak", newDispatch.courier_name || null,
          newDispatch.tracking_number || null, newDispatch.driver_pic || null, null,
          newDispatch.status, JSON.stringify(newDispatch.items || []), newDispatch.created_by
        ]
      );
    }
  } catch (err: any) {
    console.error("ℹ️ [MySQL DB] Outbound dispatch insert:", err.message);
  }

  createAudit("Dispatch Created", "Dispatch", `Created dispatch shipment BPB ${newDispatch.bon_pengeluaran_number} for vessel ${newDispatch.vessel_name}`, userHeader);
  res.status(201).json(newDispatch);
});

app.put("/api/dispatch/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const updateBody = req.body;

  const dspIdx = dispatch.findIndex(d => d.id === id);
  if (dspIdx === -1) {
    res.status(404).json({ error: "Dispatch record not found" });
    return;
  }

  const oldDsp = dispatch[dspIdx];
  const nextStatus = updateBody.status as DispatchStatus;

  // Define helper functions for state groups
  const isReservedState = (s: DispatchStatus) => {
    return [
      DispatchStatus.PICKING, 
      DispatchStatus.PACKED, 
      DispatchStatus.READY_TO_DISPATCH,
      "Ready To Dispatch" as any
    ].includes(s);
  };

  const isDeductedState = (s: DispatchStatus) => {
    return [
      DispatchStatus.DISPATCHED, 
      DispatchStatus.DELIVERED, 
      DispatchStatus.COMPLETED,
      "Completed" as any
    ].includes(s);
  };

  // 1. VALIDATION: Check stock availability if transitioning from a non-active/un-deducted state to a deducted or preparation state
  if (nextStatus && nextStatus !== DispatchStatus.DRAFT) {
    for (const itm of oldDsp.items) {
      const part = spareParts.find(p => p.id === itm.spare_part_id);
      if (part) {
        if (!isDeductedState(oldDsp.status)) {
          // Verify physical stock can handle this item
          if (part.current_stock < itm.qty_dispatched) {
            res.status(400).json({
              error: `Stok tidak mencukupi untuk item '${part.part_name}' (${part.part_number}). Stok fisik: ${part.current_stock}, Dibutuhkan: ${itm.qty_dispatched}.`
            });
            return;
          }
        }
      }
    }
  }

  // 2. STATE TRANSITION OPERATIONS ON STOCK
  if (nextStatus && nextStatus !== oldDsp.status) {
    oldDsp.items.forEach(itm => {
      const part = spareParts.find(p => p.id === itm.spare_part_id);
      if (part) {
        // A. Remove old status effects
        if (isReservedState(oldDsp.status)) {
          part.reserved_stock = Math.max(0, part.reserved_stock - itm.qty_requested);
        }
        if (isDeductedState(oldDsp.status)) {
          part.current_stock += itm.qty_dispatched;
        }

        // B. Apply new status effects
        if (isReservedState(nextStatus)) {
          part.reserved_stock += itm.qty_requested;
        }
        if (isDeductedState(nextStatus)) {
          part.current_stock = Math.max(0, part.current_stock - itm.qty_dispatched);
          
          if (!isDeductedState(oldDsp.status)) {
            createLedgerEntry(
              TransactionType.DISPATCH,
              part.id,
              0,
              itm.qty_dispatched,
              oldDsp.bon_pengeluaran_number || oldDsp.dispatch_number || "BPB-GEN",
              `Outbound cargo dispatch released to ${oldDsp.vessel_name}`,
              userHeader || "Budi Santoso",
              part.location_id,
              `Vessel: ${oldDsp.vessel_name}`
            );
          }
        }
      }
    });

    createAudit(
      `Dispatch: ${nextStatus}`, 
      "Dispatch", 
      `Shipment reference ${oldDsp.bon_pengeluaran_number || oldDsp.dispatch_number} status updated from ${oldDsp.status} to ${nextStatus}`,
      userHeader
    );
  }

  const updatedDsp: OutboundDispatch = {
    ...oldDsp,
    ...updateBody,
    status: nextStatus || oldDsp.status,
    alfin_signed: updateBody.alfin_signed !== undefined ? Boolean(updateBody.alfin_signed) : oldDsp.alfin_signed,
    alfin_signed_at: updateBody.alfin_signed_at || oldDsp.alfin_signed_at,
    alfin_signature_url: updateBody.alfin_signature_url || oldDsp.alfin_signature_url,
    emir_signed: updateBody.emir_signed !== undefined ? Boolean(updateBody.emir_signed) : oldDsp.emir_signed,
    emir_signed_at: updateBody.emir_signed_at || oldDsp.emir_signed_at,
    emir_signature_url: updateBody.emir_signature_url || oldDsp.emir_signature_url,
    sumbono_signed: updateBody.sumbono_signed !== undefined ? Boolean(updateBody.sumbono_signed) : oldDsp.sumbono_signed,
    sumbono_signed_at: updateBody.sumbono_signed_at || oldDsp.sumbono_signed_at,
    sumbono_signature_url: updateBody.sumbono_signature_url || oldDsp.sumbono_signature_url,
    courier_name: updateBody.courier_name !== undefined ? updateBody.courier_name : oldDsp.courier_name,
    tracking_number: updateBody.tracking_number !== undefined ? updateBody.tracking_number : oldDsp.tracking_number,
    dispatch_date: (nextStatus === DispatchStatus.DISPATCHED || nextStatus === "Ready To Dispatch" as any) 
      ? new Date().toISOString() 
      : oldDsp.dispatch_date,
    notes: updateBody.notes !== undefined ? updateBody.notes : oldDsp.notes,
    driver_pic: updateBody.driver_pic !== undefined ? updateBody.driver_pic : oldDsp.driver_pic,
    delivery_destination: updateBody.delivery_destination !== undefined ? updateBody.delivery_destination : oldDsp.delivery_destination,
    warehouse_name: updateBody.warehouse_name !== undefined ? updateBody.warehouse_name : oldDsp.warehouse_name
  };

  dispatch[dspIdx] = updatedDsp;
  res.json(updatedDsp);
});

// For TUG 8 View / Print / Download actions log
app.post("/api/dispatch/:id/action-log", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const { action } = req.body; // "Printed" | "Downloaded" | "Viewed"

  const dsp = (dispatch || []).find(d => d && d.id === id);
  if (!dsp) {
    res.status(404).json({ error: "Dispatch record not found" });
    return;
  }

  createAudit(action, "TUG 8 / Dispatch", `${action} TUG 8 document for ${dsp.bon_pengeluaran_number || dsp.dispatch_number || dsp.id}`, userHeader);
  res.json({ success: true });
});

app.delete("/api/dispatch/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const idx = dispatch.findIndex(d => d.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Dispatch record not found" });
  }
  const removedDsp = dispatch[idx];
  dispatch.splice(idx, 1);
  createAudit("Delete Dispatch", "Dispatch", `Deleted dispatch document ${removedDsp.bon_pengeluaran_number || removedDsp.dispatch_number || id}`, userHeader);
  res.json({ success: true, id });
});

app.post("/api/demo/seed", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  spareParts = [...demoSpareParts];
  spkRequests = [...demoSPKs];
  materialRequests = [...demoMaterialRequests];
  dispatch = [...demoDispatches];
  receiving = [...demoReceiving];
  materialReturns = [...demoMaterialReturns];
  
  createAudit("Seed Demo Data", "System", `Re-populated demo database with 100+ synchronized records across 7 WMS modules`, userHeader || "superadmin");
  res.json({ 
    success: true, 
    counts: {
      spareParts: spareParts.length,
      spkRequests: spkRequests.length,
      materialRequests: materialRequests.length,
      dispatch: dispatch.length,
      receiving: receiving.length,
      materialReturns: materialReturns.length,
      total: spareParts.length + spkRequests.length + materialRequests.length + dispatch.length + receiving.length + materialReturns.length
    }
  });
});

// --- MATERIAL REQUEST & TUG 5 SYSTEM ---
app.get("/api/material-requests", (req, res) => {
  res.json(materialRequests);
});

app.post("/api/material-requests", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const userObj = users.find(u => u.username === userHeader) || users[3];
  const body = req.body;

  // Auto increment Material Request Number
  const currentYear = new Date().getFullYear();
  const sameYearMRs = materialRequests.filter(m => m.request_number.startsWith(`MR-${currentYear}`));
  let nextSeqStr = "000001";
  if (sameYearMRs.length > 0) {
    const seqs = sameYearMRs.map(m => {
      const partsNum = m.request_number.split("-");
      return Number(partsNum[partsNum.length - 1] || 0);
    });
    const maxSeq = Math.max(...seqs);
    nextSeqStr = String(maxSeq + 1).padStart(6, "0");
  }
  const requestNumber = `MR-${currentYear}-${nextSeqStr}`;

  const newMR: MaterialRequest = {
    id: `mr-${Date.now()}`,
    request_number: requestNumber,
    request_date: body.request_date || new Date().toISOString().split("T")[0],
    requester_name: userObj.name || body.requester_name || "Crew User",
    vessel_name: userObj.vesselName || body.vessel_name || "MV. KARTINI BARUNA",
    warehouse_name: body.warehouse_name || "Jakarta HQ Warehouse",
    delivery_address: body.delivery_address || "",
    work_order_ref: body.work_order_ref || "",
    account_code: body.account_code || "",
    function_code: body.function_code || "",
    remarks: body.remarks || "",
    status: (body.status as MaterialRequestStatus) || "Draft",
    items: (body.items || []).map((itm: any) => {
      const sp = spareParts.find(p => p.id === itm.spare_part_id);
      return {
        spare_part_id: itm.spare_part_id,
        spare_part_name: sp ? sp.part_name : itm.spare_part_name,
        part_number: sp ? sp.part_number : itm.part_number,
        unit: sp ? sp.unit : (itm.unit || "PCS"),
        avg_monthly_usage: itm.avg_monthly_usage !== undefined ? Number(itm.avg_monthly_usage) : (sp ? 1 : 0),
        remaining_stock: sp ? sp.current_stock : Number(itm.remaining_stock || 0),
        requested_qty: Number(itm.requested_qty || 1),
        notes: itm.notes || ""
      };
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  materialRequests.unshift(newMR);
  
  createAudit(
    newMR.status === "Submitted" ? "Submit Request" : "Create Request",
    "Material Requests",
    `${newMR.status === "Submitted" ? "Submitted" : "Created Draft of"} Material Request ${newMR.request_number}`,
    userHeader
  );

  res.status(201).json(newMR);
});

app.post("/api/material-requests/batch", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const userObj = users.find(u => u.username === userHeader) || users[3];
  const itemsArray = req.body;

  if (!Array.isArray(itemsArray)) {
    return res.status(400).json({ error: "Body must be an array of requests" });
  }

  const createdRequests: MaterialRequest[] = [];
  const currentYear = new Date().getFullYear();

  for (const doc of itemsArray) {
    const sameYearMRs = [...materialRequests, ...createdRequests].filter(m => m.request_number.startsWith(`MR-${currentYear}`));
    let nextSeqStr = "000001";
    if (sameYearMRs.length > 0) {
      const seqs = sameYearMRs.map(m => {
        const partsNum = m.request_number.split("-");
        return Number(partsNum[partsNum.length - 1] || 0);
      });
      const maxSeq = Math.max(...seqs);
      nextSeqStr = String(maxSeq + 1).padStart(6, "0");
    }
    const requestNumber = `MR-${currentYear}-${nextSeqStr}`;

    const newMR: MaterialRequest = {
      id: `mr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      request_number: requestNumber,
      request_date: doc.request_date || new Date().toISOString().split("T")[0],
      requester_name: userObj.name || doc.requester_name || "Crew User",
      vessel_name: doc.vessel_name || userObj.vesselName || "MV. KARTINI BARUNA",
      warehouse_name: doc.warehouse_name || "Jakarta HQ Warehouse",
      delivery_address: doc.delivery_address || "",
      work_order_ref: doc.work_order_ref || "",
      account_code: doc.account_code || "",
      function_code: doc.function_code || "",
      remarks: doc.remarks || "",
      status: (doc.status as MaterialRequestStatus) || "Draft",
      items: (doc.items || []).map((itm: any) => {
        const sp = spareParts.find(p => p.id === itm.spare_part_id || p.part_number === itm.part_number);
        return {
          spare_part_id: sp ? sp.id : itm.spare_part_id,
          spare_part_name: sp ? sp.part_name : itm.spare_part_name,
          part_number: sp ? sp.part_number : itm.part_number,
          unit: sp ? sp.unit : (itm.unit || "PCS"),
          avg_monthly_usage: itm.avg_monthly_usage !== undefined ? Number(itm.avg_monthly_usage) : (sp ? 1 : 0),
          remaining_stock: sp ? sp.current_stock : Number(itm.remaining_stock || 0),
          requested_qty: Number(itm.requested_qty || 1),
          notes: itm.notes || ""
        };
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    createdRequests.push(newMR);
  }

  for (const newMR of createdRequests) {
    materialRequests.unshift(newMR);
    createAudit(
      "Submit Request",
      "Material Requests",
      `Synchronized Register SPK to Material Request ${newMR.request_number}`,
      userHeader
    );
  }

  res.status(201).json(createdRequests);
});

app.put("/api/material-requests/:id", (req, res) => {
  try {
    const userHeader = req.headers["x-user-username"] as string;
    const { id } = req.params;
    const body = req.body;

    const idx = materialRequests.findIndex(mr => mr.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Material Request not found" });
      return;
    }

    const oldMR = materialRequests[idx];
    const oldStatus = oldMR.status;
    
    const alfSigDefault = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 42 C 35 15, 50 58, 80 25 C 100 12, 120 52, 150 30 C 170 20, 185 45, 205 35" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 30 50 L 180 46" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="50" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">Maghfur M. Alfin</text></svg>`;
    const emrSigDefault = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 45 C 35 15, 45 65, 75 30 C 95 15, 115 55, 145 35 C 165 25, 185 50, 205 38" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 40 52 L 180 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="60" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">M. Emir Ferdian</text></svg>`;
    const sumSigDefault = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 20 40 C 35 10, 50 60, 80 20 C 110 5, 130 55, 160 30 C 180 20, 195 45, 205 35" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 30 48 C 80 55, 140 45, 190 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="75" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">Sumbono</text></svg>`;

    const alfin_signed = body.alfin_signed !== undefined ? Boolean(body.alfin_signed) : oldMR.alfin_signed;
    const alfin_signed_at = body.alfin_signed_at || oldMR.alfin_signed_at;
    let alfin_signature_url = body.alfin_signature_url || oldMR.alfin_signature_url;
    if (!alfin_signature_url || alfin_signature_url.includes("dicebear")) alfin_signature_url = alfSigDefault;

    const emir_signed = body.emir_signed !== undefined ? Boolean(body.emir_signed) : oldMR.emir_signed;
    const emir_signed_at = body.emir_signed_at || oldMR.emir_signed_at;
    let emir_signature_url = body.emir_signature_url || oldMR.emir_signature_url;
    if (!emir_signature_url || emir_signature_url.includes("dicebear")) emir_signature_url = emrSigDefault;

    const sumbono_signed = body.sumbono_signed !== undefined ? Boolean(body.sumbono_signed) : oldMR.sumbono_signed;
    const sumbono_signed_at = body.sumbono_signed_at || oldMR.sumbono_signed_at;
    let sumbono_signature_url = body.sumbono_signature_url || oldMR.sumbono_signature_url;
    if (!sumbono_signature_url || sumbono_signature_url.includes("dicebear")) sumbono_signature_url = sumSigDefault;

    let newStatus = (body.status as MaterialRequestStatus) || oldMR.status;
    if (sumbono_signed || (alfin_signed && emir_signed && sumbono_signed)) {
      newStatus = "Approved";
    }

    const updatedMR: MaterialRequest = {
      ...oldMR,
      ...body,
      request_date: body.request_date || oldMR.request_date,
      warehouse_name: body.warehouse_name || oldMR.warehouse_name,
      delivery_address: body.delivery_address || oldMR.delivery_address,
      work_order_ref: body.work_order_ref || oldMR.work_order_ref,
      account_code: body.account_code || oldMR.account_code,
      function_code: body.function_code || oldMR.function_code,
      remarks: body.remarks || oldMR.remarks,
      status: newStatus,
      alfin_signed,
      alfin_signed_at,
      alfin_signature_url,
      emir_signed,
      emir_signed_at,
      emir_signature_url,
      sumbono_signed,
      sumbono_signed_at,
      sumbono_signature_url,
      items: body.items ? body.items.map((itm: any) => {
        const sp = spareParts.find(p => p.id === itm.spare_part_id);
        return {
          spare_part_id: itm.spare_part_id,
          spare_part_name: sp ? sp.part_name : itm.spare_part_name,
          part_number: sp ? sp.part_number : itm.part_number,
          unit: sp ? sp.unit : (itm.unit || "PCS"),
          avg_monthly_usage: itm.avg_monthly_usage !== undefined ? Number(itm.avg_monthly_usage) : (sp ? 1 : 0),
          remaining_stock: sp ? sp.current_stock : Number(itm.remaining_stock || 0),
          requested_qty: Number(itm.requested_qty || 1),
          notes: itm.notes || ""
        };
      }) : oldMR.items,
      updated_at: new Date().toISOString()
    };

    materialRequests[idx] = updatedMR;

    // Cascade automatic generation of Outbound Dispatch (TUG 8 doc) upon approval
    if (oldStatus !== "Approved" && newStatus === "Approved") {
      const currentYear = new Date().getFullYear();
      const sameYearDispatches = dispatch.filter(d => d.dispatch_number && d.dispatch_number.startsWith(`DSP-${currentYear}`));
      const nextSeq = sameYearDispatches.length + 1;
      const dspNum = `DSP-${currentYear}-${String(nextSeq).padStart(5, "0")}`;
      const tug8Num = `TUG8-${currentYear}-${String(nextSeq).padStart(5, "0")}`;

      const hasIncompleteItems = updatedMR.items.some(itm => itm.item_status === "Pending" || itm.item_status === "Returned");
      const globalNotesPrefix = hasIncompleteItems 
        ? "[PENGIRIMAN PARSIAL] Sebagian barang belum datang atau diretur. " 
        : "";

      const newDisp: OutboundDispatch = {
        id: `dsp-${Date.now()}`,
        request_reference: updatedMR.request_number,
        vessel_name: updatedMR.vessel_name,
        consignee: updatedMR.vessel_name || "Chief Engineer Onboard",
        dispatch_number: dspNum,
        tug8_number: tug8Num,
        bon_pengeluaran_number: tug8Num,
        surat_jalan_number: `SJL-${currentYear}-${String(nextSeq).padStart(4, "0")}`,
        manifest_number: `MNF-${currentYear}-${String(nextSeq).padStart(5, "0")}`,
        dispatch_date: new Date().toISOString().split("T")[0],
        status: DispatchStatus.DRAFT, // Default state is Draft as required
        warehouse_name: updatedMR.warehouse_name || "Jakarta HQ Warehouse",
        delivery_destination: updatedMR.delivery_address || "Port Agent",
        notes: globalNotesPrefix + (updatedMR.remarks || "Delivery of spare parts for vessel maintenance"),
        courier_name: "",
        tracking_number: "",
        driver_pic: "",
        created_by: userHeader || "Budi Santoso",
        work_order_ref: updatedMR.work_order_ref || "",
        account_code: updatedMR.account_code || "BPP",
        function_code: updatedMR.function_code || "ARMADA",
        items: updatedMR.items.map(itm => {
          const isArrived = !itm.item_status || itm.item_status === "Arrived";
          const itemNotes = itm.notes || "";
          let appendNote = "";
          if (itm.item_status === "Pending") {
            appendNote = "[BELUM DATANG] ";
          } else if (itm.item_status === "Returned") {
            appendNote = "[RETUR] ";
          }
          return {
            spare_part_id: itm.spare_part_id,
            spare_part_name: itm.spare_part_name,
            part_number: itm.part_number,
            qty_requested: itm.requested_qty,
            qty_approved: isArrived ? itm.requested_qty : 0,
            qty_dispatched: isArrived ? itm.requested_qty : 0,
            qty_remaining: isArrived ? 0 : itm.requested_qty,
            unit: itm.unit,
            unit_price: 150,
            notes: appendNote + itemNotes
          };
        })
      };

      dispatch.unshift(newDisp);
    }

    // Sync Material Request status to connected SPK Work Order
    const relatedSPK = spkRequests.find(s => s.spk_number === updatedMR.work_order_ref);
    if (relatedSPK) {
      const hasIncompleteItems = updatedMR.items.some(itm => itm.item_status === "Pending" || itm.item_status === "Returned");
      if (hasIncompleteItems && ["Approved", "Processed"].includes(newStatus)) {
        relatedSPK.status = "Incomplete";
      } else {
        if (newStatus === "Draft") {
          relatedSPK.status = "Pending Picking";
        } else if (newStatus === "Submitted") {
          relatedSPK.status = "Picking in Progress";
        } else if (newStatus === "Approved") {
          relatedSPK.status = "Picked & Ready";
        } else if (newStatus === "Rejected") {
          relatedSPK.status = "Pending Picking";
        } else if (newStatus === "Processed") {
          relatedSPK.status = "Dispatched";
        }
      }
    }

    // Log specific transitions
    let actionLog = "Edited";
    if (body.status && body.status !== oldStatus) {
      if (body.status === "Submitted") actionLog = "Submitted";
      if (body.status === "Approved") actionLog = "Approved";
      if (body.status === "Rejected") actionLog = "Rejected";
      if (body.status === "Processed") actionLog = "Processed";
      createAudit(`${actionLog} Request`, "Material Requests", `Status updated to ${body.status} for Material Request ${oldMR.request_number}`, userHeader);
    } else {
      createAudit("Edited Request", "Material Requests", `Edited details of Material Request ${oldMR.request_number}`, userHeader);
    }

    res.json(updatedMR);
  } catch (error: any) {
    console.error("Error in PUT /api/material-requests/:id:", error);
    res.status(500).json({ error: error.message || "Internal Server Error in PUT material-requests" });
  }
});

app.delete("/api/material-requests/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;

  const idx = materialRequests.findIndex(mr => mr.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Material Request not found" });
  }

  const removedMR = materialRequests[idx];
  materialRequests.splice(idx, 1);

  createAudit(
    "Delete Request",
    "Material Requests",
    `Deleted Material Request ${removedMR.request_number}`,
    userHeader
  );

  res.json({ success: true, id });
});

// For custom printed / downloaded actions log
app.post("/api/material-requests/:id/action-log", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const { action } = req.body; // "Printed" | "Downloaded"

  const mr = materialRequests.find(m => m.id === id);
  if (!mr) {
    res.status(404).json({ error: "Material Request not found" });
    return;
  }

  createAudit(action, "Material Requests", `Printed or Downloaded TUG 5 form for ${mr.request_number}`, userHeader);
  res.json({ success: true });
});

// --- MATERIAL REQUESTS TUG 6 ENDPOINTS ---
app.get("/api/material-requests-tug6", (req, res) => {
  // USER DIRECTIVE: TUG 6 is derived from TUG 5 based on sheet 'CRITICAL' in data/FIKRI.xlsx
  const derivedTUG6 = deriveTUG6FromTUG5(materialRequests || []);
  const derivedIds = new Set(derivedTUG6.map(d => d.id));
  const manualOnly = (materialRequestsTUG6 || []).filter(m => !derivedIds.has(m.id));
  res.json([...derivedTUG6, ...manualOnly]);
});

app.post("/api/material-requests-tug6", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const userObj = users.find(u => u.username === userHeader) || users[3];
  const body = req.body;

  const currentYear = new Date().getFullYear();
  const sameYearMRs = materialRequestsTUG6.filter(m => m.request_number.startsWith(`MR6-${currentYear}`));
  let nextSeqStr = "000001";
  if (sameYearMRs.length > 0) {
    const seqs = sameYearMRs.map(m => {
      const partsNum = m.request_number.split("-");
      return Number(partsNum[partsNum.length - 1] || 0);
    });
    const maxSeq = Math.max(...seqs);
    nextSeqStr = String(maxSeq + 1).padStart(6, "0");
  }
  const requestNumber = `MR6-${currentYear}-${nextSeqStr}`;

  const newMR: MaterialRequest = {
    id: `mr6-${Date.now()}`,
    request_number: requestNumber,
    request_date: body.request_date || new Date().toISOString().split("T")[0],
    requester_name: userObj.name || body.requester_name || "Crew User",
    vessel_name: userObj.vesselName || body.vessel_name || "MV. KARTINI BARUNA",
    warehouse_name: body.warehouse_name || "Jakarta HQ Warehouse",
    delivery_address: body.delivery_address || "",
    work_order_ref: body.work_order_ref || "",
    account_code: body.account_code || "",
    function_code: body.function_code || "",
    remarks: body.remarks || "",
    status: (body.status as MaterialRequestStatus) || "Draft",
    tug_type: "TUG6",
    tug6_number: `TUG6-${currentYear}-${nextSeqStr.slice(-3)}`,
    items: (body.items || []).map((itm: any) => {
      const sp = spareParts.find(p => p.id === itm.spare_part_id);
      return {
        spare_part_id: itm.spare_part_id,
        spare_part_name: sp ? sp.part_name : itm.spare_part_name,
        part_number: sp ? sp.part_number : itm.part_number,
        unit: sp ? sp.unit : (itm.unit || "PCS"),
        avg_monthly_usage: itm.avg_monthly_usage !== undefined ? Number(itm.avg_monthly_usage) : (sp ? 1 : 0),
        remaining_stock: sp ? sp.current_stock : Number(itm.remaining_stock || 0),
        requested_qty: Number(itm.requested_qty || 1),
        notes: itm.notes || ""
      };
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  materialRequestsTUG6.unshift(newMR);
  
  createAudit(
    newMR.status === "Submitted" ? "Submit Request" : "Create Request",
    "Material Requests TUG 6",
    `${newMR.status === "Submitted" ? "Submitted" : "Created Draft of"} TUG 6 Request ${newMR.request_number}`,
    userHeader
  );

  res.status(201).json(newMR);
});

app.post("/api/material-requests-tug6/batch", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const userObj = users.find(u => u.username === userHeader) || users[3];
  const itemsArray = req.body;

  if (!Array.isArray(itemsArray)) {
    return res.status(400).json({ error: "Body must be an array of requests" });
  }

  const createdRequests: MaterialRequest[] = [];
  const currentYear = new Date().getFullYear();

  for (const doc of itemsArray) {
    const sameYearMRs = [...materialRequestsTUG6, ...createdRequests].filter(m => m.request_number.startsWith(`MR6-${currentYear}`));
    let nextSeqStr = "000001";
    if (sameYearMRs.length > 0) {
      const seqs = sameYearMRs.map(m => {
        const partsNum = m.request_number.split("-");
        return Number(partsNum[partsNum.length - 1] || 0);
      });
      const maxSeq = Math.max(...seqs);
      nextSeqStr = String(maxSeq + 1).padStart(6, "0");
    }
    const requestNumber = `MR6-${currentYear}-${nextSeqStr}`;

    const newMR: MaterialRequest = {
      id: `mr6-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      request_number: requestNumber,
      request_date: doc.request_date || new Date().toISOString().split("T")[0],
      requester_name: userObj.name || doc.requester_name || "Crew User",
      vessel_name: doc.vessel_name || userObj.vesselName || "MV. KARTINI BARUNA",
      warehouse_name: doc.warehouse_name || "Jakarta HQ Warehouse",
      delivery_address: doc.delivery_address || "",
      work_order_ref: doc.work_order_ref || "",
      account_code: doc.account_code || "",
      function_code: doc.function_code || "",
      remarks: doc.remarks || "",
      status: (doc.status as MaterialRequestStatus) || "Draft",
      tug_type: "TUG6",
      tug6_number: `TUG6-${currentYear}-${nextSeqStr.slice(-3)}`,
      items: (doc.items || []).map((itm: any) => {
        const sp = spareParts.find(p => p.id === itm.spare_part_id || p.part_number === itm.part_number);
        return {
          spare_part_id: sp ? sp.id : itm.spare_part_id,
          spare_part_name: sp ? sp.part_name : itm.spare_part_name,
          part_number: sp ? sp.part_number : itm.part_number,
          unit: sp ? sp.unit : (itm.unit || "PCS"),
          avg_monthly_usage: itm.avg_monthly_usage !== undefined ? Number(itm.avg_monthly_usage) : (sp ? 1 : 0),
          remaining_stock: sp ? sp.current_stock : Number(itm.remaining_stock || 0),
          requested_qty: Number(itm.requested_qty || 1),
          notes: itm.notes || ""
        };
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    createdRequests.push(newMR);
  }

  for (const newMR of createdRequests) {
    materialRequestsTUG6.unshift(newMR);
  }

  res.status(201).json(createdRequests);
});

app.put("/api/material-requests-tug6/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const body = req.body;

  const idx = materialRequestsTUG6.findIndex(mr => mr.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Material Request TUG 6 not found" });
    return;
  }

  const oldMR = materialRequestsTUG6[idx];

  const alfin_signed = body.alfin_signed !== undefined ? Boolean(body.alfin_signed) : oldMR.alfin_signed;
  const alfin_signed_at = body.alfin_signed_at || oldMR.alfin_signed_at;
  const alfin_signature_url = body.alfin_signature_url || oldMR.alfin_signature_url;

  const emir_signed = body.emir_signed !== undefined ? Boolean(body.emir_signed) : oldMR.emir_signed;
  const emir_signed_at = body.emir_signed_at || oldMR.emir_signed_at;
  const emir_signature_url = body.emir_signature_url || oldMR.emir_signature_url;

  const sumbono_signed = body.sumbono_signed !== undefined ? Boolean(body.sumbono_signed) : oldMR.sumbono_signed;
  const sumbono_signed_at = body.sumbono_signed_at || oldMR.sumbono_signed_at;
  const sumbono_signature_url = body.sumbono_signature_url || oldMR.sumbono_signature_url;

  let newStatus = (body.status as MaterialRequestStatus) || oldMR.status;
  if (sumbono_signed || (alfin_signed && emir_signed && sumbono_signed)) {
    newStatus = "Approved";
  }

  const updatedMR: MaterialRequest = {
    ...oldMR,
    ...body,
    request_date: body.request_date || oldMR.request_date,
    vessel_name: body.vessel_name || oldMR.vessel_name,
    warehouse_name: body.warehouse_name || oldMR.warehouse_name,
    delivery_address: body.delivery_address !== undefined ? body.delivery_address : oldMR.delivery_address,
    work_order_ref: body.work_order_ref !== undefined ? body.work_order_ref : oldMR.work_order_ref,
    account_code: body.account_code !== undefined ? body.account_code : oldMR.account_code,
    function_code: body.function_code !== undefined ? body.function_code : oldMR.function_code,
    remarks: body.remarks !== undefined ? body.remarks : oldMR.remarks,
    status: newStatus,
    alfin_signed,
    alfin_signed_at,
    alfin_signature_url,
    emir_signed,
    emir_signed_at,
    emir_signature_url,
    sumbono_signed,
    sumbono_signed_at,
    sumbono_signature_url,
    items: body.items ? body.items.map((itm: any) => ({
      spare_part_id: itm.spare_part_id,
      spare_part_name: itm.spare_part_name,
      part_number: itm.part_number,
      unit: itm.unit,
      avg_monthly_usage: itm.avg_monthly_usage,
      remaining_stock: itm.remaining_stock,
      requested_qty: itm.requested_qty,
      notes: itm.notes || "",
      item_status: itm.item_status || "Pending"
    })) : oldMR.items,
    updated_at: new Date().toISOString()
  };

  materialRequestsTUG6[idx] = updatedMR;
  res.json(updatedMR);
});

app.delete("/api/material-requests-tug6/:id", (req, res) => {
  const { id } = req.params;
  const idx = materialRequestsTUG6.findIndex(mr => mr.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Material Request TUG 6 not found" });
  }
  const removed = materialRequestsTUG6[idx];
  materialRequestsTUG6.splice(idx, 1);
  res.json({ success: true, id });
});

app.post("/api/material-requests-tug6/:id/action-log", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const { action } = req.body;

  const mr = materialRequestsTUG6.find(m => m.id === id);
  if (!mr) {
    res.status(404).json({ error: "Material Request TUG 6 not found" });
    return;
  }

  createAudit(action, "Material Requests TUG 6", `Printed or Downloaded TUG 6 form for ${mr.request_number}`, userHeader);
  res.json({ success: true });
});

// --- MATERIAL RETURN & TUG 10 SYSTEM ---
app.get("/api/material-returns", async (req, res) => {
  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        const [rows]: any = await pool.query("SELECT * FROM material_returns ORDER BY created_at DESC");
        const parsed = rows.map((r: any) => ({
          ...r,
          items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items || [])
        }));
        return res.json(parsed);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to fetch material_returns:", err.message);
    }
  }
  res.json(materialReturns);
});

app.post("/api/material-returns", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const body = req.body;

  const currentYear = new Date().getFullYear();
  const sameYearReturns = materialReturns.filter(r => r.return_number.startsWith(`TUG10-${currentYear}`));
  const nextSeq = sameYearReturns.length + 1;
  const returnNum = `TUG10-${currentYear}-${String(nextSeq).padStart(6, "0")}`;

  const newReturn: MaterialReturn = {
    id: `ret-${Date.now()}`,
    return_number: returnNum,
    return_date: body.return_date || new Date().toISOString().split("T")[0],
    vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
    warehouse_name: body.warehouse_name || "Jakarta HQ Warehouse",
    spk_number: body.spk_number || "NP",
    work_order_number: body.work_order_number || "NP",
    dispatch_reference: body.dispatch_reference,
    return_reason: body.return_reason || "",
    notes: body.notes || "",
    status: (body.status as MaterialReturnStatus) || "Draft",
    items: (body.items || []).map((itm: any) => ({
      spare_part_id: itm.spare_part_id,
      part_number: itm.part_number,
      part_name: itm.part_name,
      unit: itm.unit || "PCS",
      qty_issued: Number(itm.qty_issued || 0),
      qty_used: Number(itm.qty_used || 0),
      qty_returnable: Number(itm.qty_returnable || 0),
      qty_returned: Number(itm.qty_returned || 0),
      notes: itm.notes || "",
    })),
    created_by: userHeader || "admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    account_code: body.account_code || "BPP",
    function_code: body.function_code || "ARMADA"
  };

  materialReturns.unshift(newReturn);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query(
          `INSERT INTO material_returns (
            id, return_number, vessel_name, spk_id, spk_number, return_date,
            account_code, function_code, status, items, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newReturn.id,
            newReturn.return_number,
            newReturn.vessel_name,
            body.spk_id || null,
            newReturn.spk_number || null,
            newReturn.return_date,
            newReturn.account_code || "BPP",
            newReturn.function_code || "ARMADA",
            newReturn.status,
            JSON.stringify(newReturn.items || []),
            newReturn.created_by || "Chief Engineer"
          ]
        );
        console.log(`✅ [MySQL DB] Saved new TUG 10 return '${newReturn.return_number}' into MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to save material_return:", err.message);
    }
  }

  createAudit(
    "Create Return",
    "Material Returns",
    `Created material return form TUG 10 (${returnNum}) for vessel ${body.vessel_name}`,
    userHeader
  );

  res.json(newReturn);
});

app.put("/api/material-returns/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const body = req.body;

  const idx = materialReturns.findIndex(mr => mr.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Material Return not found" });
    return;
  }

  const oldReturn = materialReturns[idx];

  const alfin_signed = body.alfin_signed !== undefined ? Boolean(body.alfin_signed) : oldReturn.alfin_signed;
  const alfin_signed_at = body.alfin_signed_at || oldReturn.alfin_signed_at;
  const alfin_signature_url = body.alfin_signature_url || oldReturn.alfin_signature_url;

  const emir_signed = body.emir_signed !== undefined ? Boolean(body.emir_signed) : oldReturn.emir_signed;
  const emir_signed_at = body.emir_signed_at || oldReturn.emir_signed_at;
  const emir_signature_url = body.emir_signature_url || oldReturn.emir_signature_url;

  const sumbono_signed = body.sumbono_signed !== undefined ? Boolean(body.sumbono_signed) : oldReturn.sumbono_signed;
  const sumbono_signed_at = body.sumbono_signed_at || oldReturn.sumbono_signed_at;
  const sumbono_signature_url = body.sumbono_signature_url || oldReturn.sumbono_signature_url;

  let newStatus = (body.status as MaterialReturnStatus) || oldReturn.status;
  if (sumbono_signed || (alfin_signed && emir_signed && sumbono_signed)) {
    newStatus = "Approved";
  }

  const updatedReturn: MaterialReturn = {
    ...oldReturn,
    ...body,
    return_date: body.return_date || oldReturn.return_date,
    warehouse_name: body.warehouse_name || oldReturn.warehouse_name,
    return_reason: body.return_reason || oldReturn.return_reason,
    notes: body.notes || oldReturn.notes,
    status: newStatus,
    alfin_signed,
    alfin_signed_at,
    alfin_signature_url,
    emir_signed,
    emir_signed_at,
    emir_signature_url,
    sumbono_signed,
    sumbono_signed_at,
    sumbono_signature_url,
    items: body.items ? body.items.map((itm: any) => ({
      spare_part_id: itm.spare_part_id,
      part_number: itm.part_number,
      part_name: itm.part_name,
      unit: itm.unit || "PCS",
      qty_issued: Number(itm.qty_issued || 0),
      qty_used: Number(itm.qty_used || 0),
      qty_returnable: Number(itm.qty_returnable || 0),
      qty_returned: Number(itm.qty_returned || 0),
      notes: itm.notes || "",
    })) : oldReturn.items,
    updated_at: new Date().toISOString(),
    account_code: body.account_code || oldReturn.account_code || "BPP",
    function_code: body.function_code || oldReturn.function_code || "ARMADA"
  };

  // If transition to Approved: trigger inventory update
  if (oldStatus !== "Approved" && newStatus === "Approved") {
    // Audit log & Inventory ledger update for each approved item
    updatedReturn.items.forEach(itm => {
      if (itm.qty_returned > 0) {
        // Find existing part by spare_part_id or part_number
        let part = spareParts.find(p => p.id === itm.spare_part_id || p.part_number === itm.part_number);

        if (!part) {
          // Create a brand new spare part in the master conforming exactly to SparePart type
          const newPartId = `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          part = {
            id: newPartId,
            sku: `SKU-${itm.part_number || "RET"}-${Math.floor(Math.random() * 900) + 100}`,
            part_number: itm.part_number,
            part_name: itm.part_name,
            category: "Returned Spares",
            vendor_id: "vendor-1",
            vessel_compatibility: updatedReturn.vessel_name || "All Vessels",
            unit: itm.unit || "PCS",
            brand: "Generic",
            maker: "Unknown",
            minimum_stock: 1,
            maximum_stock: 100,
            reorder_point: 5,
            current_stock: 0, // starts at 0, createLedgerEntry will increase it by qty_returned
            reserved_stock: 0,
            location_id: "Unassigned", // Not set / Storage needs setting
            barcode: `BC-${newPartId}`,
            qr_code: `QR-${newPartId}`,
            created_by: userHeader || "admin",
            updated_by: userHeader || "admin",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          spareParts.push(part);
          itm.spare_part_id = newPartId;
        } else {
          itm.spare_part_id = part.id;
        }

        createLedgerEntry(
          TransactionType.RETURN,
          itm.spare_part_id,
          itm.qty_returned, // qtyIn = returned quantity (adds back to warehouse inventory)
          0,                // qtyOut = 0
          updatedReturn.return_number,
          `Pengembalian barang TUG 10 dari kapal ${updatedReturn.vessel_name}`,
          userHeader || "admin"
        );
      }
    });

    createAudit(
      "Approve Return",
      "Material Returns",
      `Approved Material Return TUG 10 (${updatedReturn.return_number}). Stock replenished.`,
      userHeader
    );
  } else if (oldStatus !== newStatus) {
    createAudit(
      "Update Return Status",
      "Material Returns",
      `Updated Material Return TUG 10 (${updatedReturn.return_number}) status to ${newStatus}`,
      userHeader
    );
  } else {
    createAudit(
      "Edit Return",
      "Material Returns",
      `Edited details of Material Return TUG 10 (${updatedReturn.return_number})`,
      userHeader
    );
  }

  materialReturns[idx] = updatedReturn;

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query(
          `UPDATE material_returns SET 
            vessel_name = ?, return_date = ?, status = ?, items = ?,
            account_code = ?, function_code = ?
           WHERE id = ?`,
          [
            updatedReturn.vessel_name,
            updatedReturn.return_date,
            updatedReturn.status,
            JSON.stringify(updatedReturn.items || []),
            updatedReturn.account_code || "BPP",
            updatedReturn.function_code || "ARMADA",
            id
          ]
        );
        console.log(`✅ [MySQL DB] Updated TUG 10 return '${updatedReturn.return_number}' in MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to update material_return:", err.message);
    }
  }

  res.json(updatedReturn);
});

app.delete("/api/material-returns/:id", async (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;

  const idx = materialReturns.findIndex(mr => mr.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Material Return not found" });
  }

  const removed = materialReturns[idx];
  materialReturns.splice(idx, 1);

  if (isDbConnected()) {
    try {
      const pool = getPool();
      if (pool) {
        await pool.query("DELETE FROM material_returns WHERE id = ?", [id]);
        console.log(`✅ [MySQL DB] Deleted TUG 10 return '${id}' from MySQL database!`);
      }
    } catch (err: any) {
      console.error("❌ [MySQL DB] Failed to delete material_return:", err.message);
    }
  }

  createAudit(
    "Delete Return",
    "Material Returns",
    `Deleted Material Return ${removed.return_number}`,
    userHeader
  );

  res.json({ success: true, id });
});

app.post("/api/material-returns/:id/action-log", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const { action } = req.body; // "Printed" | "Downloaded"

  const mr = materialReturns.find(m => m.id === id);
  if (!mr) {
    res.status(404).json({ error: "Material Return not found" });
    return;
  }

  createAudit(action, "Material Returns", `Printed or Downloaded TUG 10 form for ${mr.return_number}`, userHeader);
  res.json({ success: true });
});

// VESSEL REQUEST SYSTEM
app.get("/api/requests", (req, res) => {
  res.json(requests);
});

app.post("/api/requests", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const userObj = users.find(u => u.username === userHeader) || users[3]; // Fallback Crew
  const body = req.body;

  const newRequest: VesselRequest = {
    id: `req-${Date.now()}`,
    request_number: `REQ-2026-${Date.now().toString().slice(-4)}-${(userObj.vesselName || "Unknown").replace(/\s+/g, '')}`,
    vessel_name: userObj.vesselName || body.vessel_name || "MV. KARTINI BARUNA",
    requester_name: userObj.name || "Vessel Crew Operator",
    urgency: (body.urgency as RequestUrgency) || RequestUrgency.NORMAL,
    items: body.items.map((itm: any) => {
      const part = spareParts.find(p => p.id === itm.spare_part_id);
      return {
        spare_part_id: itm.spare_part_id,
        spare_part_name: part ? part.part_name : "General Spare",
        part_number: part ? part.part_number : "PN-GENERIC",
        qty_requested: Number(itm.qty_requested || 1),
        unit: part ? part.unit : "PCS"
      };
    }),
    status: RequestStatus.SUBMITTED,
    remarks: body.remarks || "",
    attachment_url: body.attachment_url || "",
    created_at: new Date().toISOString()
  };

  requests.unshift(newRequest);

  // Automatically trigger a superintendent APPROVAL task!
  const newApproval: ApprovalTask = {
    id: `app-${Date.now()}`,
    type: ApprovalType.VESSEL_REQUEST,
    reference_id: newRequest.id,
    reference_number: newRequest.request_number,
    vessel_or_area: newRequest.vessel_name,
    requester_name: newRequest.requester_name,
    requested_date: newRequest.created_at,
    summary: `${newRequest.items.length} items requested with Urgency: ${newRequest.urgency}`,
    status: "Pending",
    remarks: ""
  };
  approvals.unshift(newApproval);

  createAudit("Submit Request", "Vessel Requests", `Submitted spare parts requisitions ${newRequest.request_number}`, userHeader);
  res.status(201).json(newRequest);
});

app.put("/api/requests/:id", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const updateBody = req.body;

  const reqIdx = requests.findIndex(r => r.id === id);
  if (reqIdx === -1) {
    res.status(404).json({ error: "Vessel request not found" });
    return;
  }

  const oldReq = requests[reqIdx];
  const updatedReq = {
    ...oldReq,
    ...updateBody,
    status: updateBody.status as RequestStatus
  };

  requests[reqIdx] = updatedReq;
  createAudit("Request Updated", "Vessel Requests", `Updated request state for ${oldReq.request_number} to ${updatedReq.status}`, userHeader);
  res.json(updatedReq);
});

// APPROVALS WORKFLOW
app.get("/api/approvals", (req, res) => {
  res.json(approvals);
});

app.post("/api/approvals/:id/decide", (req, res) => {
  const userHeader = req.headers["x-user-username"] as string;
  const { id } = req.params;
  const { decision, remarks } = req.body; // decision: "Approved" | "Rejected"

  const appIdx = approvals.findIndex(a => a.id === id);
  if (appIdx === -1) {
    res.status(404).json({ error: "Approval task not found" });
    return;
  }

  const task = approvals[appIdx];
  task.status = decision;
  task.remarks = remarks;
  task.actioned_by = userHeader || "Capt. H. Wijaya";
  task.actioned_at = new Date().toISOString();

  // Cascade choice back to the originating modules
  if (task.type === ApprovalType.VESSEL_REQUEST) {
    const vreq = requests.find(r => r.id === task.reference_id);
    if (vreq) {
      vreq.status = decision === "Approved" ? RequestStatus.APPROVED : RequestStatus.REJECTED;
      vreq.approved_by = task.actioned_by;
      vreq.approved_at = task.actioned_at;

      // If approved, dynamically queue a Dispatch OUTBOUND item!
      if (decision === "Approved") {
        const matchingDispatch = dispatch.find(d => d.request_reference === vreq.request_number);
        if (!matchingDispatch) {
          const newDisp: OutboundDispatch = {
            id: `dsp-${Date.now()}`,
            request_reference: vreq.request_number,
            vessel_name: vreq.vessel_name,
            consignee: `Ship Agent Port of Calls - ${vreq.vessel_name}`,
            items: vreq.items.map(rItem => {
              const sp = spareParts.find(p => p.id === rItem.spare_part_id);
              return {
                spare_part_id: rItem.spare_part_id,
                spare_part_name: rItem.spare_part_name,
                part_number: rItem.part_number,
                qty_requested: rItem.qty_requested,
                qty_dispatched: rItem.qty_requested,
                unit: rItem.unit,
                unit_price: sp && sp.category.includes("Engine") ? 3200 : 450
              };
            }),
            status: DispatchStatus.WAITING,
            bon_pengeluaran_number: `BPB-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            surat_jalan_number: `SJL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            manifest_number: `MNF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            courier_name: "DHL Sea Freight Priority",
            created_by: "System Dispatcher",
            work_order_ref: "",
            account_code: "BPP",
            function_code: "ARMADA"
          };

          // Reserve the stock
          newDisp.items.forEach(itm => {
            const part = spareParts.find(p => p.id === itm.spare_part_id);
            if (part) {
              part.reserved_stock += itm.qty_requested;
            }
          });

          dispatch.unshift(newDisp);
        }
      }
    }
  }

  createAudit("Workflow Approval", "Approvals", `Superintendent ${decision} requisition reference ${task.reference_number}`, userHeader);
  res.json(task);
});

// MOVEMENT LEDGER (STOCK TRANSACTION CARD HISTORY)
app.get("/api/ledger", (req, res) => {
  res.json(ledger);
});

// SYSTEM AUDIT TRAIL
app.get("/api/audit", (req, res) => {
  res.json(auditLogs);
});

// --- COMBINED DASHBOARD METRICS ---
app.get("/api/dashboard/summary", (req, res) => {
  const totalParts = spareParts.length;
  const lowStockParts = spareParts.filter(p => p.current_stock <= p.reorder_point).length;
  
  const pendingTug5List = materialRequests.filter(m => 
    m.status === "Submitted" || 
    m.status === "Draft" || 
    (m.status as any) === "Processing" || 
    (m.status as any) === "Pending" ||
    (m.status as any) === "Pending Approval"
  );

  const pendingApprovalsCount = pendingTug5List.length;
  const activeDispatchesCount = dispatch.filter(d => d.status !== DispatchStatus.DELIVERED).length;
  const totalReceivingCount = receiving.length;

  res.json({
    totalParts,
    lowStockParts,
    pendingApprovalsCount,
    activeDispatchesCount,
    totalReceivingCount,
    pendingMaterialRequests: pendingTug5List,
    lowStockAlerts: spareParts.filter(p => p.current_stock <= p.reorder_point).map(p => ({
      id: p.id,
      part_name: p.part_name,
      part_number: p.part_number,
      current_stock: p.current_stock,
      reorder_point: p.reorder_point,
      sku: p.sku
    })),
    recentActivities: auditLogs.slice(0, 8)
  });
});

app.get("/api/db/status", (req, res) => {
  res.json({
    connected: isDbConnected(),
    driver: "MySQL 8.0+",
    database: process.env.DB_NAME || "wms_pt_bag",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306)
  });
});

app.post("/api/demo/seed", async (req, res) => {
  try {
    if (isDbConnected()) {
      await seedDatabase(true);
    }
    createAudit("Seed Demo Data", "System", "Seeded 190+ synchronized demo records into WMS MySQL database", "Superadmin");
    res.json({ success: true, message: "Seluruh 190+ data demo WMS (TUG 5, TUG 8, TUG 10, SPK, Users, Spareparts) berhasil di-seed ke MySQL & phpMyAdmin!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VITE MIDDLEWARE CONFIG / STATIC SERVE ---

async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // This connects Vite's HMR and dev asset rendering
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Maritime WMS full-stack backend running perfectly on http://localhost:${PORT}`);
  });
}

startServer();
