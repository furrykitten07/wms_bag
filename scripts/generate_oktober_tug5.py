import openpyxl
import csv
import io
import json
import re
import pandas as pd
from datetime import datetime

def clean_str(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ["nan", "none", "null", "undefined"]:
        return ""
    return re.sub(r'\s+', ' ', s)

def main():
    excel_path = 'data/det_spk (oktober).xlsx'
    print(f"Loading {excel_path} with openpyxl...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb.active

    # 1. Load Daftarkapal mapping
    df_k = pd.read_csv('data/clean_daftarkapal.csv')
    kapal_map = {}
    for idx, r in df_k.iterrows():
        no_val = str(r['No']).strip()
        k_real = str(r['kapal_real']).strip()
        kapal_map[no_val] = k_real

    # 2. Extract and reconstruct lines
    raw_lines = []
    for r in range(2, ws.max_row + 1):
        vals = [str(ws.cell(r, c).value) for c in range(1, 27) if ws.cell(r, c).value is not None]
        if vals:
            raw_lines.append((r, ','.join(vals)))

    reconstructed = []
    buffer = ""
    start_row = 0

    for r, line in raw_lines:
        if not buffer:
            start_row = r
            buffer = line
        else:
            buffer += "\n" + line
        
        q_count = buffer.count('"')
        if q_count % 2 == 0:
            reconstructed.append((start_row, buffer))
            buffer = ""

    parsed_rows = []
    for start_r, line in reconstructed:
        try:
            reader = csv.reader(io.StringIO(line), delimiter=';')
            row = next(reader)
            if len(row) >= 7:
                parsed_rows.append((start_r, row))
        except Exception as e:
            print(f"Error at {start_r}: {e}")

    print(f"Total parsed rows from Excel: {len(parsed_rows)}")

    # 3. Filter candidate rows for October 2026:
    # - New rows since August dump (start_r >= 34947)
    # - Or rows with explicit 10/2026 date
    oct_candidates = []
    for start_r, row in parsed_rows:
        is_new = (start_r >= 34947)
        is_oct_date = False
        for c_idx in [8, 12, 15, 18]:
            if len(row) > c_idx:
                d = row[c_idx].strip()
                if d.startswith('10/') and d.endswith('/2026'):
                    is_oct_date = True
                    break
        if is_new or is_oct_date:
            oct_candidates.append((start_r, row))

    print(f"Total October candidate rows: {len(oct_candidates)}")

    # 4. Group candidate rows by SPK
    by_spk = {}
    for start_r, row in oct_candidates:
        spk = row[1].strip()
        if not spk:
            continue
        if spk not in by_spk:
            by_spk[spk] = []
        by_spk[spk].append((start_r, row))

    print(f"Total distinct SPKs for October: {len(by_spk)}")

    # Helper vessel name resolver
    def resolve_vessel_name(spk_num, items):
        k_id = ""
        for r, row in items:
            if len(row) > 2 and row[2].strip():
                k_id = row[2].strip()
                break
        
        if k_id in kapal_map:
            return kapal_map[k_id]
        
        spk_str = str(spk_num)
        if '(2201)' in spk_str or '2201' in spk_str:
            return 'Srikandi Baruna 2201'
        if '(2202)' in spk_str or '2202' in spk_str:
            return 'Srikandi Baruna 2202'
        if '(2206)' in spk_str or '2206' in spk_str:
            return 'Srikandi Baruna 2206'
        if '(2207)' in spk_str or '2207' in spk_str:
            return 'Srikandi Baruna 2207'
        if '(2001)' in spk_str or '2001' in spk_str:
            return 'Srikandi Baruna 2001'
        if '(2002)' in spk_str or '2002' in spk_str:
            return 'Srikandi Baruna 2002'
        if '(2003)' in spk_str or '2003' in spk_str:
            return 'Srikandi Baruna 2003'
        if '(2004)' in spk_str or '2004' in spk_str:
            return 'Srikandi Baruna 2004'
        if '(3001)' in spk_str or '3001' in spk_str:
            return 'Baruna Power 3001'
        if '(3004)' in spk_str or '3004' in spk_str:
            return 'Baruna Power 3004'
        if '(3005)' in spk_str or '3005' in spk_str:
            return 'Baruna Power 3005'
        if '(3301)' in spk_str or '3301' in spk_str:
            return 'Baruna Power 3301'
        if '(3302)' in spk_str or '3302' in spk_str:
            return 'Baruna Power 3302'
        
        return 'Kartini Baruna'

    # Helper date resolver
    def resolve_october_date(spk_idx, items):
        # 1. Search for explicit 10/D/2026
        for r, row in items:
            for c_idx in [8, 18, 15, 12]:
                if len(row) > c_idx:
                    d = row[c_idx].strip()
                    if d.startswith('10/') and d.endswith('/2026'):
                        parts = d.split('/')
                        try:
                            day = max(1, min(31, int(parts[1])))
                            return f"2026-10-{day:02d}"
                        except:
                            pass
        
        # 2. Search for any valid date to preserve the day of month
        for r, row in items:
            for c_idx in [8, 18, 15, 12]:
                if len(row) > c_idx:
                    d = row[c_idx].strip()
                    if '/' in d:
                        parts = d.split('/')
                        if len(parts) == 3:
                            try:
                                day = max(1, min(31, int(parts[1])))
                                return f"2026-10-{day:02d}"
                            except:
                                pass
        
        # 3. Default distribution across October 2026 (1..28)
        day = 1 + (spk_idx % 28)
        return f"2026-10-{day:02d}"

    # 5. Build MaterialRequests
    october_mrs = []
    spk_idx = 0
    total_items = 0

    for no_spk, group_items in by_spk.items():
        spk_idx += 1
        seq_num = 500 + spk_idx
        vessel = resolve_vessel_name(no_spk, group_items)
        req_date = resolve_october_date(spk_idx, group_items)

        mr_items = []
        item_idx = 0
        for start_r, row in group_items:
            item_idx += 1
            uraian = clean_str(row[3]) if len(row) > 3 else "Suku Cadang Perbaikan"
            if not uraian:
                uraian = "Suku Cadang Perbaikan"
            
            pno = clean_str(row[4]) if len(row) > 4 else "-"
            if not pno or pno.lower() in ["nan", "none", "", "--", "-"]:
                pno = "-"

            # qty
            try:
                qty_raw = row[5] if len(row) > 5 else "1"
                qty = float(qty_raw.replace(',', '.')) if qty_raw else 1.0
                if qty <= 0:
                    qty = 1.0
                if qty.is_integer():
                    qty = int(qty)
            except:
                qty = 1

            satuan = clean_str(row[6]) if len(row) > 6 else "pcs"
            if not satuan:
                satuan = "pcs"

            # unit price
            price = 0
            if len(row) > 7 and row[7]:
                try:
                    price = float(row[7].replace(',', '.'))
                except:
                    price = 0

            mr_items.append({
                "spare_part_id": f"sp-oktober-{spk_idx}-{item_idx}",
                "spare_part_name": uraian,
                "part_number": pno,
                "unit": satuan,
                "avg_monthly_usage": 1,
                "remaining_stock": 10,
                "requested_qty": qty,
                "unit_price": price,
                "notes": f"Permintaan SPK {no_spk}",
                "item_status": "Pending"
            })
            total_items += 1

        first_uraian = mr_items[0]["spare_part_name"][:50]
        remarks = f"Permintaan Material Umum TUG 5 untuk SPK {no_spk} - {first_uraian}"

        mr_obj = {
            "id": f"mr-oktober-{spk_idx}",
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
            "spk_id": f"spk-oktober-{spk_idx}",
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
            "items": mr_items,
            "created_at": f"{req_date}T08:30:00.000Z",
            "updated_at": f"{req_date}T09:00:00.000Z"
        }
        october_mrs.append(mr_obj)

    print(f"Generated {len(october_mrs)} October TUG 5 requests with {total_items} items.")

    # Save to scratch/october_tug5_generated.json
    with open('scratch/october_tug5_generated.json', 'w', encoding='utf-8') as f:
        json.dump(october_mrs, f, indent=2, ensure_ascii=False)
    print("Saved to scratch/october_tug5_generated.json.")

    # 6. Read existing demoSeedData.ts and update demoMaterialRequests
    seed_path = 'src/demoSeedData.ts'
    print(f"Updating {seed_path}...")
    with open(seed_path, 'r', encoding='utf-8') as f:
        content = f.read()

    idx_tug5 = content.find('export const demoMaterialRequests: MaterialRequest[] = [')
    idx_tug6 = content.find('export const demoMaterialRequestsTUG6: MaterialRequest[] = [')
    
    if idx_tug5 == -1 or idx_tug6 == -1:
        raise ValueError("Could not find demoMaterialRequests marker in src/demoSeedData.ts")

    prefix = 'export const demoMaterialRequests: MaterialRequest[] = '
    json_existing_str = content[idx_tug5 + len(prefix):idx_tug6].strip().rstrip(';')
    existing_tug5 = json.loads(json_existing_str)
    print(f"Existing TUG 5 records in demoSeedData: {len(existing_tug5)}")

    base_tug5 = [mr for mr in existing_tug5 if not mr.get('id', '').startswith('mr-oktober-')]
    print(f"Base TUG 5 records (excluding any previous october): {len(base_tug5)}")

    combined_tug5 = base_tug5 + october_mrs
    print(f"Combined total TUG 5 requests in demoSeedData: {len(combined_tug5)}")

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
