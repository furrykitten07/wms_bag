/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from "mysql2/promise";
import { 
  demoSpareParts, 
  demoSPKs, 
  demoMaterialRequests, 
  demoDispatches, 
  demoReceiving, 
  demoMaterialReturns 
} from "./src/demoSeedData.js";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "wms_pt_bag";
const DB_PORT = Number(process.env.DB_PORT || 3306);

let isConnected = false;
let pool: mysql.Pool | null = null;

// Initialize MySQL Pool
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000
    });
  }
  return pool;
}

export function isDbConnected(): boolean {
  return isConnected;
}

// Automatic Schema Initializer & Seeder
export async function initDatabase(): Promise<boolean> {
  try {
    // Step 1: Create connection without database to ensure database exists
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();

    const dbPool = getPool();
    
    // Step 2: Create Tables
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        module VARCHAR(255) NOT NULL,
        description TEXT,
        username VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(100) NOT NULL,
        password VARCHAR(255) DEFAULT 'admin123' NOT NULL,
        vessel_name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        warehouse VARCHAR(100) NOT NULL,
        zone VARCHAR(100) NOT NULL,
        rack VARCHAR(100) NOT NULL,
        shelf VARCHAR(100) NOT NULL,
        bin VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS spare_parts (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        part_number VARCHAR(100) NOT NULL,
        alternative_part_number VARCHAR(100),
        part_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        vendor_id VARCHAR(50),
        vessel_compatibility TEXT,
        unit VARCHAR(50) DEFAULT 'PCS' NOT NULL,
        brand VARCHAR(100),
        maker VARCHAR(100),
        minimum_stock INT DEFAULT 2 NOT NULL,
        maximum_stock INT DEFAULT 20 NOT NULL,
        reorder_point INT DEFAULT 4 NOT NULL,
        current_stock INT DEFAULT 0 NOT NULL,
        reserved_stock INT DEFAULT 0 NOT NULL,
        location_id VARCHAR(50),
        barcode VARCHAR(100),
        qr_code VARCHAR(255),
        qr_url TEXT,
        qr_slug VARCHAR(255),
        description TEXT,
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure qr_url and qr_slug columns exist if table already created
    try {
      await dbPool.query("ALTER TABLE spare_parts ADD COLUMN qr_url TEXT;");
    } catch (e) {}
    try {
      await dbPool.query("ALTER TABLE spare_parts ADD COLUMN qr_slug VARCHAR(255);");
    } catch (e) {}

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS spk_work_orders (
        id VARCHAR(50) PRIMARY KEY,
        spk_number VARCHAR(100) UNIQUE NOT NULL,
        target_port VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        remarks TEXT,
        vessels JSON NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS digital_signatures (
        id VARCHAR(50) PRIMARY KEY,
        role_title VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        signature_url LONGTEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS material_requests (
        id VARCHAR(50) PRIMARY KEY,
        request_number VARCHAR(100) UNIQUE NOT NULL,
        tug5_number VARCHAR(100),
        tug6_number VARCHAR(100),
        tug_type VARCHAR(20) DEFAULT 'TUG5',
        vessel_name VARCHAR(255) NOT NULL,
        request_date DATE NOT NULL,
        requester_name VARCHAR(255) NOT NULL,
        warehouse_name VARCHAR(100) NOT NULL,
        delivery_address TEXT,
        work_order_ref VARCHAR(100),
        account_code VARCHAR(50) DEFAULT 'BPP',
        function_code VARCHAR(50) DEFAULT 'ARMADA',
        urgency VARCHAR(50) DEFAULT 'NORMAL',
        department VARCHAR(100),
        remarks TEXT,
        status VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS outbound_dispatches (
        id VARCHAR(50) PRIMARY KEY,
        dispatch_number VARCHAR(100) UNIQUE NOT NULL,
        tug8_number VARCHAR(100),
        bon_pengeluaran_number VARCHAR(100),
        surat_jalan_number VARCHAR(100),
        manifest_number VARCHAR(100),
        spk_id VARCHAR(50),
        spk_number VARCHAR(100),
        vessel_name VARCHAR(255) NOT NULL,
        destination_port VARCHAR(255) NOT NULL,
        warehouse_origin VARCHAR(100) NOT NULL,
        transporter_name VARCHAR(255),
        vehicle_number VARCHAR(50),
        driver_name VARCHAR(100),
        driver_phone VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS inbound_receivings (
        id VARCHAR(50) PRIMARY KEY,
        purchase_order_num VARCHAR(100) NOT NULL,
        delivery_note_num VARCHAR(100) NOT NULL,
        vendor_id VARCHAR(50),
        vendor_name VARCHAR(255) NOT NULL,
        received_date DATETIME NOT NULL,
        status VARCHAR(50) NOT NULL,
        return_note_num VARCHAR(100),
        reject_reason TEXT,
        items JSON NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS material_returns (
        id VARCHAR(50) PRIMARY KEY,
        return_number VARCHAR(100) UNIQUE NOT NULL,
        vessel_name VARCHAR(255) NOT NULL,
        spk_id VARCHAR(50),
        spk_number VARCHAR(100),
        return_date DATE NOT NULL,
        account_code VARCHAR(50) DEFAULT 'BPP',
        function_code VARCHAR(50) DEFAULT 'ARMADA',
        status VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS movement_ledger_entries (
        id VARCHAR(50) PRIMARY KEY,
        transaction_type VARCHAR(50) NOT NULL,
        spare_part_id VARCHAR(50) NOT NULL,
        spare_part_name VARCHAR(255) NOT NULL,
        part_number VARCHAR(100) NOT NULL,
        source_location VARCHAR(100),
        destination_location VARCHAR(100),
        qty_in INT DEFAULT 0 NOT NULL,
        qty_out INT DEFAULT 0 NOT NULL,
        before_stock INT NOT NULL,
        after_stock INT NOT NULL,
        reference_number VARCHAR(100) NOT NULL,
        remarks TEXT,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    isConnected = true;
    console.log(`✅ [MySQL DB] Successfully connected to database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}`);

    // Step 3: Automatically Seed Data if Tables Are Empty
    await seedDatabase();

    return true;
  } catch (error: any) {
    isConnected = false;
    console.warn(`⚠️ [MySQL DB] Connection failed (${error.message}). System is running with in-memory state.`);
    return false;
  }
}

// Data Seeder Function
export async function seedDatabase(force: boolean = false) {
  const dbPool = getPool();
  if (!dbPool) return;

  try {
    // 1. Always ensure core system accounts exist in MySQL
    const defaultUsers = [
      { id: "usr-1", username: "superadmin", name: "Fikri Haikal (Superadmin)", email: "superadmin@maritime-logistics.com", role: "Super Admin", password: "admin123", vessel_name: null },
      { id: "usr-2", username: "staff_gudang_1", name: "Ahmad Subarjo", email: "ahmad.subarjo@maritime-logistics.com", role: "Warehouse Admin", password: "admin123", vessel_name: null },
      { id: "usr-3", username: "alfin", name: "Maghfur Muhammad Alfin", email: "alfin.rendalhar@maritime-logistics.com", role: "Petugas Gudang", password: "admin123", vessel_name: null },
      { id: "usr-4", username: "emir", name: "Mohamat Emir Ferdian", email: "emir.ferdian@maritime-logistics.com", role: "Manager Logistik", password: "admin123", vessel_name: null },
      { id: "usr-5", username: "sumbono", name: "Sumbono", email: "sumbono@maritime-logistics.com", role: "VP Rendalhar", password: "admin123", vessel_name: null },
      { id: "usr-6", username: "crew_voyager", name: "Anto Wijaya", email: "voyager.chief@maritime-crew.com", role: "Vessel Crew", password: "admin123", vessel_name: "MV. KARTINI BARUNA" }
    ];
    for (const u of defaultUsers) {
      await dbPool.query(
        "INSERT IGNORE INTO users (id, username, name, email, role, password, vessel_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [u.id, u.username, u.name, u.email, u.role, u.password, u.vessel_name]
      );
    }

    // Check if remaining tables have data
    const [userRows]: any = await dbPool.query("SELECT COUNT(*) as count FROM users");
    if (userRows[0].count > 6 && !force) {
      console.log("ℹ️ [MySQL DB] Core tables populated. Skipping full auto-seed.");
      return;
    }

    // Digital Signatures
    const signatures = [
      { id: "sig-1", role_title: "Chief Engineer (Pembuat TUG 5 / TUG 10)", user_name: "Anto Wijaya", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=AntoWijaya", notes: "Tanda tangan resmi Chief Engineer Armada Kapal" },
      { id: "sig-2", role_title: "Verifikator Rendalhar (Level 1 Approval)", user_name: "Maghfur Muhammad Alfin", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=MaghfurAlfin", notes: "Tanda tangan verifikasi dokumen Rendalhar Level 1" },
      { id: "sig-3", role_title: "Manager Logistik (Level 2 Approval)", user_name: "Mohamat Emir Ferdian", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian", notes: "Tanda tangan persetujuan operasional logistik Level 2" },
      { id: "sig-4", role_title: "VP Rendalhar (Level 3 Pengesahan)", user_name: "Sumbono", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono", notes: "Tanda tangan pengesahan VP Rendalhar Level 3" },
      { id: "sig-5", role_title: "Staff Gudang (Penerima / Pengeluar TUG 8)", user_name: "Ahmad Subarjo", signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=AhmadSubarjo", notes: "Tanda tangan verifikasi fisik gudang utama" }
    ];
    for (const s of signatures) {
      await dbPool.query(
        "INSERT IGNORE INTO digital_signatures (id, role_title, user_name, signature_url, notes) VALUES (?, ?, ?, ?, ?)",
        [s.id, s.role_title, s.user_name, s.signature_url, s.notes]
      );
    }

    // 2. Vendors
    const vendors = [
      { id: "vnd-1", name: "Wärtsilä Marine Power Systems", code: "VND-WRT-01", contact_person: "Mikael Lindqvist", phone: "+358 10 709 0000", email: "parts.marine@wartsila.com", address: "Helsinki, Finland" },
      { id: "vnd-2", name: "MAN Energy Solutions SE", code: "VND-MAN-02", contact_person: "Hans Müller", phone: "+49 821 3220", email: "prime-serv@man-es.com", address: "Augsburg, Germany" },
      { id: "vnd-3", name: "Nagasaki Ship Propeller Co.", code: "VND-NSP-03", contact_person: "Hiroshi Sato", phone: "+81 95 824 1111", email: "sales@nagasaki-prop.jp", address: "Nagasaki, Japan" },
      { id: "vnd-4", name: "Jakarta Maritime Sparepart Ind.", code: "VND-JMS-04", contact_person: "Yudi Pratama", phone: "+62 21 4390 1234", email: "sales@jakartamaritime.co.id", address: "Tanjung Priok, Jakarta, Indonesia" }
    ];
    for (const v of vendors) {
      await dbPool.query(
        "INSERT IGNORE INTO vendors (id, name, code, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [v.id, v.name, v.code, v.contact_person, v.phone, v.email, v.address]
      );
    }

    // 3. Warehouse Locations
    const locations = [
      { id: "loc-1", code: "A1", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (Ground level)", rack: "Rack A", shelf: "Level 1", bin: "A1-G" },
      { id: "loc-2", code: "A2", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (Mid level)", rack: "Rack A", shelf: "Level 2", bin: "A2-M" },
      { id: "loc-3", code: "A3", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (High level)", rack: "Rack A", shelf: "Level 3", bin: "A3-H" },
      { id: "loc-4", code: "B1", warehouse: "Gudang Merak", zone: "Zone B (Heavy Machinery)", rack: "Rack B", shelf: "Level 1", bin: "B1-H" },
      { id: "loc-5", code: "C1", warehouse: "Gudang Surabaya", zone: "Zone C (Electrical)", rack: "Rack C", shelf: "Level 1", bin: "C1-E" }
    ];
    for (const l of locations) {
      await dbPool.query(
        "INSERT IGNORE INTO warehouse_locations (id, code, warehouse, zone, rack, shelf, bin) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [l.id, l.code, l.warehouse, l.zone, l.rack, l.shelf, l.bin]
      );
    }

    // 4. Spare Parts (50 items)
    for (const sp of demoSpareParts) {
      const qrCodeVal = sp.qr_code || sp.part_number || sp.sku;
      const qrUrlVal = sp.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(sp.sku || sp.part_number)}`;
      const qrSlugVal = sp.qr_slug || sp.sku;
      const barcodeVal = sp.barcode || sp.sku || sp.id;

      await dbPool.query(
        `INSERT IGNORE INTO spare_parts (
          id, sku, part_number, alternative_part_number, part_name, category, vendor_id, 
          vessel_compatibility, unit, brand, maker, minimum_stock, maximum_stock, 
          reorder_point, current_stock, reserved_stock, location_id, barcode, qr_code, qr_url, qr_slug, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sp.id, sp.sku, sp.part_number, sp.alternative_part_number || null, sp.part_name,
          sp.category, sp.vendor_id || null, Array.isArray(sp.vessel_compatibility) ? JSON.stringify(sp.vessel_compatibility) : (sp.vessel_compatibility || null),
          sp.unit, sp.brand || null, sp.maker || null, sp.minimum_stock || 2, sp.maximum_stock || 20,
          sp.reorder_point || 4, sp.current_stock || 10, sp.reserved_stock || 0, sp.location_id || null,
          barcodeVal, qrCodeVal, qrUrlVal, qrSlugVal, sp.description || null
        ]
      );

      // Ensure existing MySQL rows get populated with QR Code URLs
      await dbPool.query(
        "UPDATE spare_parts SET qr_code = ?, qr_url = ?, qr_slug = ?, barcode = ? WHERE id = ? AND (qr_url IS NULL OR qr_code IS NULL)",
        [qrCodeVal, qrUrlVal, qrSlugVal, barcodeVal, sp.id]
      );
    }

    // 5. SPKs (30 items)
    for (const spk of demoSPKs) {
      await dbPool.query(
        `INSERT IGNORE INTO spk_work_orders (
          id, spk_number, target_port, status, remarks, vessels, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          spk.id, spk.spk_number, spk.target_port, spk.status, spk.remarks || null,
          JSON.stringify(spk.vessels || []), spk.created_by || "Superadmin"
        ]
      );
    }

    // 6. TUG 5 Material Requests (30 items)
    for (const mr of demoMaterialRequests) {
      await dbPool.query(
        `INSERT IGNORE INTO material_requests (
          id, request_number, tug5_number, vessel_name, request_date, requester_name,
          warehouse_name, delivery_address, work_order_ref, account_code, function_code,
          urgency, department, remarks, status, items
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mr.id, mr.request_number, mr.tug5_number || null, mr.vessel_name, mr.request_date,
          mr.requester_name || mr.requested_by || "Chief Engineer", mr.warehouse_name || "Jakarta HQ Warehouse",
          mr.delivery_address || null, mr.work_order_ref || mr.spk_number || null, mr.account_code || "BPP",
          mr.function_code || "ARMADA", mr.urgency || "NORMAL", mr.department || "Engine Room",
          mr.remarks || null, mr.status, JSON.stringify(mr.items || [])
        ]
      );
    }

    // 7. TUG 8 Outbound Dispatches (30 items)
    for (const dsp of demoDispatches) {
      await dbPool.query(
        `INSERT IGNORE INTO outbound_dispatches (
          id, dispatch_number, tug8_number, bon_pengeluaran_number, surat_jalan_number,
          manifest_number, spk_id, spk_number, vessel_name, destination_port, warehouse_origin,
          transporter_name, vehicle_number, driver_name, driver_phone, status, items, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dsp.id, dsp.dispatch_number, dsp.tug8_number || null, dsp.bon_pengeluaran_number || null,
          dsp.surat_jalan_number || null, dsp.manifest_number || null, dsp.spk_id || null,
          dsp.spk_number || null, dsp.vessel_name, dsp.destination_port || "Tanjung Priok",
          dsp.warehouse_origin || "Jakarta HQ Warehouse", dsp.transporter_name || null,
          dsp.vehicle_number || null, dsp.driver_name || null, dsp.driver_phone || null,
          dsp.status, JSON.stringify(dsp.items || []), dsp.created_by || "Ahmad Subarjo"
        ]
      );
    }

    // 8. Inbound Receivings (25 items)
    for (const rec of demoReceiving) {
      await dbPool.query(
        `INSERT IGNORE INTO inbound_receivings (
          id, purchase_order_num, delivery_note_num, vendor_id, vendor_name,
          received_date, status, return_note_num, reject_reason, items, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rec.id, rec.purchase_order_num, rec.delivery_note_num, rec.vendor_id || null,
          rec.vendor_name, rec.received_date, rec.status, rec.return_note_num || null,
          rec.reject_reason || null, JSON.stringify(rec.items || []), rec.received_by || "Ahmad Subarjo"
        ]
      );
    }

    // 9. TUG 10 Material Returns (25 items)
    for (const ret of demoMaterialReturns) {
      await dbPool.query(
        `INSERT IGNORE INTO material_returns (
          id, return_number, vessel_name, spk_id, spk_number, return_date,
          account_code, function_code, status, items, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ret.id, ret.return_number, ret.vessel_name, ret.spk_id || null,
          ret.spk_number || null, ret.return_date, ret.account_code || "BPP",
          ret.function_code || "ARMADA", ret.status, JSON.stringify(ret.items || []),
          ret.created_by || "Chief Engineer"
        ]
      );
    }

    console.log("✅ [MySQL DB] Successfully populated all 190+ WMS demo records into phpMyAdmin!");
  } catch (err: any) {
    console.error("❌ [MySQL DB] Error seeding database:", err.message);
  }
}
