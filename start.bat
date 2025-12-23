@echo off
echo Starting Customer Support Tool...
echo.

:: Change to the script's directory
cd /d "%~dp0"

:: Try different methods to run Electron

:: Method 1: Direct path to electron in node_modules
if exist "node_modules\.bin\electron.cmd" (
    echo Found Electron in node_modules...
    node_modules\.bin\electron.cmd .
    goto :end
)

:: Method 2: Using npx
echo Trying npx...
npx electron .
if %errorlevel% equ 0 goto :end

:: Method 3: Direct node_modules path
echo Trying direct node_modules path...
"node_modules\electron\dist\electron.exe" .
if %errorlevel% equ 0 goto :end

echo.
echo ============================================
echo ERROR: Could not start Electron
echo ============================================
echo.
echo Please try these steps:
echo 1. Run: npm install electron --save-dev
echo 2. Run this batch file again
echo.
echo Or install Electron globally:
echo    npm install -g electron
echo    electron .
echo.
pause

:end
