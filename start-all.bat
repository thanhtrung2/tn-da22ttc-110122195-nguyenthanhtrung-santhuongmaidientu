@echo off
REM ============================================================
REM Khoi dong Node.js backend (CMD)
REM Cach dung: start-all.bat
REM ============================================================

setlocal

set "BE_DIR=%ROOT%backend"

echo ============================================================
echo   Khoi dong he thong Vipo (Node.js)
echo ============================================================

start "Vipo-Node" cmd /k "cd /d %BE_DIR% && node server.js"

echo.
echo Backend dang chay tai http://127.0.0.1:3000
echo.
echo Dong cua so terminal de tat service.
pause
