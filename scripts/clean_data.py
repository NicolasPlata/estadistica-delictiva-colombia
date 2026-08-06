import pandas as pd
import os
import glob
import re

data_dir = 'Data'
files = glob.glob(os.path.join(data_dir, '*.xlsx'))

for f in files:
    # Extract year
    match = re.search(r'202[0-9]', f)
    if not match:
        continue
    year = match.group()
    
    print(f"Processing {f} -> {year}.xlsx")
    
    # Read first 30 rows to find header index
    df_head = pd.read_excel(f, nrows=30, header=None)
    
    # Find the first row that has more than 5 non-null columns
    header_idx = 0
    for i in range(len(df_head)):
        if df_head.iloc[i].notna().sum() > 5:
            header_idx = i
            break
            
    print(f"Header found at index {header_idx}")
    
    # Read the full dataframe properly
    df = pd.read_excel(f, header=header_idx)
    
    # Save to new file
    new_path = os.path.join(data_dir, f"{year}.xlsx")
    df.to_excel(new_path, index=False)
    
    print(f"Saved {new_path}")
    
    # optionally remove old file to save space and avoid confusion
    os.remove(f)

