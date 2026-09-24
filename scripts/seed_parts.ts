import { createClient } from "@supabase/supabase-js";
import { demoSpareParts } from "../src/demoSeedData.js";

const SUPABASE_URL = "https://dribyqyzaacwwwlmyzpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJ5cXl6YWFjd3d3bG15enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzMwNzUsImV4cCI6MjEwNTgwOTA3NX0.V2j_cWhUM9Aq-CEDY1xb8EBsikByY-TmN-k-eHioVgo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedParts() {
  console.log(`🔧 Seeding ${demoSpareParts.length} Spare Parts to Supabase...`);
  const rows = demoSpareParts.map(p => ({
    id: p.id,
    sku: p.sku || `SKU-${p.id}`,
    part_number: p.part_number || "-",
    alternative_part_number: p.alternative_part_number || null,
    part_name: p.part_name,
    maker: p.maker || "BAg Marine",
    unit: p.unit || "PCS",
    category: p.category || "General",
    current_stock: p.current_stock || 0,
    reorder_point: p.reorder_point || 5,
    location_id: null,
    remarks: p.description || null
  }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("spare_parts").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Error chunk ${i}:`, error.message);
    }
  }

  const { count } = await supabase.from("spare_parts").select("*", { count: "exact", head: true });
  console.log(`✓ Total spare_parts in Supabase: ${count} rows!`);
}

seedParts().catch(console.error);
