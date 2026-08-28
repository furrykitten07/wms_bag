import fs from "fs";
import { 
  demoSpareParts, 
  demoSPKs, 
  demoMaterialRequests, 
  demoDispatches, 
  demoReceiving, 
  demoMaterialReturns 
} from "../src/demoSeedData.js";

const escapeSql = (str: string | null | undefined): string => {
  if (str === null || str === undefined) return "NULL";
  return "'" + String(str).replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
};

const escapeJson = (obj: any): string => {
  if (!obj) return "'[]'";
  return "'" + JSON.stringify(obj).replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
};

let sql = `-- ===================================================
-- DATABASE DDL & SEED DATA MYSQL COMPATIBLE (100% STANDALONE)
-- SYSTEM: WAREHOUSE MANAGEMENT SYSTEM (WMS)
-- CLIENT: PT. PELAYARAN BAHTERA ADHIGUNA
-- ===================================================

CREATE DATABASE IF NOT EXISTS \`wms_pt_bag\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`wms_pt_bag\`;

-- 1. TABEL AUDIT LOGS
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` VARCHAR(100) PRIMARY KEY,
    \`action\` VARCHAR(255) NOT NULL,
    \`module\` VARCHAR(255) NOT NULL,
    \`description\` TEXT,
    \`username\` VARCHAR(100) NOT NULL,
    \`role\` VARCHAR(100) NOT NULL,
    \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL USERS & ROLES
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`username\` VARCHAR(50) UNIQUE NOT NULL,
    \`name\` VARCHAR(255) NOT NULL,
    \`email\` VARCHAR(255) UNIQUE NOT NULL,
    \`role\` VARCHAR(100) NOT NULL,
    \`password\` VARCHAR(255) DEFAULT 'admin123' NOT NULL,
    \`vessel_name\` VARCHAR(255),
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL VENDORS
CREATE TABLE IF NOT EXISTS \`vendors\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`name\` VARCHAR(255) NOT NULL,
    \`code\` VARCHAR(50) UNIQUE NOT NULL,
    \`contact_person\` VARCHAR(255),
    \`phone\` VARCHAR(50),
    \`email\` VARCHAR(255),
    \`address\` TEXT,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL WAREHOUSE LOCATIONS
CREATE TABLE IF NOT EXISTS \`warehouse_locations\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`code\` VARCHAR(50) UNIQUE NOT NULL,
    \`warehouse\` VARCHAR(100) NOT NULL,
    \`zone\` VARCHAR(100) NOT NULL,
    \`rack\` VARCHAR(100) NOT NULL,
    \`shelf\` VARCHAR(100) NOT NULL,
    \`bin\` VARCHAR(100) NOT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABEL SPARE PARTS
CREATE TABLE IF NOT EXISTS \`spare_parts\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`sku\` VARCHAR(100) UNIQUE NOT NULL,
    \`part_number\` VARCHAR(100) NOT NULL,
    \`alternative_part_number\` VARCHAR(100),
    \`part_name\` VARCHAR(255) NOT NULL,
    \`category\` VARCHAR(100) NOT NULL,
    \`vendor_id\` VARCHAR(50),
    \`vessel_compatibility\` TEXT,
    \`unit\` VARCHAR(50) DEFAULT 'PCS' NOT NULL,
    \`brand\` VARCHAR(100),
    \`maker\` VARCHAR(100),
    \`minimum_stock\` INT DEFAULT 2 NOT NULL,
    \`maximum_stock\` INT DEFAULT 20 NOT NULL,
    \`reorder_point\` INT DEFAULT 4 NOT NULL,
    \`current_stock\` INT DEFAULT 0 NOT NULL,
    \`reserved_stock\` INT DEFAULT 0 NOT NULL,
    \`location_id\` VARCHAR(50),
    \`barcode\` VARCHAR(100),
    \`qr_code\` VARCHAR(100),
    \`description\` TEXT,
    \`created_by\` VARCHAR(100),
    \`updated_by\` VARCHAR(100),
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON DELETE SET NULL,
    FOREIGN KEY (\`location_id\`) REFERENCES \`warehouse_locations\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABEL SPK WORK ORDERS
CREATE TABLE IF NOT EXISTS \`spk_work_orders\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`spk_number\` VARCHAR(100) UNIQUE NOT NULL,
    \`target_port\` VARCHAR(255) NOT NULL,
    \`status\` VARCHAR(50) NOT NULL,
    \`remarks\` TEXT,
    \`vessels\` JSON NOT NULL,
    \`created_by\` VARCHAR(100) NOT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. TABEL MATERIAL REQUESTS (TUG 5)
CREATE TABLE IF NOT EXISTS \`material_requests\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`request_number\` VARCHAR(100) UNIQUE NOT NULL,
    \`tug5_number\` VARCHAR(100),
    \`vessel_name\` VARCHAR(255) NOT NULL,
    \`request_date\` DATE NOT NULL,
    \`requester_name\` VARCHAR(255) NOT NULL,
    \`warehouse_name\` VARCHAR(100) NOT NULL,
    \`delivery_address\` TEXT,
    \`work_order_ref\` VARCHAR(100),
    \`account_code\` VARCHAR(50) DEFAULT 'BPP',
    \`function_code\` VARCHAR(50) DEFAULT 'ARMADA',
    \`urgency\` VARCHAR(50) DEFAULT 'NORMAL',
    \`department\` VARCHAR(100),
    \`remarks\` TEXT,
    \`status\` VARCHAR(50) NOT NULL,
    \`items\` JSON NOT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. TABEL OUTBOUND DISPATCHES (TUG 8)
CREATE TABLE IF NOT EXISTS \`outbound_dispatches\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`dispatch_number\` VARCHAR(100) UNIQUE NOT NULL,
    \`tug8_number\` VARCHAR(100),
    \`bon_pengeluaran_number\` VARCHAR(100),
    \`surat_jalan_number\` VARCHAR(100),
    \`manifest_number\` VARCHAR(100),
    \`spk_id\` VARCHAR(50),
    \`spk_number\` VARCHAR(100),
    \`vessel_name\` VARCHAR(255) NOT NULL,
    \`destination_port\` VARCHAR(255) NOT NULL,
    \`warehouse_origin\` VARCHAR(100) NOT NULL,
    \`transporter_name\` VARCHAR(255),
    \`vehicle_number\` VARCHAR(50),
    \`driver_name\` VARCHAR(100),
    \`driver_phone\` VARCHAR(50),
    \`status\` VARCHAR(50) NOT NULL,
    \`items\` JSON NOT NULL,
    \`created_by\` VARCHAR(100) NOT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. TABEL INBOUND RECEIVINGS
CREATE TABLE IF NOT EXISTS \`inbound_receivings\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`purchase_order_num\` VARCHAR(100) NOT NULL,
    \`delivery_note_num\` VARCHAR(100) NOT NULL,
    \`vendor_id\` VARCHAR(50),
    \`vendor_name\` VARCHAR(255) NOT NULL,
    \`received_date\` DATETIME NOT NULL,
    \`status\` VARCHAR(50) NOT NULL,
    \`return_note_num\` VARCHAR(100),
    \`reject_reason\` TEXT,
    \`items\` JSON NOT NULL,
    \`created_by\` VARCHAR(100) NOT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. TABEL MATERIAL RETURNS (TUG 10)
CREATE TABLE IF NOT EXISTS \`material_returns\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`return_number\` VARCHAR(100) UNIQUE NOT NULL,
    \`vessel_name\` VARCHAR(255) NOT NULL,
    \`spk_id\` VARCHAR(50),
    \`spk_number\` VARCHAR(100),
    \`return_date\` DATE NOT NULL,
    \`account_code\` VARCHAR(50) DEFAULT 'BPP',
    \`function_code\` VARCHAR(50) DEFAULT 'ARMADA',
    \`status\` VARCHAR(50) NOT NULL,
    \`items\` JSON NOT NULL,
    \`created_by\` VARCHAR(100) NOT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. TABEL MOVEMENT LEDGER
CREATE TABLE IF NOT EXISTS \`movement_ledger_entries\` (
    \`id\` VARCHAR(50) PRIMARY KEY,
    \`transaction_type\` VARCHAR(50) NOT NULL,
    \`spare_part_id\` VARCHAR(50) NOT NULL,
    \`spare_part_name\` VARCHAR(255) NOT NULL,
    \`part_number\` VARCHAR(100) NOT NULL,
    \`source_location\` VARCHAR(100),
    \`destination_location\` VARCHAR(100),
    \`qty_in\` INT DEFAULT 0 NOT NULL,
    \`qty_out\` INT DEFAULT 0 NOT NULL,
    \`before_stock\` INT NOT NULL,
    \`after_stock\` INT NOT NULL,
    \`reference_number\` VARCHAR(100) NOT NULL,
    \`remarks\` TEXT,
    \`transaction_date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`created_by\` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================
-- SEED DATA INSERTS
-- ===================================================

-- USERS
INSERT IGNORE INTO \`users\` (\`id\`, \`username\`, \`name\`, \`email\`, \`role\`, \`password\`, \`vessel_name\`) VALUES
('usr-1', 'superadmin', 'Fikri Haikal (Superadmin)', 'superadmin@maritime-logistics.com', 'Super Admin', 'admin123', NULL),
('usr-2', 'staff_gudang_1', 'Ahmad Subarjo', 'ahmad.subarjo@maritime-logistics.com', 'Warehouse Admin', 'admin123', NULL),
('usr-3', 'emir', 'Mohamat Emir Ferdian', 'emir.ferdian@maritime-logistics.com', 'Manager Logistik', 'admin123', NULL),
('usr-4', 'sumbono', 'Sumbono', 'sumbono@maritime-logistics.com', 'VP Rendalhar', 'admin123', NULL),
('usr-5', 'crew_voyager', 'Anto Wijaya', 'voyager.chief@maritime-crew.com', 'Vessel Crew', 'admin123', 'MV. KARTINI BARUNA');

-- VENDORS
INSERT IGNORE INTO \`vendors\` (\`id\`, \`name\`, \`code\`, \`contact_person\`, \`phone\`, \`email\`, \`address\`) VALUES
('vnd-1', 'Wärtsilä Marine Power Systems', 'VND-WRT-01', 'Mikael Lindqvist', '+358 10 709 0000', 'parts.marine@wartsila.com', 'Helsinki, Finland'),
('vnd-2', 'MAN Energy Solutions SE', 'VND-MAN-02', 'Hans Müller', '+49 821 3220', 'prime-serv@man-es.com', 'Augsburg, Germany'),
('vnd-3', 'Nagasaki Ship Propeller Co.', 'VND-NSP-03', 'Hiroshi Sato', '+81 95 824 1111', 'sales@nagasaki-prop.jp', 'Nagasaki, Japan'),
('vnd-4', 'Jakarta Maritime Sparepart Ind.', 'VND-JMS-04', 'Yudi Pratama', '+62 21 4390 1234', 'sales@jakartamaritime.co.id', 'Tanjung Priok, Jakarta, Indonesia');

-- WAREHOUSE LOCATIONS
INSERT IGNORE INTO \`warehouse_locations\` (\`id\`, \`code\`, \`warehouse\`, \`zone\`, \`rack\`, \`shelf\`, \`bin\`) VALUES
('loc-1', 'A1', 'Jakarta HQ Warehouse', 'Zone A (Ground level)', 'Rack A', 'Level 1', 'A1-G'),
('loc-2', 'A2', 'Jakarta HQ Warehouse', 'Zone A (Mid level)', 'Rack A', 'Level 2', 'A2-M'),
('loc-3', 'A3', 'Jakarta HQ Warehouse', 'Zone A (High level)', 'Rack A', 'Level 3', 'A3-H'),
('loc-4', 'B1', 'Gudang Merak', 'Zone B (Heavy Machinery)', 'Rack B', 'Level 1', 'B1-H'),
('loc-5', 'C1', 'Gudang Surabaya', 'Zone C (Electrical)', 'Rack C', 'Level 1', 'C1-E');

`;

