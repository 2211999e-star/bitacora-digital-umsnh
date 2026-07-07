#!/usr/bin/env python3
"""
Expone aplicación en línea usando servicios gratuitos sin autenticación
Compatible con Windows sin SSH/Git Bash
"""

import os
import sys
import http.server
import socketserver
import socket
import urllib.request
import json
from pathlib import Path
from threading import Thread
import time

# Cambiar al directorio de la aplicación
script_dir = Path(__file__).parent
app_dir = script_dir / 'bitacora-digital-umsnh'
os.chdir(app_dir)

PORT = 8000
HANDLER = http.server.SimpleHTTPRequestHandler

def get_local_ip():
    """Obtener IP local"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def expose_with_localtunnel():
    """Exponer con localtunnel (requiere Node.js)"""
    print("\n📦 Intentando instalar y usar localtunnel...")
    try:
        import subprocess
        # Intentar usar localtunnel si npm está disponible
        result = subprocess.run(
            ["npx", "localtunnel", "--port", "8000"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("✅ localtunnel disponible:")
            print(result.stdout)
            return True
    except:
        pass
    return False

def expose_with_tunnels():
    """Información para usar tunnels.to"""
    return """
📝 Opción 2: tunnels.to (sin autenticación)
   Abre tu navegador en:
   https://tunnels.to/
   Selecciona: HTTP/HTTPS Tunnels → Configure Proxy
   Destino: localhost:8000
   """

def expose_with_pinggy():
    """Información para usar Pinggy"""
    return """
📝 Opción 3: Pinggy (sin autenticación)
   En otra terminal PowerShell:
   curl https://pinggy.io/install | powershell
   pinggy -p 8000
   """

def main():
    """Inicia servidor y proporciona opciones de exposición"""
    
    local_ip = get_local_ip()
    
    print("🚀 Iniciando servidor HTTP...")
    print(f"📁 Directorio: {Path.cwd()}")
    print()
    
    try:
        # Crear servidor
        httpd = socketserver.TCPServer(("", PORT), HANDLER)
        
        print("="*70)
        print("✅ SERVIDOR INICIADO")
        print("="*70)
        print()
        print("🔗 ACCESO LOCAL:")
        print(f"   • http://localhost:8000")
        print(f"   • http://127.0.0.1:8000")
        print(f"   • http://{local_ip}:8000 (desde otra PC en la red)")
        print()
        print("🌐 ACCESO EN LÍNEA (sin autenticación):")
        print("-"*70)
        print()
        print("📝 Opción 1: ngrok ALTERNATIVA - SSH tunneling")
        print("   Si tienes Git Bash/WSL instalado:")
        print("   ssh -R 80:localhost:8000 localhost.run")
        print()
        print(expose_with_tunnels())
        print(expose_with_pinggy())
        print()
        print("="*70)
        print("💡 Presiona Ctrl+C para detener")
        print("="*70 + "\n")
        
        # Mantener servidor activo
        httpd.serve_forever()
        
    except KeyboardInterrupt:
        print("\n\n🛑 Servidor detenido")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
