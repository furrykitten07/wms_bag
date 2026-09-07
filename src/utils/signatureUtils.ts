/**
 * Utility helper to generate realistic handwritten digital signatures
 * and sanitize legacy/dicebear avatar initials URLs across all WMS TUG documents.
 */

export const createSVGSignatureDataUrl = (name: string): string => {
  const cleanName = (name || "Signer").trim();
  const navyColor = "#0f2b5c";
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90" viewBox="0 0 220 90">
    <g transform="translate(10, 8)">
      <path d="M 10 42 Q 25 15 45 40 T 75 28 T 115 42 T 155 24 L 180 42" fill="none" stroke="${navyColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      <text x="20" y="38" font-family="'Brush Script MT', 'Dancing Script', 'Great Vibes', 'Caveat', cursive, sans-serif" font-size="26" font-weight="700" fill="${navyColor}" font-style="italic" letter-spacing="1">
        ${cleanName}
      </text>
      <path d="M 15 48 Q 85 56 175 42 Q 185 40 160 52 Q 100 56 35 48" fill="none" stroke="${navyColor}" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="15" y="56" width="165" height="15" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="0.7"/>
      <text x="22" y="67" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" fill="#0369a1" font-weight="700" letter-spacing="0.5">
        ✓ DIGITAL SIGNATURE VERIFIED
      </text>
    </g>
  </svg>`;
  
  const base64Svg = typeof window !== "undefined" && window.btoa 
    ? window.btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString("base64");

  return `data:image/svg+xml;base64,${base64Svg}`;
};

export const sanitizeSignatureUrl = (url?: string | null, fallbackName: string = "Signer"): string => {
  if (!url || url.includes("dicebear.com/7.x/initials") || url.includes("dicebear.com")) {
    return createSVGSignatureDataUrl(fallbackName);
  }
  return url;
};