// SPARE PARTS (50 items)
sql += "-- SPARE PARTS (50 ITEMS)\n";
for (const sp of demoSpareParts) {
  sql += `INSERT IGNORE INTO \`spare_parts\` (\`id\`, \`sku\`, \`part_number\`, \`alternative_part_number\`, \`part_name\`, \`category\`, \`vendor_id\`, \`vessel_compatibility\`, \`unit\`, \`brand\`, \`maker\`, \`minimum_stock\`, \`maximum_stock\`, \`reorder_point\`, \`current_stock\`, \`reserved_stock\`, \`location_id\`, \`description\`) VALUES (${escapeSql(sp.id)}, ${escapeSql(sp.sku)}, ${escapeSql(sp.part_number)}, ${escapeSql(sp.alternative_part_number)}, ${escapeSql(sp.part_name)}, ${escapeSql(sp.category)}, ${escapeSql(sp.vendor_id)}, ${escapeJson(sp.vessel_compatibility)}, ${escapeSql(sp.unit)}, ${escapeSql(sp.brand)}, ${escapeSql(sp.maker)}, ${sp.minimum_stock || 2}, ${sp.maximum_stock || 20}, ${sp.reorder_point || 4}, ${sp.current_stock || 10}, ${sp.reserved_stock || 0}, ${escapeSql(sp.location_id)}, ${escapeSql(sp.description)});\n`;
}

