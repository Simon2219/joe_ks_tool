# Customer Support Tool

A comprehensive desktop application for customer support teams with User Management, Ticket System, Quality Management, and Integration capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## 🚀 Quick Start

### Option 1: Desktop App (Recommended)
```bash
npm install
npm run electron
```

### Option 2: Web Browser
```bash
npm install
npm start
# Open http://localhost:3000
```

### Windows Quick Start
Double-click `start.bat` to launch the server, then open your browser to `http://localhost:3000`.

## 🔐 Default Login

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

⚠️ **Change this password immediately after first login!**

---

## ✨ Features

### User Management
- ✅ Create, edit, delete users
- ✅ Role-based access control (RBAC)
- ✅ User status management (active/inactive)
- ✅ Search and filter
- ✅ Export to CSV/JSON

### Ticket System
- ✅ Full ticket lifecycle (New → Open → In Progress → Pending → Resolved → Closed)
- ✅ Priority levels (Critical, High, Medium, Low)
- ✅ Categories (General, Technical, Billing, Sales, Complaint, Feedback)
- ✅ Ticket assignment
- ✅ Comments and history tracking
- ✅ SLA management with auto-due dates

### Quality Management
- ✅ Multi-category weighted evaluations
- ✅ Criteria-based scoring
- ✅ Pass/fail determination
- ✅ Coaching notes
- ✅ Agent performance tracking

### Role-Based Access Control
- ✅ Predefined roles: Administrator, Supervisor, QA Analyst, Agent
- ✅ Custom role creation
- ✅ 27+ fine-grained permissions
- ✅ UI elements hidden based on permissions

### Security
- ✅ JWT authentication with refresh tokens
- ✅ Password hashing (bcrypt)
- ✅ Optional AES-256-GCM encryption for credentials
- ✅ Rate limiting
- ✅ Content Security Policy

### Integrations
- 🔌 Microsoft SharePoint (configured in Settings)
- 🔌 Atlassian JIRA (configured in Settings)

### Desktop App Features
- 🖥️ Native taskbar icon
- 🔔 System tray with quick actions
- ⌨️ Keyboard shortcuts
- 🚀 Auto-launch support
- 📦 Windows installer & portable versions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APPLICATION                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                Express Server (Node.js)               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │  │
│  │  │ REST API │  │ JWT Auth │  │ SQLite Database  │    │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↑↓                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Chromium (Frontend)                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ Dashboard   │  │ Tickets     │  │ Settings    │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Building for Production

### Windows Installer
```bash
npm run build:win
```
Creates `dist/Customer Support Tool-1.0.0-x64.exe`

### Portable Version
Included in Windows build as `dist/Customer Support Tool-1.0.0-portable.exe`

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

---

## 📋 Requirements

- **Node.js:** 18.0 or higher
- **npm:** 9.0 or higher
- **Disk Space:** 100MB minimum
- **RAM:** 512MB minimum

---

## 🔧 Configuration

See [SETUP.md](SETUP.md) for detailed configuration options including:
- Environment variables
- JWT secrets
- Encryption settings
- Integration setup

---

## 📁 Project Structure

```
customer-support-tool/
├── electron/           # Electron main process
├── src/
│   ├── server/         # Express backend
│   │   ├── database/   # SQLite models
│   │   ├── middleware/ # Authentication
│   │   ├── routes/     # API endpoints
│   │   └── services/   # Business logic
│   └── renderer/       # Frontend SPA
├── data/               # Database (auto-created)
├── server.js           # Server entry point
├── package.json
├── SETUP.md            # Setup guide
└── README.md
```

---

## 🛡️ Permissions

| Permission | Description |
|------------|-------------|
| `user_view` | View users |
| `user_create` | Create users |
| `user_edit` | Edit users |
| `user_delete` | Delete users |
| `ticket_view` | View own tickets |
| `ticket_view_all` | View all tickets |
| `ticket_create` | Create tickets |
| `ticket_edit` | Edit tickets |
| `ticket_delete` | Delete tickets |
| `ticket_assign` | Assign tickets |
| `quality_view` | View own evaluations |
| `quality_view_all` | View all evaluations |
| `quality_create` | Create evaluations |
| `quality_edit` | Edit evaluations |
| `quality_delete` | Delete evaluations |
| `role_view` | View roles |
| `role_create` | Create roles |
| `role_edit` | Edit roles |
| `role_delete` | Delete roles |
| `settings_view` | View settings |
| `settings_edit` | Edit settings |
| `admin_access` | Admin panel access |
| `integration_sharepoint` | SharePoint integration |
| `integration_jira` | JIRA integration |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Focus search |
| `Ctrl + R` | Refresh view |
| `Ctrl + 1` | Dashboard |
| `Ctrl + 2` | Tickets |
| `Ctrl + 3` | Users |
| `Ctrl + 4` | Quality |
| `Escape` | Close modal |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
