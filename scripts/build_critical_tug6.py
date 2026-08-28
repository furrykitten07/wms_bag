import pandas as pd
import openpyxl
import json

print("=== PARSING CRITICAL SHEET AND MATCHING SPKS ===")

# 1. Read CRITICAL sheet
wb = openpyxl.load_workbook('data/FIKRI.xlsx', data_only=True)
ws = wb['CRITICAL']

crit_items = []
for row in list(ws.iter_rows(values_only=True))[3:]:
    if row and len(row) >= 4 and row[1] is not None:
        p_name = str(row[2]).strip() if row[2] else ''
        p_no = str(row[3]).strip() if row[3] else ''
        crit_items.append({'no': row[1], 'part_name': p_name, 'part_no': p_no})

print(f"Loaded {len(crit_items)} items from CRITICAL sheet.")

# 2. Read clean_det_spk.csv
df_det = pd.read_csv('data/clean_det_spk.csv', low_memory=False)

# Let's inspect column names
print("Columns in clean_det_spk.csv:", df_det.columns.tolist())

crit_nos_set = set(c['part_no'].upper() for c in crit_items if c['part_no'] and c['part_no'] != '-')
crit_names_set = set(c['part_name'].upper() for c in crit_items if c['part_name'])

df_det['part_no_str'] = df_det['part_no'].astype(str).str.strip().str.upper()
df_det['uraian_str'] = df_det['uraian_spk'].astype(str).str.strip().str.upper()

# Match if part_no_str is in crit_nos_set or uraian_str is in crit_names_set
matches = []

for idx, r in df_det.iterrows():
    pn = r['part_no_str']
    un = r['uraian_str']
    
    is_match = False
    matched_crit = None
    for c in crit_items:
        c_no = c['part_no'].upper()
        c_name = c['part_name'].upper()
        
        # Match part_no
        if c_no != '-' and c_no != '' and pn == c_no:
            is_match = True
            matched_crit = c
            break
            
        # Match part_name
        if c_name != '' and un == c_name:
            is_match = True
            matched_crit = c
            break
            
    if is_match:
        matches.append({
            'no_spk': r['no_spk'],
            'kapal': r['kapal'],
            'uraian_spk': r['uraian_spk'],
            'part_no': r['part_no'],
            'jumlah': r['jumlah'],
            'satuan': r['satuan'],
            'matched_crit': matched_crit
        })

print(f"\nTotal detail rows matched: {len(matches)}")
df_m = pd.DataFrame(matches)
spk_counts = df_m['no_spk'].value_counts()
print(f"Total Unique SPKs matched: {len(spk_counts)}")

print("\n--- Top SPKs with critical parts ---")
for spk_num, count in spk_counts.items():
    spk_rows = [m for m in matches if m['no_spk'] == spk_num]
    vessel = spk_rows[0]['kapal']
    print(f"\nSPK: {spk_num} | Vessel: {vessel} | Matching Items: {count}")
    for item in spk_rows:
        c = item['matched_crit']
        print(f"   -> Uraian: {item['uraian_spk']} | PartNo: {item['part_no']} | Qty: {item['jumlah']} <==> Crit #{c['no']}: {c['part_name']} ({c['part_no']})")