// SPKs (30 items)
sql += "\n-- SPK WORK ORDERS (30 ITEMS)\n";
for (const spk of demoSPKs) {
  sql += `INSERT IGNORE INTO \`spk_work_orders\` (\`id\`, \`spk_number\`, \`target_port\`, \`status\`, \`remarks\`, \`vessels\`, \`created_by\`) VALUES (${escapeSql(spk.id)}, ${escapeSql(spk.spk_number)}, ${escapeSql(spk.target_port)}, ${escapeSql(spk.status)}, ${escapeSql(spk.remarks)}, ${escapeJson(spk.vessels)}, ${escapeSql(spk.created_by || "Superadmin")});\n`;
}

// TUG 5 (30 items)
sql += "\n-- MATERIAL REQUESTS TUG 5 (30 ITEMS)\n";
for (const mr of demoMaterialRequests) {
  sql += `INSERT IGNORE INTO \`material_requests\` (\`id\`, \`request_number\`, \`tug5_number\`, \`vessel_name\`, \`request_date\`, \`requester_name\`, \`warehouse_name\`, \`delivery_address\`, \`work_order_ref\`, \`account_code\`, \`function_code\`, \`urgency\`, \`department\`, \`remarks\`, \`status\`, \`items\`) VALUES (${escapeSql(mr.id)}, ${escapeSql(mr.request_number)}, ${escapeSql(mr.tug5_number)}, ${escapeSql(mr.vessel_name)}, ${escapeSql(mr.request_date)}, ${escapeSql(mr.requester_name || mr.requested_by)}, ${escapeSql(mr.warehouse_name || "Jakarta HQ Warehouse")}, ${escapeSql(mr.delivery_address)}, ${escapeSql(mr.work_order_ref || mr.spk_number)}, ${escapeSql(mr.account_code || "BPP")}, ${escapeSql(mr.function_code || "ARMADA")}, ${escapeSql(mr.urgency || "NORMAL")}, ${escapeSql(mr.department || "Engine Room")}, ${escapeSql(mr.remarks)}, ${escapeSql(mr.status)}, ${escapeJson(mr.items)});\n`;
}

