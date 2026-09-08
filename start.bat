@echo off
title PhishTrace Server
cd /d "%~dp0server"

echo Starting PhishTrace...
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:3000"

node server.js
pause
