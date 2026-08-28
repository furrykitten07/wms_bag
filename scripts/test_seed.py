import pandas as pd
import json
import re
import os

def generate_ts_seed():
    df = pd.read_csv('data/spk_juli_2026.csv')
    
    tug5_requests = []
    tug6_requests = []
    
    spk_index = 0
    for no_spk, group in df.groupby('no_spk', sort=False):
        spk_index += 1
        date_spk = str(group['date_spk'].iloc[0]).strip()
        vessel = str(group['nama_kapal'].iloc[0]).strip() if pd.notna(group['nama_kapal'].iloc[0]) else 'Kartini Baruna'
        if vessel.lower() in ['nan', 'none', '']:
            vessel = 'Kartini Baruna'
            
        req_name = f"Chief Engineer {vessel}"
        
        items = []
        for idx, row in group.reset_index(drop=True).iterrows():
            uraian = str(row['uraian_spk']).strip() if pd.notna(row['uraian_spk']) else 'Suku Cadang Perbaikan'
            part_no = str(row['part_no']).strip() if pd.notna(row['part_no']) and str(row['part_no']).strip() not in ['--', 'nan'] else '-'
            try:
                qty = float(row['jumlah']) if pd.notna(row['jumlah']) else 1.0
                if qty.is_integer():
                    qty = int(qty)
            except:
                qty = 1
            unit = str(row['satuan']).strip() if pd.notna(row['satuan']) else 'pcs'
            
            items.append({
                'spare_part_id': f'sp-juli-{spk_index}-{idx+1}',
                'spare_part_name': uraian,
                'part_number': part_no,
                'unit': unit,
                'avg_monthly_usage': 1,
                'remaining_stock': 10,
                'requested_qty': qty,
                'notes': f'Permintaan material SPK {no_spk}',
                'item_status': 'Arrived'
            })
            
        status = "Approved" if spk_index % 5 != 0 else "Submitted"
        urgency = "HIGH" if spk_index % 3 == 0 else "NORMAL"
        
        # TUG 5 Object
        tug5_obj = {
            'id': f'mr-tug5-{spk_index}',
            'request_number': f'MR-2026-{String_padStart(spk_index, 6, "0")}',
            'tug5_number': f'TUG5-2026-{String_padStart(spk_index, 3, "0")}',
            'vessel_name': vessel,
            'request_date': date_spk,
            'requester_name': req_name,
            'warehouse_name': 'Gudang Merak' if spk_index % 2 == 0 else 'Jakarta HQ Warehouse',
            'delivery_address': f'Dermaga Pelabuhan Merak, SPK {no_spk}',
            'work_order_ref': no_spk,
            'account_code': 'BPP',
            'function_code': 'ARMADA',
            'remarks': f'Permintaan material TUG 5 untuk SPK {no_spk} ({vessel}).',
            'status': status,
            'urgency': urgency,
            'department': 'Engine Room' if spk_index % 2 == 0 else 'Deck & Navigation',
            'requested_by': req_name,
            'spk_id': f'spk-{spk_index}',
            'spk_number': no_spk,
            'created_at': f'{date_spk}T08:00:00.000Z',
            'updated_at': f'{date_spk}T10:00:00.000Z',
            'items': items
        }
        
        # TUG 6 Object
        tug6_obj = {
            'id': f'mr6-tug6-{spk_index}',
            'request_number': f'MR6-2026-{String_padStart(spk_index, 6, "0")}',
            'tug5_number': f'TUG6-2026-{String_padStart(spk_index, 3, "0")}',
            'tug6_number': f'TUG6-2026-{String_padStart(spk_index, 3, "0")}',
            'tug_type': 'TUG6',
            'vessel_name': vessel,
            'request_date': date_spk,
            'requester_name': req_name,
            'warehouse_name': 'Gudang Merak' if spk_index % 2 == 0 else 'Jakarta HQ Warehouse',
            'delivery_address': f'Dermaga Pelabuhan Merak, SPK {no_spk}',
            'work_order_ref': no_spk,
            'account_code': 'BPP',
            'function_code': 'ARMADA',
            'remarks': f'Permintaan material TUG 6 untuk SPK {no_spk} ({vessel}).',
            'status': status,
            'urgency': urgency,
            'department': 'Engine Room' if spk_index % 2 == 0 else 'Deck & Navigation',
            'requested_by': req_name,
            'spk_id': f'spk-{spk_index}',
            'spk_number': no_spk,
            'created_at': f'{date_spk}T08:30:00.000Z',
            'updated_at': f'{date_spk}T11:00:00.000Z',
            'items': items
        }
        
        tug5_requests.append(tug5_obj)
        tug6_requests.append(tug6_obj)

    print(f"Generated {len(tug5_requests)} TUG 5 requests and {len(tug6_requests)} TUG 6 requests.")
    return tug5_requests, tug6_requests

def String_padStart(val, length, pad_char):
    return str(val).zfill(length)

if __name__ == '__main__':
    t5, t6 = generate_ts_seed()
