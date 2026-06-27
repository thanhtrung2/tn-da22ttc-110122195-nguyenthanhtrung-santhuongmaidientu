# ===========================================================
# Script khoi dong Node.js Backend server (port 3000)
# PowerShell version (Windows)
# Cach dung: .\start-all.ps1
# ===========================================================

$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$beDir = Join-Path $root "backend"

Write-Host "Starting Node.js backend on port 3000..." -ForegroundColor Cyan
$nodeJob = Start-Job -ScriptBlock {
    Set-Location $using:beDir
    node server.js
} -Name "node_backend"

Write-Host ""
Write-Host "Da khoi dong backend" -ForegroundColor Green
Write-Host "   Backend: http://127.0.0.1:3000"
Write-Host ""
Write-Host "Lenh huu ich:" -ForegroundColor Yellow
Write-Host "   Xem log Node:  Receive-Job -Name node_backend -Keep"
Write-Host "   Dung tat ca:   Stop-Job node_backend; Remove-Job node_backend"
Write-Host ""

while ($true) {
    Start-Sleep -Seconds 3
    Receive-Job -Name node_backend -Keep 2>$null | ForEach-Object { Write-Host "[NODE] $_" -ForegroundColor Yellow }
}
