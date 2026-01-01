@echo off
title Customer Support Tool
echo.
echo ============================================
echo    Customer Support Tool - Launcher
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

:: Start the server
echo Starting server...
echo.
echo Once started, open your browser to:
echo    http://localhost:3000
echo.
echo Default login:
echo    Username: admin
echo    Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo ============================================
echo.

node server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Server exited with error code %ERRORLEVEL%
    pause
)
