import openpyxl
import pandas as pd
import json

# 1. Read CRITICAL sheet from FIKRI.xlsx
wb = openpyxl.load_workbook('data/FIKRI.xlsx', data_only=True)
ws = wb['CRITICAL']

crit_list = []
for row in list(ws.iter_rows(values_only=True))[3:]:
    if row and len(row) >= 4 and row[1] is not None:
        p_name = str(row[2]).strip() if row[2] else ''
        p_no = str(row[3]).strip() if row[3] else ''
        crit_list.append({'no': row[1], 'part_name': p_name, 'part_no': p_no})

print(f"Loaded {len(crit_list)} items from CRITICAL sheet:")
for c in crit_list:
    print(f"  {c['no']}. {c['part_name']} | PART_NO: {c['part_no']}")

# 2. Read TUG 5 data from demoSeedData.ts or data/tug5_data.csv
with open('src/demoSeedData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx1 = text.find('export const demoMaterialRequests: MaterialRequest[] = [')
idx2 = text.find('export const demoMaterialRequestsTUG6: MaterialRequest[] = [')

json_tug5_str = text[idx1 + len('export const demoMaterialRequests: MaterialRequest[] = '):idx2].strip().rstrip(';')
tug5_data = json.loads(json_tug5_str)

print(f"\nTotal TUG 5 requests in demoSeedData: {len(tug5_data)}")

# Let's inspect all items in TUG 5 and match with the 26 critical items!
matching_tug5_reqs = []

for req in tug5_data:
    matched_items = []
    for item in req.get('items', []):
        sn = str(item.get('spare_part_name', '')).strip().upper()
        pn = str(item.get('part_number', '')).strip().upper()
        
        # Check match with 26 critical items
        for crit in crit_list:
            c_name = crit['part_name'].upper()
            c_no = crit['part_no'].upper()
            
            # Match rules: exact or substring match on part_number or spare_part_name
            match_pn = (c_no != '-' and c_no != '' and (pn == c_no or c_no in pn or pn in c_no))
            match_sn = (c_name != '' and (sn == c_name or c_name in sn or sn in c_name))
            
            if match_pn or match_sn:
                matched_items.append({
                    'item': item,
                    'matched_crit': crit
                })
                break
                
    if matched_items:
        matching_tug5_reqs.append({
            'req': req,
            'matched_items': matched_items
        })

print(f"\nTotal TUG 5 requests containing critical items: {len(matching_tug5_reqs)}")
for m in matching_tug5_reqs:
    r = m['req']
    print(f"\nReq Number: {r['request_number']} | SPK: {r['spk_number']} | Vessel: {r['vessel_name']}")
    for itm_info in m['matched_items']:
        itm = itm_info['item']
        crit = itm_info['matched_crit']
        print(f"   -> Item: {itm.get('spare_part_name')} (PN: {itm.get('part_number')}) <==> Crit No {crit['no']}: {crit['part_name']} ({crit['part_no']})")

