# Customer Support Tool - Complete Setup Guide

This guide covers **everything** you need to set up and run the Customer Support Tool.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Running the Application](#4-running-the-application)
5. [First Login](#5-first-login)
6. [System Features](#6-system-features)
7. [Building for Production](#7-building-for-production)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18.x or 20.x LTS | https://nodejs.org/ |
| npm | Comes with Node.js | - |

### Check Your Installation

Open PowerShell and run:

```powershell
node --version
npm --version
```

Both should show version numbers. If not, install Node.js first.

---

## 2. Installation

### Step 2.1: Clean Previous Installation (if any)

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force data -ErrorAction SilentlyContinue
```

### Step 2.2: Install Dependencies

```powershell
npm install
```

**Expected:** Installation completes with some warnings (safe to ignore).

---

## 3. Configuration

All configuration is done through JSON files - **no code changes needed**.

### Step 3.1: Create Your Local Configuration

```powershell
Copy-Item config/local.json.example config/local.json
```

### Step 3.2: Edit Configuration

Open `config/local.json` in any text editor and customize:

```json
{
  "server": {
    "port": 3000
  },
  
  "security": {
    "encryptionEnabled": true,
    "jwtSecret": "your-secret-key-here-make-it-long-and-random-at-least-32-characters"
  },
  
  "app": {
    "companyName": "Your Company Name"
  }
}
```

### Step 3.3: Generate a Secure JWT Secret

**Option A: Use PowerShell to generate:**

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Copy the output and paste it as your `jwtSecret` value.

**Option B: Use Node.js to generate:**

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option C: Use any random string** (at least 32 characters):

```
MySecretKey2024CustomerSupportToolProduction!@#$
```

### Complete Configuration Reference

Here's every setting you can configure in `config/local.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "corsOrigin": "*",
    "trustProxy": true
  },
  
  "security": {
    "encryptionEnabled": true,
    "jwtSecret": "your-secret-key-minimum-32-characters",
    "jwtAccessTokenExpiry": "15m",
    "jwtRefreshTokenExpiryDays": 7,
    "bcryptRounds": 10,
    "rateLimitMaxRequests": 100,
    "rateLimitWindowMs": 60000,
    "loginRateLimitMaxAttempts": 5,
    "loginRateLimitWindowMs": 60000
  },
  
  "database": {
    "path": "data/customer-support.db"
  },
  
  "users": {
    "defaultRole": "agent",
    "minPasswordLength": 8
  },
  
  "tickets": {
    "defaultPriority": "medium",
    "defaultStatus": "new",
    "slaEnabled": true,
    "slaDurations": {
      "critical": 2,
      "high": 8,
      "medium": 24,
      "low": 72
    }
  },
  
  "quality": {
    "passingScore": 80,
    "defaultWeight": 25
  },
  
  "integrations": {
    "sharepoint": {
      "enabled": false,
      "timeout": 30000
    },
    "jira": {
      "enabled": false,
      "timeout": 30000
    }
  },
  
  "logging": {
    "level": "info",
    "logRequests": true,
    "logErrors": true
  },
  
  "app": {
    "name": "Customer Support Tool",
    "companyName": "Your Company Name",
    "timezone": "UTC"
  }
}
```

### Configuration Settings Explained

| Setting | Default | Description |
|---------|---------|-------------|
| `server.port` | `3000` | Port the server runs on |
| `security.encryptionEnabled` | `true` | Encrypt integration credentials (SharePoint/JIRA passwords) |
| `security.jwtSecret` | auto-generated | **IMPORTANT:** Set this to stop the warning messages |
| `security.jwtAccessTokenExpiry` | `"15m"` | How long login sessions last before refresh |
| `security.jwtRefreshTokenExpiryDays` | `7` | Days before requiring re-login |
| `tickets.slaDurations.critical` | `2` | Hours until critical tickets are due |
| `tickets.slaDurations.high` | `8` | Hours until high priority tickets are due |
| `tickets.slaDurations.medium` | `24` | Hours until medium priority tickets are due |
| `tickets.slaDurations.low` | `72` | Hours until low priority tickets are due |
| `quality.passingScore` | `80` | Minimum score (%) to pass quality evaluation |
| `app.companyName` | `"Customer Support Agency"` | Your company name shown in the app |

---

## 4. Running the Application

### Option A: Web Browser Mode

```powershell
npm start
```

Then open your browser to: **http://localhost:3000**

### Option B: Desktop Application (Electron)

```powershell
npm run electron
```

This opens the app as a standalone desktop window.

### Option C: Windows Quick Start

Double-click `start.bat` in the project folder.

---

## 5. First Login

### Default Admin Credentials

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin123` |

### ⚠️ IMPORTANT: Change the Default Password!

1. Login with `admin` / `admin123`
2. Go to **SettingsSystem** (bottom of sidebar)
3. Enter current password: `admin123`
4. Enter new password (minimum 8 characters)
5. Confirm new password
6. Click **Change Password**

---

## 6. System Features

### 6.1 Dashboard
- Overview statistics for Users, Tickets, Quality
- Recent activity feed

### 6.2 UserSystem (User Management)
- Create, edit, delete users
- Assign roles to users
- Activate/deactivate accounts
- **Note:** Only Administrators can create new users

### 6.3 TicketSystem (Ticket Management)
- Create support tickets
- Assign tickets to agents
- Track ticket status: New → Open → In Progress → Pending → Resolved → Closed
- Set priority: Critical, High, Medium, Low
- Add comments and view history
- SLA tracking with automatic due dates

### 6.4 QualitySystem (Quality Evaluations)
- Create quality evaluations for agents
- Score by categories (Communication, Problem Resolution, etc.)
- Automatic pass/fail based on configurable passing score
- View evaluation history and statistics

### 6.5 RoleSystem (Roles & Permissions)
- View and manage roles
- Create custom roles
- Assign permissions to roles
- Default roles: Administrator, Supervisor, QA Analyst, Support Agent

### 6.6 IntegrationSystem (External Integrations)
- **SharePoint:** Connect to Microsoft SharePoint for file management
- **JIRA:** Connect to Atlassian JIRA for issue tracking
- Credentials are encrypted when `security.encryptionEnabled` is `true`

### 6.7 SettingsSystem (Settings)
- Change your password
- System settings (Admins only):
  - Company name
  - Timezone
  - QA passing score

---

## 7. Building for Production

### Build Windows Installer

```powershell
npm run build:win
```

**Output:** `dist/Customer Support Tool-1.0.0-x64.exe`

### Build Portable Version

Included automatically with Windows build:
`dist/Customer Support Tool-1.0.0-portable.exe`

### Build for macOS (requires Mac)

```bash
npm run build:mac
```

### Build for Linux

```bash
npm run build:linux
```

---

## 8. Troubleshooting

### Problem: "WARNING: No JWT_SECRET configured"

**Solution:** Add a JWT secret to your configuration.

1. Open `config/local.json`
2. Add the security section with a jwtSecret:

```json
{
  "security": {
    "jwtSecret": "your-secret-key-here-at-least-32-characters-long"
  }
}
```

3. Restart the server

---

### Problem: Port 3000 Already in Use

**Solution:** Change the port in configuration.

1. Open `config/local.json`
2. Add:

```json
{
  "server": {
    "port": 3001
  }
}
```

3. Restart and access http://localhost:3001

---

### Problem: DevTools Console Errors (Autofill.enable, language-mismatch)

**Solution:** These are Electron DevTools internal messages and can be **safely ignored**. They don't affect the application.

To hide them, don't open DevTools (F12) or close the DevTools panel.

---

### Problem: Database Reset Needed

**Solution:** Delete the data folder:

```powershell
Remove-Item -Recurse -Force data
npm start
```

This creates a fresh database with the default admin user.

---

### Problem: Module Not Found Errors

**Solution:** Reinstall dependencies:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

---

### Problem: Login Doesn't Work / Invalid Credentials

**Possible causes:**
1. Wrong username/password
2. Database corrupted

**Solution:**
- Default login: `admin` / `admin123`
- If that doesn't work, reset the database:

```powershell
Remove-Item -Recurse -Force data
npm start
```

---

### Problem: Encryption Key Lost

If you delete `data/.encryption-key` but keep the database, encrypted credentials (SharePoint/JIRA) cannot be decrypted.

**Solution:** 
1. Re-enter your integration credentials in IntegrationSystem
2. Or delete the entire `data` folder to start fresh

---

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start web server (browser access) |
| `npm run electron` | Start desktop application |
| `npm run build:win` | Build Windows installer |

### Important Files

| File/Folder | Purpose |
|-------------|---------|
| `config/local.json` | Your custom configuration |
| `config/default.json` | Default settings (don't edit) |
| `data/customer-support.db` | SQLite database |
| `data/.encryption-key` | Encryption key for credentials |

### Default Login

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

---

## Minimum Configuration for Production

Create `config/local.json` with at least:

```json
{
  "security": {
    "jwtSecret": "your-very-long-random-secret-key-at-least-32-characters"
  },
  "app": {
    "companyName": "Your Company Name"
  }
}
```

This stops the JWT warning and sets your company name.

---

## Support

If you encounter issues:

1. Check this troubleshooting section
2. Look at the console output for error messages
3. Ensure `config/local.json` is valid JSON (no trailing commas, proper quotes)
4. Try resetting: delete `data` folder and restart