// TUG 8 (30 items)
sql += "\n-- OUTBOUND DISPATCHES TUG 8 (30 ITEMS)\n";
for (const dsp of demoDispatches) {
  sql += `INSERT IGNORE INTO \`outbound_dispatches\` (\`id\`, \`dispatch_number\`, \`tug8_number\`, \`bon_pengeluaran_number\`, \`surat_jalan_number\`, \`manifest_number\`, \`spk_id\`, \`spk_number\`, \`vessel_name\`, \`destination_port\`, \`warehouse_origin\`, \`transporter_name\`, \`vehicle_number\`, \`driver_name\`, \`driver_phone\`, \`status\`, \`items\`, \`created_by\`) VALUES (${escapeSql(dsp.id)}, ${escapeSql(dsp.dispatch_number)}, ${escapeSql(dsp.tug8_number)}, ${escapeSql(dsp.bon_pengeluaran_number)}, ${escapeSql(dsp.surat_jalan_number)}, ${escapeSql(dsp.manifest_number)}, ${escapeSql(dsp.spk_id)}, ${escapeSql(dsp.spk_number)}, ${escapeSql(dsp.vessel_name)}, ${escapeSql(dsp.destination_port || "Tanjung Priok")}, ${escapeSql(dsp.warehouse_origin || "Jakarta HQ Warehouse")}, ${escapeSql(dsp.transporter_name)}, ${escapeSql(dsp.vehicle_number)}, ${escapeSql(dsp.driver_name)}, ${escapeSql(dsp.driver_phone)}, ${escapeSql(dsp.status)}, ${escapeJson(dsp.items)}, ${escapeSql(dsp.created_by || "Ahmad Subarjo")});\n`;
}

