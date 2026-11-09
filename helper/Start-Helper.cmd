@echo off
cd /d "%~dp0"
if exist "node.exe" (
  node.exe download-helper.mjs
) else (
  node download-helper.mjs
)
pause
