@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 LTS from https://nodejs.org then run this file again.
 start "" "https://nodejs.org/en/download"
 pause
 exit /b 1
)
node local-test.js
pause
