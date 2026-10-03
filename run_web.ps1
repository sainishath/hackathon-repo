$env:PYTHONPATH="src"
$env:PYTHONIOENCODING="utf-8"
Write-Host "Starting Institutional Procurement Compliance Web Engine on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
uvicorn procurement.api:app --host 127.0.0.1 --port 8000 --reload
