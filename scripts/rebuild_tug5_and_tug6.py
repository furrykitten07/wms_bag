import pandas as pd
import openpyxl
import json
import os

print("=== REBUILDING TUG 5 AND TUG 6 FROM FIKRI.XLSX CRITICAL SHEET ===")

# 1. Read CRITICAL sheet
wb = openpyxl.load_workbook('data/FIKRI.xlsx', data_only=True)
ws = wb['CRITICAL']

crit_items = []
crit_nos = set()
crit_names = set()

for row in list(ws.iter_rows(values_only=True))[3:]:
    if row and len(row) >= 4 and row[1] is not None:
        p_name = str(row[2]).strip() if row[2] else ''
        p_no = str(row[3]).strip() if row[3] else ''
        crit_items.append({'no': row[1], 'part_name': p_name, 'part_no': p_no})
        if p_no and p_no != '-':
            crit_nos.add(p_no.upper())
        if p_name:
            crit_names.add(p_name.upper())

print(f"Loaded {len(crit_items)} items from CRITICAL sheet:")
for c in crit_items:
    print(f"  #{c['no']}: {c['part_name']} | PART_NO: {c['part_no']}")

# 2. Read demoSeedData.ts TUG 5 data
with open('src/demoSeedData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx_tug5 = text.find('export const demoMaterialRequests: MaterialRequest[] = [')
idx_tug6 = text.find('export const demoMaterialRequestsTUG6: MaterialRequest[] = [')
idx_disp = text.find('export const demoDispatches: OutboundDispatch[] = [];')

json_tug5_str = text[idx_tug5 + len('export const demoMaterialRequests: MaterialRequest[] = '):idx_tug6].strip().rstrip(';')
tug5_all = json.loads(json_tug5_str)

print(f"\nTotal TUG 5 requests available: {len(tug5_all)}")

# 3. For TUG 6, filter requests from TUG 5 where items match the 26 CRITICAL sheet items!
tug6_matched_reqs = []
total_tug6_items = 0

for req in tug5_all:
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
        new_req = dict(req)
        # Give TUG 6 specific ID and request number formatting
        req_seq = len(tug6_matched_reqs) + 1
        seq_str = str(req_seq).padStart if hasattr(str, 'padStart') else f"{req_seq:06d}"
        new_req['id'] = f"mr6-tug6-{req_seq}"
        new_req['request_number'] = f"MR6-2026-{seq_str}"
        new_req['tug_type'] = "TUG6"
        new_req['tug6_number'] = f"TUG6-2026-{seq_str[-3:]}"
        new_req['items'] = matched_items
        
        tug6_matched_reqs.append(new_req)
        total_tug6_items += len(matched_items)

print(f"\nMatching TUG 6 requests generated: {len(tug6_matched_reqs)}")
print(f"Total matching critical items across TUG 6: {total_tug6_items}")

print("\n--- Sample Generated TUG 6 Requests ---")
for r in tug6_matched_reqs[:10]:
    print(f"Req: {r['request_number']} | SPK: {r['spk_number']} | Vessel: {r['vessel_name']} | Items: {len(r['items'])}")
    for itm in r['items']:
        print(f"   -> {itm.get('spare_part_name')} (PN: {itm.get('part_number')})")

# 4. Write back into src/demoSeedData.ts
json_tug6_str = json.dumps(tug6_matched_reqs, indent=2)

new_content = (
    text[:idx_tug6] +
    'export const demoMaterialRequestsTUG6: MaterialRequest[] = ' +
    json_tug6_str +
    ';\n\n' +
    text[idx_disp:]
)

with open('src/demoSeedData.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\nSuccessfully synchronized demoSeedData.ts with strictly matched TUG 6 data!")
