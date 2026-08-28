import openpyxl
import json
import os

# 1. Load critical items from FIKRI.xlsx sheet "CRITICAL"
wb = openpyxl.load_workbook('data/FIKRI.xlsx', data_only=True)
ws = wb['CRITICAL']

crit_items = []
for row in list(ws.iter_rows(values_only=True))[3:]:
    if row and len(row) >= 4 and row[1] is not None:
        p_name = str(row[2]).strip().upper() if row[2] else ''
        p_no = str(row[3]).strip().upper() if row[3] else ''
        crit_items.append((p_name, p_no))

print("Loaded critical items from Excel:")
for name, no in crit_items:
    print(f"  - NAME: {name} | PART_NO: {no}")

# 2. Read src/demoSeedData.ts
seed_path = 'src/demoSeedData.ts'
with open(seed_path, 'r', encoding='utf-8') as f:
    text = f.read()

idx1 = text.find('export const demoMaterialRequestsTUG6: MaterialRequest[] = [')
idx2 = text.find('export const demoDispatches: OutboundDispatch[] = [];')

if idx1 == -1 or idx2 == -1:
    print("Could not find demoMaterialRequestsTUG6 markers in file!")
    exit(1)

prefix = text[:idx1 + len('export const demoMaterialRequestsTUG6: MaterialRequest[] = ')]
suffix = text[idx2:]

json_str = text[idx1 + len('export const demoMaterialRequestsTUG6: MaterialRequest[] = '):idx2].strip().rstrip(';')
all_tug6_reqs = json.loads(json_str)

print(f"\nOriginal TUG6 requests count: {len(all_tug6_reqs)}")

# 3. Filter TUG6 requests: keep ONLY requests that have matching critical items
filtered_tug6_reqs = []
total_matching_items = 0

for req in all_tug6_reqs:
    matching_items_in_req = []
    for item in req.get('items', []):
        sn = str(item.get('spare_part_name', '')).strip().upper()
        pn = str(item.get('part_number', '')).strip().upper()
        
        is_match = False
        for c_name, c_no in crit_items:
            c_name_u = c_name.upper()
            c_no_u = c_no.upper()
            
            match_pn = (c_no_u != '-' and c_no_u != '' and pn == c_no_u)
            match_sn = (c_name_u != '' and (sn == c_name_u or c_name_u in sn or sn in c_name_u))
            
            if match_pn or (match_sn and pn != '-'):
                is_match = True
                break
        
        if is_match:
            matching_items_in_req.append(item)
            
    # ONLY KEEP THE REQUEST IF IT HAS AT LEAST 1 MATCHING CRITICAL ITEM!
    if len(matching_items_in_req) > 0:
        new_req = dict(req)
        new_req['items'] = matching_items_in_req
        filtered_tug6_reqs.append(new_req)
        total_matching_items += len(matching_items_in_req)

print(f"Filtered TUG6 requests count (ONLY WITH CRITICAL MATCHES): {len(filtered_tug6_reqs)}")
print(f"Total critical items across filtered TUG6: {total_matching_items}")

print("\nList of Filtered TUG 6 Requests:")
for r in filtered_tug6_reqs:
    print(f"  - Request: {r['request_number']} | SPK: {r['spk_number']} | Vessel: {r['vessel_name']} | Items: {len(r['items'])}")
    for itm in r['items']:
        print(f"       * {itm.get('spare_part_name')} (PN: {itm.get('part_number')}) - Qty: {itm.get('requested_qty')}")

# 4. Write back formatted JSON
json_formatted = json.dumps(filtered_tug6_reqs, indent=2)
new_content = prefix + json_formatted + ';\n\n' + suffix

with open(seed_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\nSuccessfully updated src/demoSeedData.ts with strictly filtered TUG 6 data!")
