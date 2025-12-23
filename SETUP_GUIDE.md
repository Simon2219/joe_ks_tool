# Customer Support Tool - Setup Guide for Windows

## Quick Start Options

### Option A: Double-click to Run (Easiest)
1. Double-click `start.bat` in the project folder
2. The application should open

---

### Option B: Command Line

Open **Command Prompt** (not PowerShell) in the project folder and try these in order:

```batch
:: Method 1 - Using npx
npx electron .

:: Method 2 - Direct path
node_modules\.bin\electron .

:: Method 3 - Full path to electron.exe
node_modules\electron\dist\electron.exe .
```

---

### Option C: Install Electron Globally

If nothing works, install Electron globally:

```batch
npm install -g electron
```

Then run:
```batch
electron .
```

---

## Troubleshooting

### Error: "electron is not recognized"

This means Windows can't find the Electron executable. Solutions:

1. **Reinstall dependencies:**
   ```batch
   rd /s /q node_modules
   del package-lock.json
   npm install
   ```

2. **Install Electron explicitly:**
   ```batch
   npm install electron --save-dev
   ```

3. **Check if Electron exists:**
   ```batch
   dir node_modules\.bin\electron*
   ```
   You should see `electron.cmd`

### Error: "Cannot find module"

Run:
```batch
npm install
```

### The app opens but shows a white/blank screen

1. Press `Ctrl+Shift+I` to open Developer Tools
2. Check the Console tab for errors
3. Usually means a file path issue - report the error

---

## Building a Standalone .EXE

Once the app runs correctly, you can build a standalone installer:

```batch
npm run build:win
```

This creates an installer in the `dist` folder that:
- Doesn't require Node.js or Electron installed
- Can be distributed to any Windows computer
- Installs like a normal Windows application

---

## System Requirements

- **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
- **Windows**: 10 or 11
- **RAM**: 4GB minimum
- **Disk**: 500MB for development, 200MB for built app

### Check your Node.js version:
```batch
node --version
```

Should show `v18.x.x` or higher.

---

## Project Structure

```
customer-support-tool/
├── start.bat           ← Double-click this to run!
├── package.json        ← Project configuration
├── node_modules/       ← Dependencies (created by npm install)
├── src/
│   ├── main/          ← Backend (Electron main process)
│   └── renderer/      ← Frontend (HTML, CSS, JavaScript)
├── data/              ← Your data (created on first run)
└── dist/              ← Built installer (after npm run build:win)
```

---

## Default Login

- **Username:** `admin`
- **Password:** `admin123`

⚠️ Change this password after first login!

---

## Still Not Working?

If you absolutely cannot get Electron to run, I can convert this to a **web-based application** that runs with just Node.js and opens in your browser. Let me know!
