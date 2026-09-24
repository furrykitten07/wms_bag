/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read from Vite environment variables or process.env safely
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) || "";
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes("your-project-ref") && 
  !supabaseAnonKey.includes("your-anon-key")
);

// Fallback dummy client if credentials are not configured yet
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createClient("https://placeholder-project.supabase.co", "placeholder-anon-key") as SupabaseClient);

/**
 * Helper to upload signature to Supabase Storage
 */
export async function uploadSignatureToStorage(
  fileName: string,
  svgOrBase64Data: string
): Promise<string | null> {
  if (!isSupabaseConfigured) {
    // If Supabase is not configured, return data URL directly
    return svgOrBase64Data;
  }

  try {
    let blob: Blob;
    let contentType = "image/svg+xml";

    if (svgOrBase64Data.startsWith("data:image/svg+xml")) {
      const svgText = decodeURIComponent(svgOrBase64Data.split(",")[1]);
      blob = new Blob([svgText], { type: "image/svg+xml" });
    } else if (svgOrBase64Data.startsWith("data:image/png;base64,")) {
      const base64 = svgOrBase64Data.split(",")[1];
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: "image/png" });
      contentType = "image/png";
    } else {
      blob = new Blob([svgOrBase64Data], { type: "image/svg+xml" });
    }

    const cleanName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = `signatures/${Date.now()}_${cleanName}.${contentType.includes("png") ? "png" : "svg"}`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filePath, blob, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.warn("Storage upload failed, fallback to direct data URL:", uploadError);
      return svgOrBase64Data;
    }

    const { data } = supabase.storage
      .from("signatures")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.warn("Error uploading signature to Supabase Storage:", err);
    return svgOrBase64Data;
  }
}
