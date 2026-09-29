import pandas as pd
import json
import re
from datetime import datetime, timedelta

def main():
    excel_path = 'data/det_spk_september 2026.xlsx'
    print(f"Loading {excel_path}...")
    df = pd.read_excel(excel_path)
    print(f"Total rows: {len(df)}")
    
    # 1. Read existing demoSeedData.ts
    seed_path = 'src/demoSeedData.ts'
    with open(seed_path, 'r', encoding='utf-8') as f:
        content = f.read()

    idx_tug5 = content.find('export const demoMaterialRequests: MaterialRequest[] = [')
    idx_tug6 = content.find('export const demoMaterialRequestsTUG6: MaterialRequest[] = [')
    
    if idx_tug5 == -1 or idx_tug6 == -1:
        raise ValueError("Could not find demoMaterialRequests marker in src/demoSeedData.ts")

    # Extract existing TUG 5 records
    prefix = 'export const demoMaterialRequests: MaterialRequest[] = '
    json_existing_str = content[idx_tug5 + len(prefix):idx_tug6].strip().rstrip(';')
    existing_tug5 = json.loads(json_existing_str)
    print(f"Existing TUG 5 records: {len(existing_tug5)}")

    # Filter out any existing september records if re-running
    base_tug5 = [mr for mr in existing_tug5 if not mr.get('id', '').startswith('mr-september-')]
    print(f"Base TUG 5 records (July & August): {len(base_tug5)}")

    # Helper date conversion
    def get_september_date(val):
        if pd.isna(val):
            return "2026-09-15"
        try:
            val_int = int(val)
            d = datetime(1899, 12, 30) + timedelta(days=val_int)
            day = max(1, min(30, d.day))
            return f"2026-09-{day:02d}"
        except Exception:
            return "2026-09-15"

    # Helper vessel cleaner
    def get_vessel_name(grp, spk_no):
        v = grp['nama_kapal'].dropna()
        if len(v) > 0 and str(v.iloc[0]).strip() and str(v.iloc[0]).lower() not in ['nan', 'none']:
            return str(v.iloc[0]).strip()
        if '(2206)' in spk_no:
            return 'Srikandi Baruna 2206'
        if '(2207)' in spk_no:
            return 'Srikandi Baruna 2207'
        return 'Kartini Baruna'

    # 2. Build September MaterialRequests
    september_mrs = []
    spk_idx = 0
    total_items = 0

    for no_spk, group in df.groupby('no_spk', sort=False):
        spk_idx += 1
        seq_num = 113 + spk_idx
        vessel = get_vessel_name(group, str(no_spk))
        req_date = get_september_date(group['tgl_diterima'].iloc[0])
        
        # Build items
        mr_items = []
        item_idx = 0
        for _, row in group.reset_index(drop=True).iterrows():
            item_idx += 1
            uraian = str(row['uraian_spk']).strip() if pd.notna(row['uraian_spk']) else 'Suku Cadang Perbaikan'
            uraian = re.sub(r'\s+', ' ', uraian)
            
            pno = str(row['part_no']).strip() if pd.notna(row['part_no']) else '-'
            if pno.lower() in ['nan', 'none', '', '--']:
                pno = '-'
                
            try:
                qty = float(row['jumlah']) if pd.notna(row['jumlah']) else 1.0
                if qty <= 0:
                    qty = 1.0
                if qty.is_integer():
                    qty = int(qty)
            except Exception:
                qty = 1

            satuan = str(row['satuan']).strip() if pd.notna(row['satuan']) else 'pcs'
            if satuan.lower() in ['nan', 'none', '']:
                satuan = 'pcs'

            mr_items.append({
                "spare_part_id": f"sp-september-{spk_idx}-{item_idx}",
                "spare_part_name": uraian,
                "part_number": pno,
                "unit": satuan,
                "avg_monthly_usage": 1,
                "remaining_stock": 10,
                "requested_qty": qty,
                "notes": f"Permintaan SPK {no_spk}",
                "item_status": "Pending"
            })
            total_items += 1

        first_uraian = mr_items[0]["spare_part_name"][:50]
        remarks = f"Permintaan Material Umum TUG 5 untuk SPK {no_spk} - {first_uraian}"

        # MaterialRequest Object
        mr_obj = {
            "id": f"mr-september-{spk_idx}",
            "request_number": f"MR-2026-{seq_num:06d}",
            "tug5_number": f"TUG5-2026-{seq_num}",
            "tug6_number": f"TUG6-2026-{seq_num}",
            "vessel_name": vessel,
            "request_date": req_date,
            "requester_name": f"Chief Engineer {vessel}",
            "warehouse_name": "Gudang Merak",
            "delivery_address": f"Pelabuhan Merak, Cilegon, Banten, SPK {no_spk}",
            "work_order_ref": str(no_spk),
            "spk_number": str(no_spk),
            "spk_id": f"spk-september-{spk_idx}",
            "account_code": "BPP",
            "function_code": "ARMADA",
            "urgency": "NORMAL",
            "department": "Engine Room",
            "remarks": remarks,
            "status": "Submitted",
            "alfin_signed": False,
            "emir_signed": False,
            "sumbono_signed": False,
            "aldi_signed": False,
            "items": mr_items
        }
        september_mrs.append(mr_obj)

    print(f"Generated {len(september_mrs)} September TUG 5 requests with {total_items} items.")
    
    # 3. Combine base (July + August) + September
    combined_tug5 = base_tug5 + september_mrs
    print(f"Combined total TUG 5 requests: {len(combined_tug5)}")

    # 4. Write back into src/demoSeedData.ts
    json_tug5_str = json.dumps(combined_tug5, indent=2, ensure_ascii=False)
    
    new_content = (
        content[:idx_tug5] +
        prefix +
        json_tug5_str +
        ';\n\n' +
        content[idx_tug6:]
    )

    with open(seed_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Successfully updated {seed_path}!")

if __name__ == '__main__':
    main()
