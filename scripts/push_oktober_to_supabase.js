import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = "https://dribyqyzaacwwwlmyzpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJ5cXl6YWFjd3d3bG15enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzMwNzUsImV4cCI6MjEwNTgwOTA3NX0.V2j_cWhUM9Aq-CEDY1xb8EBsikByY-TmN-k-eHioVgo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VALID_MR_COLUMNS = new Set([
  "id", "request_number", "tug5_number", "tug6_number",
  "vessel_name", "warehouse_name", "request_date", "requester_name",
  "work_order_ref", "account_code", "function_code", "delivery_address",
  "status", "items", "remarks",
  "aldi_signed", "aldi_signed_at", "aldi_signature_url",
  "alfin_signed", "alfin_signed_at", "alfin_signature_url",
  "emir_signed", "emir_signed_at", "emir_signature_url",
  "sumbono_signed", "sumbono_signed_at", "sumbono_signature_url",
  "created_at", "updated_at"
]);

function sanitize(record) {
  const clean = {};
  for (const [k, v] of Object.entries(record)) {
    if (VALID_MR_COLUMNS.has(k)) {
      clean[k] = v;
    }
  }
  return clean;
}

async function run() {
  console.log("Loading scratch/october_tug5_generated.json...");
  const rawData = JSON.parse(fs.readFileSync("scratch/october_tug5_generated.json", "utf-8"));
  console.log(`Loaded ${rawData.length} October TUG 5 requests.`);

  const sanitizedRows = rawData.map(sanitize);

  const { count: initialCount } = await supabase
    .from("material_requests")
    .select("*", { count: "exact", head: true });
  console.log(`Initial Supabase material_requests count: ${initialCount}`);

  const batchSize = 25;
  let successCount = 0;
  for (let i = 0; i < sanitizedRows.length; i += batchSize) {
    const chunk = sanitizedRows.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("material_requests")
      .upsert(chunk, { onConflict: "id" });

    if (error) {
      console.error(`Error upserting chunk ${i + 1} - ${i + chunk.length}:`, error.message);
      throw error;
    } else {
      successCount += chunk.length;
      console.log(`✓ Successfully upserted ${i + 1} - ${i + chunk.length} (${successCount}/${sanitizedRows.length})`);
    }
  }

  const { count: finalCount } = await supabase
    .from("material_requests")
    .select("*", { count: "exact", head: true });
  console.log(`Final Supabase material_requests count: ${finalCount}`);
  console.log("🎉 Seeding October TUG 5 to Supabase completed successfully!");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
