# Script para descargar cloudflared en Windows
Write-Host "📥 Descargando cloudflared..." -ForegroundColor Cyan

$url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
$output = 'cloudflared.exe'

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
(New-Object System.Net.WebClient).DownloadFile($url, $output)

if (Test-Path $output) {
    Write-Host "✅ cloudflared descargado exitosamente" -ForegroundColor Green
    Write-Host "📝 Ejecutable: $PWD\$output"
} else {
    Write-Host "❌ Error en descarga" -ForegroundColor Red
    exit 1
}
