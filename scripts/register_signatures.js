async function main() {
  const addSig = (data) => fetch('http://localhost:3000/api/signatures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());

  const sigKG = await addSig({
    role_title: 'Kepala Gudang',
    user_name: 'MAGHFUR MUHAMMAD ALFIN',
    signature_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 42 C 35 15, 50 58, 80 25 C 100 12, 120 52, 150 30 C 170 20, 185 45, 205 35" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 30 50 L 180 46" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="45" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">Maghfur M. Alfin</text></svg>`,
    notes: 'Tanda Tangan Kepala Gudang'
  });

  await new Promise(r => setTimeout(r, 100));

  const sigPG = await addSig({
    role_title: 'Petugas Gudang',
    user_name: 'Aldi Hidayat',
    signature_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 20 42 C 45 15, 60 55, 90 28 C 110 15, 130 52, 160 32 C 180 22, 190 48, 200 40" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 35 52 L 185 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="75" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">Aldi Hidayat</text></svg>`,
    notes: 'Tanda Tangan Petugas Gudang'
  });

  console.log('Successfully registered:', sigKG, sigPG);
}

main().catch(console.error);
