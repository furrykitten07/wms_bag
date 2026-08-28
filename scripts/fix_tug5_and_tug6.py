import pandas as pd
import openpyxl
import json
import re
import os

print("=== FIXING TUG 5 (104 REQUESTS) AND TUG 6 (CRITICAL REQUESTS) ===")

# 1. Read CRITICAL sheet from FIKRI.xlsx
wb = openpyxl.load_workbook('data/FIKRI.xlsx', data_only=True)
ws = wb['CRITICAL']

crit_items = []
for row in list(ws.iter_rows(values_only=True))[3:]:
    if row and len(row) >= 4 and row[1] is not None:
        p_name = str(row[2]).strip() if row[2] else ''
        p_no = str(row[3]).strip() if row[3] else ''
        crit_items.append({'no': row[1], 'part_name': p_name, 'part_no': p_no})

print(f"Loaded {len(crit_items)} critical items from Excel sheet CRITICAL.")

# 2. Load data/spk_juli_2026.csv (the 104 SPKs)
df_juli = pd.read_csv('data/spk_juli_2026.csv')

tug5_requests = []
spk_index = 0

for no_spk, group in df_juli.groupby('no_spk', sort=False):
    spk_index += 1
    date_spk = str(group['date_spk'].iloc[0]).strip() if 'date_spk' in group.columns and pd.notna(group['date_spk'].iloc[0]) else '2026-07-01'
    vessel = str(group['nama_kapal'].iloc[0]).strip() if pd.notna(group['nama_kapal'].iloc[0]) else 'Kartini Baruna'
    if vessel.lower() in ['nan', 'none', '']:
        vessel = 'Kartini Baruna'
        
    req_name = f"Chief Engineer {vessel}"
    req_seq = str(spk_index).zfill(6)
    req_num = f"MR-2026-{req_seq}"
    tug5_num = f"TUG5-2026-{req_seq[-3:]}"
    
    mr_items = []
    for idx, row in group.reset_index(drop=True).iterrows():
        uraian = str(row['uraian_spk']).strip() if pd.notna(row['uraian_spk']) else 'Suku Cadang'
        part_no = str(row['part_no']).strip() if pd.notna(row['part_no']) and str(row['part_no']).strip() not in ['--', 'nan'] else '-'
        try:
            qty = float(row['jumlah']) if pd.notna(row['jumlah']) else 1.0
            if qty.is_integer():
                qty = int(qty)
        except:
            qty = 1
        unit = str(row['satuan']).strip() if pd.notna(row['satuan']) else 'pcs'
        
        sp_id = f'sp-juli-{spk_index}-{idx+1}'
        
        mr_items.append({
            'spare_part_id': sp_id,
            'spare_part_name': uraian,
            'part_number': part_no,
            'unit': unit,
            'avg_monthly_usage': 1,
            'remaining_stock': 10,
            'requested_qty': qty,
            'notes': f'Permintaan SPK {no_spk}',
            'item_status': 'Arrived'
        })
        
    tug5_req = {
        'id': f'mr-juli-{spk_index}',
        'request_number': req_num,
        'request_date': date_spk,
        'requester_name': req_name,
        'vessel_name': vessel,
        'warehouse_name': 'Gudang Merak',
        'delivery_address': f'Pelabuhan Merak, Cilegon, Banten, SPK {no_spk}',
        'work_order_ref': no_spk,
        'account_code': 'BPP',
        'function_code': 'ARMADA',
        'remarks': f'Permintaan Material Umum TUG 5 untuk SPK {no_spk}',
        'status': 'Approved',
        'items': mr_items,
        'created_at': f'{date_spk}T08:30:00.000Z',
        'updated_at': f'{date_spk}T09:00:00.000Z',
        'tug5_number': tug5_num,
        'tug_type': 'TUG5',
        'spk_number': no_spk,
        'spk_id': f'spk-juli-{spk_index}',
        'tug_number': tug5_num,
        'destination_port': 'Pelabuhan Merak, Cilegon, Banten',
        'warehouse': 'Gudang Merak',
        'created_by': 'Staff Admin Logistik'
    }
    
    tug5_requests.append(tug5_req)

print(f"Generated {len(tug5_requests)} TUG 5 requests.")

# 3. Filter TUG 6 requests strictly matching the 26 items in CRITICAL sheet
tug6_requests = []

for req in tug5_requests:
    matched_items = []
    for item in req.get('items', []):
        sn = str(item.get('spare_part_name', '')).strip().upper()
        pn = str(item.get('part_number', '')).strip().upper()
        
        is_match = False
        for c in crit_items:
            c_no = c['part_no'].upper()
            c_name = c['part_name'].upper()
            
            match_pn = (c_no != '-' and c_no != '' and (pn == c_no or (len(c_no) > 3 and c_no in pn)))
            match_sn = (c_name != '' and (sn == c_name or (len(c_name) > 3 and c_name in sn)))
            
            if match_pn or match_sn:
                is_match = True
                break
                
        if is_match:
            matched_items.append(item)
            
    if len(matched_items) > 0:
        req_seq_t6 = len(tug6_requests) + 1
        seq_str_t6 = str(req_seq_t6).zfill(6)
        
        new_t6_req = dict(req)
        new_t6_req['id'] = f"mr6-tug6-{req_seq_t6}"
        new_t6_req['request_number'] = f"MR6-2026-{seq_str_t6}"
        new_t6_req['tug_type'] = "TUG6"
        new_t6_req['tug6_number'] = f"TUG6-2026-{seq_str_t6[-3:]}"
        new_t6_req['items'] = matched_items
        
        tug6_requests.append(new_t6_req)

print(f"Generated {len(tug6_requests)} TUG 6 requests matching critical items.")

# 4. Write back into src/demoSeedData.ts
with open('src/demoSeedData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx_t5 = text.find('export const demoMaterialRequests: MaterialRequest[] = [')
idx_t6 = text.find('export const demoMaterialRequestsTUG6: MaterialRequest[] = [')
idx_disp = text.find('export const demoDispatches: OutboundDispatch[] = [];')

json_t5_str = json.dumps(tug5_requests, indent=2)
json_t6_str = json.dumps(tug6_requests, indent=2)

new_content = (
    text[:idx_t5] +
    'export const demoMaterialRequests: MaterialRequest[] = ' +
    json_t5_str +
    ';\n\nexport const demoMaterialRequestsTUG6: MaterialRequest[] = ' +
    json_t6_str +
    ';\n\n' +
    text[idx_disp:]
)

with open('src/demoSeedData.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\nSuccessfully updated src/demoSeedData.ts:")
print(f"  - TUG 5 requests count: {len(tug5_requests)}")
print(f"  - TUG 6 requests count: {len(tug6_requests)}")
