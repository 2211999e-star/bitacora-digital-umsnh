$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-Host "Sirviendo sitio estático desde: $root"
Write-Host "Abre http://127.0.0.1:$port/ en el navegador"
python -m http.server $port
