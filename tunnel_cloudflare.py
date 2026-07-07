#!/usr/bin/env python3
"""
Descargar cloudflared para Windows y exponer en línea
"""

import urllib.request
import os
import subprocess
import sys
from pathlib import Path

def download_cloudflared():
    """Descargar cloudflared desde GitHub"""
    print("📥 Descargando cloudflared...")
    
    url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    output = "cloudflared.exe"
    
    try:
        urllib.request.urlretrieve(url, output)
        print(f"✅ cloudflared descargado: {Path.cwd()}/{output}")
        return True
    except Exception as e:
        print(f"❌ Error descargando: {e}")
        return False

def expose_tunnel():
    """Exponer puerto 8000 con cloudflared"""
    print("\n🌐 Exponiendo con Cloudflare Tunnel...")
    print("   - Servicio: http://localhost:8000")
    print("   - Puerto: 8000\n")
    
    try:
        subprocess.run(["./cloudflared.exe", "tunnel", "--url", "http://localhost:8000"])
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    os.chdir(Path(__file__).parent)
    
    if not Path("cloudflared.exe").exists():
        if not download_cloudflared():
            sys.exit(1)
    
    expose_tunnel()
