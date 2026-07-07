#!/usr/bin/env python3
"""
Servidor HTTP simple con exposición en línea usando localhost.run
Alternativa sin autenticación a ngrok
"""

import os
import sys
import http.server
import socketserver
import webbrowser
from pathlib import Path

# Cambiar al directorio de la aplicación
script_dir = Path(__file__).parent
app_dir = script_dir / 'bitacora-digital-umsnh'
os.chdir(app_dir)

PORT = 8000
HANDLER = http.server.SimpleHTTPRequestHandler

def main():
    """Inicia servidor local"""
    
    print("🚀 Iniciando servidor HTTP en puerto 8000...")
    print("📁 Directorio: " + str(Path.cwd()))
    print()
    
    try:
        # Crear servidor
        httpd = socketserver.TCPServer(("", PORT), HANDLER)
        
        print(f"✅ Servidor local: http://localhost:{PORT}")
        print()
        
        # Abrir en navegador local
        print("🔗 Abriendo en navegador...")
        webbrowser.open(f"http://localhost:{PORT}")
        
        print("\n" + "="*60)
        print("🌐 PARA ACCESO EN LÍNEA (sin autenticación):")
        print("="*60)
        print("\n📝 Opción 1: localhost.run (Recomendado)")
        print("   En otra terminal Windows (PowerShell):")
        print("   ssh -R 80:localhost:8000 localhost.run")
        print()
        print("📝 Opción 2: Solicitar URL dinámica a localhost.run")
        print("   - Abre: https://localhost.run/")
        print()
        print("💡 Presiona Ctrl+C para detener el servidor")
        print("="*60 + "\n")
        
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
