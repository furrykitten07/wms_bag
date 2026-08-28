import pandas as pd
import csv
import io
import os
import shutil

def parse_excel_to_df(filepath):
    print(f"Parsing and reconstructing {filepath}...")
    xl = pd.ExcelFile(filepath)
    df_raw = xl.parse(xl.sheet_names[0], header=None)
    lines = []
    for row in df_raw.itertuples(index=False):
        vals = []
        for v in row:
            if pd.notnull(v):
                if isinstance(v, float) and v.is_integer():
                    vals.append(str(int(v)))
                else:
                    vals.append(str(v))
        if vals:
            lines.append(','.join(vals))
            
    text = '\n'.join(lines)
    reader = csv.reader(io.StringIO(text), delimiter=';')
    rows = list(reader)
    header = [c.strip('"').strip() for c in rows[0]]
    
    clean_rows = []
    for r in rows[1:]:
        r_clean = [c.strip('"').strip() for c in r]
        if len(r_clean) == len(header):
            clean_rows.append(r_clean)
        elif len(r_clean) < len(header):
            clean_rows.append(r_clean + [''] * (len(header) - len(r_clean)))
        else:
            clean_rows.append(r_clean[:len(header)])
            
    df = pd.DataFrame(clean_rows, columns=header)
    df.replace('0000-00-00', '', inplace=True)
    return df

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    
    file_kapal = os.path.join(data_dir, 'daftarkapal_new.xlsx')
    file_det = os.path.join(data_dir, 'det_spk_new.xlsx')
    file_list = os.path.join(data_dir, 'list_spk.xlsx')
    
    df_kapal = parse_excel_to_df(file_kapal)
    df_det = parse_excel_to_df(file_det)
    df_list = parse_excel_to_df(file_list)
    
    print(f"Loaded: Daftar Kapal ({len(df_kapal)} rows), Detail SPK ({len(df_det)} rows), List SPK ({len(df_list)} rows)")
    
    # Clean numeric columns in df_det
    df_det['jumlah_num'] = pd.to_numeric(df_det['jumlah'], errors='coerce').fillna(0)
    df_det['harga_satuan_num'] = pd.to_numeric(df_det['harga_satuan'], errors='coerce').fillna(0)
    df_det['total_harga'] = df_det['jumlah_num'] * df_det['harga_satuan_num']
    
    # Prepare list_spk subset for merging
    list_cols_to_merge = [
        'no_spk', 'title_spk', 'date_spk', 'vendor', 'del_time', 'franco_spk',
        'syarat_bayar', 'transport_spk', 'discount_spk', 'status', 'type_spk',
        'paid_date', 'status_proc', 'odoo', 'payment'
    ]
    available_list_cols = [c for c in list_cols_to_merge if c in df_list.columns]
    df_list_sub = df_list[available_list_cols].copy()
    if 'status' in df_list_sub.columns:
        df_list_sub.rename(columns={'status': 'status_spk_header'}, inplace=True)

    # Merge df_det with df_list_sub on no_spk
    df_merged = pd.merge(df_det, df_list_sub, on='no_spk', how='left')

    # Prepare kapal master subset for merging
    kapal_cols_to_merge = ['No', 'kapal', 'short_kapal', 'alias', 'type', 'gt', 'dwt', 'jenis']
    available_kapal_cols = [c for c in kapal_cols_to_merge if c in df_kapal.columns]
    df_kapal_sub = df_kapal[available_kapal_cols].copy()
    df_kapal_sub.rename(columns={
        'No': 'kapal',
        'kapal': 'nama_kapal',
        'type': 'type_kapal',
        'jenis': 'jenis_kapal'
    }, inplace=True)

    df_merged = pd.merge(df_merged, df_kapal_sub, on='kapal', how='left')
    
    print(f"Merged Dataset Shape: {df_merged.shape}")
    
    # Save CSV outputs
    output_csv = os.path.join(data_dir, 'spk_master_combined.csv')
    print(f"Saving combined CSV: {output_csv}...")
    df_merged.to_csv(output_csv, index=False, encoding='utf-8-sig')
    
    # Save individual clean CSVs
    df_list.to_csv(os.path.join(data_dir, 'clean_list_spk.csv'), index=False, encoding='utf-8-sig')
    df_det.to_csv(os.path.join(data_dir, 'clean_det_spk.csv'), index=False, encoding='utf-8-sig')
    df_kapal.to_csv(os.path.join(data_dir, 'clean_daftarkapal.csv'), index=False, encoding='utf-8-sig')

    # Save Excel output atomically via temp file
    output_excel = os.path.join(data_dir, 'spk_master_combined.xlsx')
    tmp_excel = os.path.join(data_dir, 'spk_master_combined_tmp.xlsx')
    print(f"Saving combined Excel to temporary file: {tmp_excel}...")
    
    writer = pd.ExcelWriter(tmp_excel, engine='openpyxl')
    df_merged.to_excel(writer, sheet_name='SPK_Detail_Merged', index=False)
    df_list.to_excel(writer, sheet_name='List_SPK', index=False)
    df_det.to_excel(writer, sheet_name='Detail_SPK', index=False)
    df_kapal.to_excel(writer, sheet_name='Daftar_Kapal', index=False)
    writer.close()
    
    shutil.move(tmp_excel, output_excel)
    print("Export finished successfully!")

if __name__ == '__main__':
    main()
