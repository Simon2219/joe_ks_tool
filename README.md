# Customer Support Tool

A desktop application for customer support teams with User Management, Ticket System, Quality Management, and Integration capabilities.

## Quick Start

### 1. Install
```powershell
npm install
```

### 2. Configure (Stop the JWT Warning)
```powershell
Copy-Item config/local.json.example config/local.json
```

Edit `config/local.json` and set your JWT secret:
```json
{
  "security": {
    "jwtSecret": "your-random-secret-key-at-least-32-characters"
  }
}
```

### 3. Run
```powershell
npm start
```

Open http://localhost:3000

### 4. Login
- **Username:** `admin`
- **Password:** `admin123`

---

## 📖 Full Documentation

**See [SETUP.md](SETUP.md) for the complete setup guide including:**

- All configuration options
- Desktop app (Electron) setup
- Building installers
- Troubleshooting
- Feature explanations

---

## Features

| System | Description |
|--------|-------------|
| **Dashboard** | Overview statistics and activity |
| **UserSystem** | Create and manage users, assign roles |
| **TicketSystem** | Support ticket lifecycle management |
| **QualitySystem** | Agent performance evaluations |
| **RoleSystem** | Role-based access control |
| **IntegrationSystem** | SharePoint & JIRA connections |
| **SettingsSystem** | Application configuration |

---

## Project Structure

```
customer-support-tool/
├── config/
│   ├── Config.js           # Configuration loader
│   ├── default.json        # Default settings
│   └── local.json          # Your settings (create this)
├── electron/               # Desktop app files
├── src/
│   ├── server/            # Backend API
│   │   ├── database/      # SQLite database
│   │   ├── middleware/    # Authentication
│   │   ├── routes/        # API endpoints
│   │   └── services/      # Business logic
│   └── renderer/          # Frontend UI
├── data/                  # Database (auto-created)
├── server.js              # Entry point
├── SETUP.md               # Full setup guide
└── package.json
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Run web server |
| `npm run electron` | Run desktop app |
| `npm run build:win` | Build Windows installer |

---

## Requirements

- Node.js 18.x or 20.x LTS
- Windows 10/11, macOS, or Linux

---

## License

MIT
