@echo off
setlocal

set PROJECT_PATH=/mnt/c/Users/uezey/Desktop/Personal Stuff/Programming/Web Development/Claude/YISUTravelFrontend

if "%~1"=="" (
  wsl.exe -- bash -lc "cd '%PROJECT_PATH%' && npm run deploy"
) else (
  wsl.exe -d %~1 -- bash -lc "cd '%PROJECT_PATH%' && npm run deploy"
)

endlocal
