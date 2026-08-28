import pandas as pd
import openpyxl
import os

print("=== CHECKING ALL SPK AND DET_SPK DATA FILES ===")

# 1. Read CRITICAL sheet
wb = openpyxl.load_workbook('data/FIKRI.xlsx', data_only=True)
ws = wb['CRITICAL']
crit_items = []
for row in list(ws.iter_rows(values_only=True))[3:]:
    if row and len(row) >= 4 and row[1] is not None:
        p_name = str(row[2]).strip() if row[2] else ''
        p_no = str(row[3]).strip() if row[3] else ''
        crit_items.append({'no': row[1], 'part_name': p_name, 'part_no': p_no})

print(f"Loaded {len(crit_items)} items from CRITICAL sheet:")
for c in crit_items:
    print(f"  No {c['no']}. {c['part_name']} | PART_NO: {c['part_no']}")

# 2. Check clean_det_spk.csv
if os.path.exists('data/clean_det_spk.csv'):
    df_det = pd.read_csv('data/clean_det_spk.csv', low_memory=False)
    print(f"\nclean_det_spk.csv loaded: {len(df_det)} rows.")
    
    # Vectorized / set matching
    crit_nos_set = set(c['part_no'].upper() for c in crit_items if c['part_no'] and c['part_no'] != '-')
    crit_names_set = set(c['part_name'].upper() for c in crit_items if c['part_name'])
    
    df_det['part_no_clean'] = df_det['part_number'].astype(str).str.strip().str.upper()
    df_det['part_name_clean'] = df_det['spare_part_name'].astype(str).str.strip().str.upper()
    
    # Filter rows matching critical numbers or names
    match_mask = df_det['part_no_clean'].isin(crit_nos_set) | df_det['part_name_clean'].isin(crit_names_set)
    df_matches = df_det[match_mask]
    
    print(f"\nTotal matching detail rows in clean_det_spk.csv: {len(df_matches)}")
    print("Unique SPKs with critical items:", df_matches['no_spk'].nunique())
    
    # Group by SPK
    spk_groups = df_matches.groupby('no_spk')
    print(f"\n=== MATCHED SPK LIST ({df_matches['no_spk'].nunique()} SPKs) ===")
    for spk_no, group in spk_groups:
        vessel = group['vessel_name'].iloc[0] if 'vessel_name' in group.columns else ''
        print(f"\nSPK NO: {spk_no} (Vessel: {vessel}, Items: {len(group)})")
        for _, row in group.iterrows():
            print(f"   -> {row['spare_part_name']} | PN: {row['part_number']} | Qty: {row.get('qty_spk', 1)}")

