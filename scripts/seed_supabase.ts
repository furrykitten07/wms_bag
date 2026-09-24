/**
 * Script to seed initial TUG 5, TUG 6, TUG 10, SPK, and Spare Parts to Supabase
 */
import { createClient } from "@supabase/supabase-js";
import { 
  demoMaterialRequests, 
  demoMaterialRequestsTUG6, 
  demoMaterialReturns, 
  demoSpareParts,
  demoSPKs
} from "../src/demoSeedData.js";

const SUPABASE_URL = "https://dribyqyzaacwwwlmyzpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJ5cXl6YWFjd3d3bG15enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzMwNzUsImV4cCI6MjEwNTgwOTA3NX0.V2j_cWhUM9Aq-CEDY1xb8EBsikByY-TmN-k-eHioVgo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log("🚀 Starting Supabase Database Seeding...");

  // 1. Seed Material Requests (TUG 5 & TUG 6)
  console.log(`📦 Seeding ${demoMaterialRequests.length} TUG 5 & TUG 6 requests...`);
  
  // Combine unique requests by request_number
  const reqNumSet = new Set();
  const mrRows = [];
  for (const r of demoMaterialRequests) {
    let reqNum = r.request_number;
    if (reqNumSet.has(reqNum)) {
      reqNum = `${r.request_number}-${r.id.slice(-4)}`;
    }
    reqNumSet.add(reqNum);

    mrRows.push({
      id: r.id,
      request_number: reqNum,
      tug5_number: r.tug5_number || reqNum,
      tug6_number: r.tug6_number || null,
      vessel_name: r.vessel_name || "MV. KARTINI BARUNA",
      warehouse_name: r.warehouse_name || "Gudang Merak",
      request_date: r.request_date ? new Date(r.request_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      requester_name: r.requester_name || "Chief Engineer",
      work_order_ref: r.work_order_ref || null,
      account_code: r.account_code || "BPP",
      function_code: r.function_code || "ARMADA",
      delivery_address: r.delivery_address || "Pelabuhan Merak Mas, Cilegon, Banten",
      status: r.status || "Submitted",
      items: r.items || [],
      remarks: r.remarks || null,
      aldi_signed: r.aldi_signed || false,
      aldi_signed_at: r.aldi_signed_at || null,
      aldi_signature_url: r.aldi_signature_url || null,
      alfin_signed: r.alfin_signed || false,
      alfin_signed_at: r.alfin_signed_at || null,
      alfin_signature_url: r.alfin_signature_url || null,
      emir_signed: r.emir_signed || false,
      emir_signed_at: r.emir_signed_at || null,
      emir_signature_url: r.emir_signature_url || null,
      sumbono_signed: r.sumbono_signed || false,
      sumbono_signed_at: r.sumbono_signed_at || null,
      sumbono_signature_url: r.sumbono_signature_url || null,
    });
  }

  const batchSize = 50;
  for (let i = 0; i < mrRows.length; i += batchSize) {
    const chunk = mrRows.slice(i, i + batchSize);
    const { error } = await supabase.from("material_requests").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Error inserting material_requests chunk ${i}:`, error.message);
    } else {
      console.log(`✓ Inserted material_requests ${i + 1} - ${Math.min(i + batchSize, mrRows.length)}`);
    }
  }

  // 2. Seed Material Returns (TUG 10)
  console.log(`🔄 Seeding ${demoMaterialReturns.length} TUG 10 returns...`);
  const retRows = demoMaterialReturns.map(r => ({
    id: r.id,
    return_number: r.return_number,
    vessel_name: r.vessel_name || "MV. KARTINI BARUNA",
    warehouse_name: r.warehouse_name || "Gudang Merak",
    return_date: r.return_date ? new Date(r.return_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    return_reason: r.return_reason || "Broken",
    spk_number: r.spk_number || null,
    dispatch_reference: r.dispatch_reference || null,
    created_by: r.created_by || "Chief Engineer",
    status: r.status || "Submitted",
    items: r.items || [],
    notes: r.notes || null,
    aldi_signed: r.aldi_signed || false,
    aldi_signed_at: r.aldi_signed_at || null,
    aldi_signature_url: r.aldi_signature_url || null,
    alfin_signed: r.alfin_signed || false,
    alfin_signed_at: r.alfin_signed_at || null,
    alfin_signature_url: r.alfin_signature_url || null,
    emir_signed: r.emir_signed || false,
    emir_signed_at: r.emir_signed_at || null,
    emir_signature_url: r.emir_signature_url || null,
    sumbono_signed: r.sumbono_signed || false,
    sumbono_signed_at: r.sumbono_signed_at || null,
    sumbono_signature_url: r.sumbono_signature_url || null,
  }));

  for (let i = 0; i < retRows.length; i += batchSize) {
    const chunk = retRows.slice(i, i + batchSize);
    const { error } = await supabase.from("material_returns").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Error inserting material_returns chunk ${i}:`, error.message);
    } else {
      console.log(`✓ Inserted material_returns ${i + 1} - ${Math.min(i + batchSize, retRows.length)}`);
    }
  }

  // 3. Seed SPK Work Orders
  console.log(`📋 Seeding ${demoSPKs.length} SPK Work Orders...`);
  const spkRows = demoSPKs.map(s => ({
    id: s.id,
    spk_number: s.spk_number,
    vessel_name: s.vessel_name || "MV. KARTINI BARUNA",
    description: s.description || "Perawatan & Perbaikan Suku Cadang Kapal",
    assigned_to: s.assigned_to || "Tim Teknis",
    target_port: s.target_port || "Merak",
    date_created: s.date_created ? new Date(s.date_created).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    status: s.status || "Open",
    items: s.items || []
  }));

  for (let i = 0; i < spkRows.length; i += batchSize) {
    const chunk = spkRows.slice(i, i + batchSize);
    const { error } = await supabase.from("spk_work_orders").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Error inserting spk chunk ${i}:`, error.message);
    } else {
      console.log(`✓ Inserted spk_work_orders ${i + 1} - ${Math.min(i + batchSize, spkRows.length)}`);
    }
  }

  // 4. Verify Final Counts in Supabase
  const { count: mrCount } = await supabase.from("material_requests").select("*", { count: "exact", head: true });
  const { count: retCount } = await supabase.from("material_returns").select("*", { count: "exact", head: true });
  const { count: spkCount } = await supabase.from("spk_work_orders").select("*", { count: "exact", head: true });

  console.log("\n🎉 Seeding Completed Successfully!");
  console.log(`- material_requests (TUG 5 & 6) in Supabase: ${mrCount} rows`);
  console.log(`- material_returns (TUG 10) in Supabase: ${retCount} rows`);
  console.log(`- spk_work_orders in Supabase: ${spkCount} rows`);
}

seed().catch(console.error);
