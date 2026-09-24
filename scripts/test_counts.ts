import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dribyqyzaacwwwlmyzpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJ5cXl6YWFjd3d3bG15enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzMwNzUsImV4cCI6MjEwNTgwOTA3NX0.V2j_cWhUM9Aq-CEDY1xb8EBsikByY-TmN-k-eHioVgo";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data: mr, error: mrErr } = await supabase.from("material_requests").select("*").order("created_at", { ascending: false });
  console.log("MR query:", mr ? mr.length : 0, "error:", mrErr);
  if (mr && mr.length > 0) {
    console.log("MR[0] created_at:", mr[0].created_at, "items count:", mr[0].items?.length, "tug5:", mr[0].tug5_number, "tug6:", mr[0].tug6_number);
  }

  const { data: ret, error: retErr } = await supabase.from("material_returns").select("*").order("created_at", { ascending: false });
  console.log("RET query:", ret ? ret.length : 0, "error:", retErr);
}
test();
