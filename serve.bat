@echo off
cd /d "%~dp0"
echo Sirviendo sitio estático desde %cd%
echo Abre http://127.0.0.1:8000/ en el navegador
python -m http.server 8000