// RECEIVING (25 items)
sql += "\n-- INBOUND RECEIVINGS (25 ITEMS)\n";
for (const rec of demoReceiving) {
  sql += `INSERT IGNORE INTO \`inbound_receivings\` (\`id\`, \`purchase_order_num\`, \`delivery_note_num\`, \`vendor_id\`, \`vendor_name\`, \`received_date\`, \`status\`, \`return_note_num\`, \`reject_reason\`, \`items\`, \`created_by\`) VALUES (${escapeSql(rec.id)}, ${escapeSql(rec.purchase_order_num)}, ${escapeSql(rec.delivery_note_num)}, ${escapeSql(rec.vendor_id)}, ${escapeSql(rec.vendor_name)}, ${escapeSql(rec.received_date)}, ${escapeSql(rec.status)}, ${escapeSql(rec.return_note_num)}, ${escapeSql(rec.reject_reason)}, ${escapeJson(rec.items)}, ${escapeSql(rec.received_by || "Ahmad Subarjo")});\n`;
}

// TUG 10 (25 items)
sql += "\n-- MATERIAL RETURNS TUG 10 (25 ITEMS)\n";
for (const ret of demoMaterialReturns) {
  sql += `INSERT IGNORE INTO \`material_returns\` (\`id\`, \`return_number\`, \`vessel_name\`, \`spk_id\`, \`spk_number\`, \`return_date\`, \`account_code\`, \`function_code\`, \`status\`, \`items\`, \`created_by\`) VALUES (${escapeSql(ret.id)}, ${escapeSql(ret.return_number)}, ${escapeSql(ret.vessel_name)}, ${escapeSql(ret.spk_id)}, ${escapeSql(ret.spk_number)}, ${escapeSql(ret.return_date)}, ${escapeSql(ret.account_code || "BPP")}, ${escapeSql(ret.function_code || "ARMADA")}, ${escapeSql(ret.status)}, ${escapeJson(ret.items)}, ${escapeSql(ret.created_by || "Chief Engineer")});\n`;
}

fs.writeFileSync("./mysql-seed-data.sql", sql, "utf-8");
console.log("✅ Successfully generated standalone mysql-seed-data.sql with all 190+ records!");
