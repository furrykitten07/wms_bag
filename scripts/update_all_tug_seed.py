import pandas as pd
import json
import re

def String_padStart(val, length):
    return str(val).zfill(length)

def main():
    df = pd.read_csv('data/spk_juli_2026.csv')
    
    spks = []
    tug5_requests = []
    tug6_requests = []
    dispatches = []
    returns = []
    
    spk_index = 0
    for no_spk, group in df.groupby('no_spk', sort=False):
        spk_index += 1
        date_spk = str(group['date_spk'].iloc[0]).strip()
        vessel = str(group['nama_kapal'].iloc[0]).strip() if pd.notna(group['nama_kapal'].iloc[0]) else 'Kartini Baruna'
        if vessel.lower() in ['nan', 'none', '']:
            vessel = 'Kartini Baruna'
            
        req_name = f"Chief Engineer {vessel}"
        
        # Build items
        spk_items = []
        mr_items = []
        dsp_items = []
        ret_items = []
        
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
            
            sp_id = f'sp-juli-{spk_index}-{idx+1}'
            
            # SPK Vessel item
            spk_items.append({
                'spare_part_id': sp_id,
                'spare_part_name': uraian,
                'part_number': part_no,
                'qty_to_pick': qty,
                'unit': unit
            })
            
            # MR (TUG 5 & 6) item
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
            
            # Dispatch item
            dsp_items.append({
                'spare_part_id': sp_id,
                'spare_part_name': uraian,
                'part_number': part_no,
                'qty_requested': qty,
                'qty_dispatched': qty,
                'unit': unit,
                'unit_price': 1500000 + (idx * 250000),
                'notes': f'Pengiriman TUG 8 SPK {no_spk}'
            })
            
            # Return item
            ret_items.append({
                'id': f'itm-ret-{spk_index}-{idx+1}',
                'spare_part_id': sp_id,
                'part_name': uraian,
                'part_number': part_no,
                'unit': unit,
                'qty_returned': max(1, int(qty * 0.1)),
                'condition': 'Good',
                'remarks': f'Return alokasi SPK {no_spk}',
                'unit_price': 1500000
            })
            
        status_spk = "Dispatched" if spk_index % 3 == 0 else "Incomplete" if spk_index % 2 == 0 else "Picked & Ready"
        status_mr = "Approved" if spk_index % 5 != 0 else "Submitted"
        urgency = "HIGH" if spk_index % 3 == 0 else "NORMAL"
        
        # 1. SPK Object
        spk_obj = {
            'id': f'spk-juli-{spk_index}',
            'spk_number': no_spk,
            'target_port': 'Pelabuhan Merak, Banten' if spk_index % 2 == 0 else 'Pelabuhan Tanjung Priok, Jakarta',
            'status': status_spk,
            'created_at': f'{date_spk}T08:00:00.000Z',
            'created_by': req_name,
            'remarks': f'Perintah kerja pengadaan perbaikan & perawatan {vessel}.',
            'vessels': [
                {
                    'vessel_name': vessel,
                    'items': spk_items
                }
            ]
        }
        
        # 2. TUG 5 Object
        tug5_obj = {
            'id': f'mr-tug5-{spk_index}',
            'request_number': f'MR-2026-{String_padStart(spk_index, 6)}',
            'tug5_number': f'TUG5-2026-{String_padStart(spk_index, 3)}',
            'vessel_name': vessel,
            'request_date': date_spk,
            'requester_name': req_name,
            'warehouse_name': 'Gudang Merak' if spk_index % 2 == 0 else 'Jakarta HQ Warehouse',
            'delivery_address': f'Dermaga Pelabuhan Merak, SPK {no_spk}',
            'work_order_ref': no_spk,
            'account_code': 'BPP',
            'function_code': 'ARMADA',
            'remarks': f'Permintaan material TUG 5 untuk SPK {no_spk} ({vessel}).',
            'status': status_mr,
            'urgency': urgency,
            'department': 'Engine Room' if spk_index % 2 == 0 else 'Deck & Navigation',
            'requested_by': req_name,
            'spk_id': f'spk-juli-{spk_index}',
            'spk_number': no_spk,
            'created_at': f'{date_spk}T08:00:00.000Z',
            'updated_at': f'{date_spk}T10:00:00.000Z',
            'items': mr_items
        }
        
        # 3. TUG 6 Object
        tug6_obj = {
            'id': f'mr6-tug6-{spk_index}',
            'request_number': f'MR6-2026-{String_padStart(spk_index, 6)}',
            'tug5_number': f'TUG6-2026-{String_padStart(spk_index, 3)}',
            'tug6_number': f'TUG6-2026-{String_padStart(spk_index, 3)}',
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
            'status': status_mr,
            'urgency': urgency,
            'department': 'Engine Room' if spk_index % 2 == 0 else 'Deck & Navigation',
            'requested_by': req_name,
            'spk_id': f'spk-juli-{spk_index}',
            'spk_number': no_spk,
            'created_at': f'{date_spk}T08:30:00.000Z',
            'updated_at': f'{date_spk}T11:00:00.000Z',
            'items': mr_items
        }
        
        # 4. Outbound Dispatch (TUG 8)
        dsp_obj = {
            'id': f'dsp-{spk_index}',
            'dispatch_number': f'DSP-2026-{String_padStart(spk_index, 3)}',
            'tug8_number': f'TUG8-2026-{String_padStart(spk_index, 3)}',
            'bon_pengeluaran_number': f'BON-89{String_padStart(100+spk_index, 3)}',
            'surat_jalan_number': f'SJ-BAg-2026-{String_padStart(spk_index, 2)}',
            'manifest_number': f'MNF-2026-{String_padStart(spk_index, 2)}',
            'spk_id': f'spk-juli-{spk_index}',
            'spk_number': no_spk,
            'vessel_name': vessel,
            'destination_port': 'Pelabuhan Merak, Banten',
            'warehouse_origin': 'Gudang Merak Zone A',
            'transporter_name': 'PT. Bahtera Logistik Armada',
            'vehicle_number': f'B {9000+spk_index} BAg',
            'driver_name': 'Rahmat Hidayat',
            'driver_phone': '081298100200',
            'status': '__DISPATCHED__',
            'created_at': f'{date_spk}T12:00:00.000Z',
            'created_by': 'Ahmad Subarjo (Staff Gudang)',
            'source_type': 'spk',
            'items': dsp_items
        }
        
        # 5. Material Return (TUG 10)
        ret_obj = {
            'id': f'ret-{spk_index}',
            'return_number': f'TUG10-2026-{String_padStart(spk_index, 3)}',
            'vessel_name': vessel,
            'spk_id': f'spk-juli-{spk_index}',
            'spk_number': no_spk,
            'return_date': date_spk,
            'status': 'Approved',
            'account_code': 'BPP',
            'function_code': 'ARMADA',
            'created_by': req_name,
            'created_at': f'{date_spk}T14:00:00.000Z',
            'updated_at': f'{date_spk}T15:00:00.000Z',
            'items': ret_items
        }
        
        spks.append(spk_obj)
        tug5_requests.append(tug5_obj)
        tug6_requests.append(tug6_obj)
        dispatches.append(dsp_obj)
        returns.append(ret_obj)

    # Format TypeScript exports
    ts_spks = "export const demoSPKs: SPKWorkOrder[] = " + json.dumps(spks, indent=2, ensure_ascii=False) + ";\n"
    ts_tug5 = "export const demoMaterialRequests: MaterialRequest[] = " + json.dumps(tug5_requests, indent=2, ensure_ascii=False) + ";\n"
    ts_tug6 = "export const demoMaterialRequestsTUG6: MaterialRequest[] = " + json.dumps(tug6_requests, indent=2, ensure_ascii=False) + ";\n"
    ts_dsp = "export const demoDispatches: OutboundDispatch[] = " + json.dumps(dispatches, indent=2, ensure_ascii=False) + ";\n"
    ts_dsp = ts_dsp.replace('"__DISPATCHED__"', 'DispatchStatus.DISPATCHED')

    target_file = 'src/demoSeedData.ts'
    with open(target_file, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'// --- \d+ SPK WORK ORDERS GENERATOR.*[\s\S]*?(?=// --- \d+ INBOUND RECEIVINGS GENERATOR ---)'
    
    replacement = (
        f"// --- 104 SPK WORK ORDERS GENERATOR (JULI 2026 SPK DATA) ---\n"
        f"{ts_spks}\n"
        f"// --- 104 MATERIAL REQUESTS TUG 5 GENERATOR (JULI 2026 SPK DATA) ---\n"
        f"{ts_tug5}\n"
        f"// --- 104 MATERIAL REQUESTS TUG 6 GENERATOR (JULI 2026 SPK DATA) ---\n"
        f"{ts_tug6}\n"
        f"// --- 104 OUTBOUND DISPATCHES TUG 8 GENERATOR (JULI 2026 SPK DATA) ---\n"
        f"{ts_dsp}\n"
    )
    
    match = re.search(pattern, content)
    if match:
        start, end = match.span()
        new_content = content[:start] + replacement + content[end:]
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully updated {target_file} with {len(spks)} SPKs, TUG 5, TUG 6, and TUG 8 dispatches!")
    else:
        print("Pattern match failed!")

if __name__ == '__main__':
    main()
