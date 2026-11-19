#!/usr/bin/env python3
"""
Downloads and converts real 3D city models from 3Drotterdam (3drotterdam.nl)
open data portal into game-ready GLB models for WebGL / Three.js.
"""

import os
import sys
import json
import gzip
import struct
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def fetch_data(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'RotterdamGameBot/1.0', 'Accept-Encoding': 'gzip'})
    resp = urllib.request.urlopen(req)
    raw = resp.read()
    try:
        return gzip.decompress(raw)
    except:
        return raw

def extract_and_normalize_glb(b3dm_bytes, name="model"):
    if len(b3dm_bytes) < 28:
        raise ValueError("Invalid b3dm length")
    
    magic, version, byte_len, ft_json_len, ft_bin_len, bt_json_len, bt_bin_len = struct.unpack('<4sIIIIII', b3dm_bytes[:28])
    if magic != b'b3dm':
        raise ValueError(f"Expected b3dm magic, got {magic}")
    
    offset = 28 + ft_json_len + ft_bin_len
    bt_json = b3dm_bytes[offset:offset+bt_json_len].decode('utf-8', errors='ignore') if bt_json_len > 0 else ""
    offset += bt_json_len + bt_bin_len
    glb_bytes = b3dm_bytes[offset:]
    
    # Parse GLB header
    magic, glb_ver, total_len = struct.unpack('<4sII', glb_bytes[:12])
    if magic != b'glTF':
        raise ValueError("Invalid embedded glTF magic")
    
    chunk_len, chunk_type = struct.unpack('<II', glb_bytes[12:20])
    json_bytes = glb_bytes[20:20+chunk_len]
    gltf_dict = json.loads(json_bytes.decode('utf-8'))
    
    bin_chunk_bytes = glb_bytes[20+chunk_len:]
    
    # Normalize nodes: Remove Cesium ECEF curvature matrix, set to identity so Y is UP in local meters
    for node in gltf_dict.get('nodes', []):
        if 'matrix' in node:
            # Preserve scale and position if identity, or replace with identity
            node['matrix'] = [1.0, 0.0, 0.0, 0.0,
                              0.0, 1.0, 0.0, 0.0,
                              0.0, 0.0, 1.0, 0.0,
                              0.0, 0.0, 0.0, 1.0]
    
    # Ensure materials render double-sided and solid
    for mat in gltf_dict.get('materials', []):
        mat['doubleSided'] = True
        pbr = mat.get('pbrMetallicRoughness', {})
        if 'roughnessFactor' not in pbr:
            pbr['roughnessFactor'] = 0.8
        if 'metallicFactor' not in pbr:
            pbr['metallicFactor'] = 0.1
        # Fix transparent baseColorFactor if alpha is 0
        if 'baseColorFactor' in pbr:
            bcf = pbr['baseColorFactor']
            if len(bcf) == 4 and bcf[3] == 0.0:
                pbr['baseColorFactor'] = [bcf[0], bcf[1], bcf[2], 1.0]
        mat['alphaMode'] = 'OPAQUE'
    
    # Re-encode JSON chunk with 4-byte padding
    new_json_bytes = json.dumps(gltf_dict, separators=(',', ':')).encode('utf-8')
    pad = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b' ' * pad
    
    new_total_len = 12 + 8 + len(new_json_bytes) + len(bin_chunk_bytes)
    new_header = struct.pack('<4sII', b'glTF', 2, new_total_len)
    new_chunk0 = struct.pack('<II', len(new_json_bytes), chunk_type)
    
    output_glb = new_header + new_chunk0 + new_json_bytes + bin_chunk_bytes
    return output_glb, gltf_dict, bt_json

def main():
    print("=== Downloading 3D Rotterdam City Assets ===")
    
    manifest = {
        "city": "Rotterdam",
        "source": "3drotterdam.nl",
        "models": []
    }
    
    # 1. Iconic Erasmusbrug Bridge
    erasmus_url = "https://www.3drotterdam.nl/datasource-data/69926a30-444d-46bb-995e-bb14b151d3ab/17/134338/27736.b3dm"
    print(f"Downloading Erasmusbrug from {erasmus_url} ...")
    try:
        raw = fetch_data(erasmus_url)
        glb_data, gltf_meta, bt_json = extract_and_normalize_glb(raw, "erasmusbrug")
        out_path = os.path.join(MODELS_DIR, "erasmusbrug.glb")
        with open(out_path, "wb") as f:
            f.write(glb_data)
        print(f"Saved {out_path} ({len(glb_data) / 1024:.1f} KB)")
        manifest["models"].append({
            "id": "erasmusbrug",
            "name": "Erasmusbrug (Erasmus Bridge)",
            "file": "models/erasmusbrug.glb",
            "type": "bridge",
            "offset": [0.0, 0.0, 0.0],
            "size_bytes": len(glb_data)
        })
    except Exception as e:
        print(f"Error fetching Erasmusbrug: {e}")

    # 2. Key City & Canal Building Sectors
    building_tiles = [
        ("rotterdam_wilhelminapier", "Wilhelminapier & De Rotterdam", "33584/6934.b3dm", [126.6, 0.0, 173.1]),
        ("rotterdam_boompjes", "Boompjes & Leuvehaven Entrance", "33584/6933.b3dm", [-211.8, 0.0, -203.2]),
        ("rotterdam_rijnhaven", "Rijnhaven Quay & Marina", "33584/6935.b3dm", [465.0, 0.0, 549.3]),
        ("rotterdam_veerhaven", "Veerhaven & West Waterfront", "33583/6934.b3dm", [124.3, 0.0, 428.7]),
        ("rotterdam_noordereiland", "Noordereiland & Koninginnehoofd", "33585/6934.b3dm", [128.9, 0.0, -82.6])
    ]
    
    base_bldg_url = "https://www.3drotterdam.nl/datasource-data/3adbe5af-d05c-475a-b34c-59e69ba8dadc/15/"
    
    for model_id, label, tile_path, offset in building_tiles:
        tile_url = base_bldg_url + tile_path
        print(f"Downloading {label} ({tile_path}) ...")
        try:
            raw = fetch_data(tile_url)
            glb_data, gltf_meta, bt_json = extract_and_normalize_glb(raw, model_id)
            out_file = f"{model_id}.glb"
            out_path = os.path.join(MODELS_DIR, out_file)
            with open(out_path, "wb") as f:
                f.write(glb_data)
            print(f"Saved {out_path} ({len(glb_data) / 1024:.1f} KB)")
            manifest["models"].append({
                "id": model_id,
                "name": label,
                "file": f"models/{out_file}",
                "type": "buildings",
                "tile": tile_path,
                "offset": offset,
                "size_bytes": len(glb_data)
            })
        except Exception as e:
            print(f"Error fetching {label}: {e}")
            
    manifest_path = os.path.join(MODELS_DIR, "rotterdam_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Manifest written to {manifest_path}")
    print("Download and conversion complete!")

if __name__ == "__main__":
    main()
