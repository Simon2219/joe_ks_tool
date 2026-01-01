# Customer Support Tool - Setup Guide

Complete setup guide for installing, configuring, and running the Customer Support Tool.

## Prerequisites

- **Node.js** version 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Windows 10/11**, macOS, or Linux

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Application

**Option A: Web Server (Browser Access)**
```bash
npm start
```
Then open `http://localhost:3000` in your browser.

**Option B: Desktop App (Electron)**
```bash
npm run electron
```

### 3. Login

Default credentials:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change this password immediately after first login!**

---

## Configuration

All configuration is managed through JSON files in the `config/` directory.

### Configuration Files

| File | Purpose |
|------|---------|
| `config/default.json` | Default settings (do not modify) |
| `config/local.json` | Your overrides (gitignored) |

### Creating Your Configuration

```bash
cp config/local.json.example config/local.json
```

Then edit `config/local.json` with your settings.

### Available Settings

#### Server Settings
```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "corsOrigin": "*",
    "trustProxy": true
  }
}
```

#### Security Settings
```json
{
  "security": {
    "encryptionEnabled": true,
    "jwtAccessTokenExpiry": "15m",
    "jwtRefreshTokenExpiryDays": 7,
    "bcryptRounds": 10,
    "rateLimitMaxRequests": 100,
    "rateLimitWindowMs": 60000,
    "loginRateLimitMaxAttempts": 5,
    "loginRateLimitWindowMs": 60000
  }
}
```

| Setting | Description |
|---------|-------------|
| `encryptionEnabled` | Enable/disable AES-256 encryption for credentials |
| `jwtAccessTokenExpiry` | Access token lifetime (e.g., "15m", "1h") |
| `jwtRefreshTokenExpiryDays` | Refresh token lifetime in days |
| `bcryptRounds` | Password hashing strength (10-12 recommended) |
| `rateLimitMaxRequests` | Max API requests per window |
| `loginRateLimitMaxAttempts` | Max login attempts before lockout |

#### Ticket Settings
```json
{
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
  }
}
```

SLA durations are in **hours**.

#### Quality Settings
```json
{
  "quality": {
    "passingScore": 80,
    "defaultWeight": 25
  }
}
```

#### Application Settings
```json
{
  "app": {
    "name": "Customer Support Tool",
    "companyName": "Your Company Name",
    "timezone": "UTC"
  }
}
```

### Environment Variables

For sensitive values (like JWT secrets), use environment variables:

```bash
# .env file
JWT_SECRET=your-secret-key-here
PORT=3000
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Runtime Configuration

Administrators can also modify some settings through the UI:
1. Go to **SettingsSystem**
2. Click **System Configuration**
3. Modify settings and save

---

## Building the Desktop App

### Windows

```bash
npm run build:win
```

Creates:
- `dist/Customer Support Tool-1.0.0-x64.exe` (Installer)
- `dist/Customer Support Tool-1.0.0-portable.exe` (Portable)

### macOS

```bash
npm run build:mac
```

### Linux

```bash
npm run build:linux
```

---

## Data Storage

All data is stored in the `data/` directory:

| File | Description |
|------|-------------|
| `customer-support.db` | SQLite database |
| `.encryption-key` | Encryption key (auto-generated) |

### Backup

```bash
cp -r data/ backup/
```

### Reset Database

```bash
rm -rf data/
npm start
```

---

## Security Features

### Encryption

Integration credentials are encrypted at rest using AES-256-GCM.

**To disable encryption** (testing only):
```json
// config/local.json
{
  "security": {
    "encryptionEnabled": false
  }
}
```

### JWT Authentication

- Access tokens: Short-lived (default 15 minutes)
- Refresh tokens: Long-lived (default 7 days)
- Automatic token refresh

### Rate Limiting

- General API: 100 requests/minute
- Login: 5 attempts/minute

### Permissions

| Role | Description |
|------|-------------|
| Administrator | Full access |
| Supervisor | Team management |
| QA Analyst | Quality evaluations |
| Support Agent | Ticket handling |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh tokens |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/change-password` | Change password |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets |
| POST | `/api/tickets` | Create ticket |
| PUT | `/api/tickets/:id` | Update ticket |
| PUT | `/api/tickets/:id/status` | Change status |
| PUT | `/api/tickets/:id/assign` | Assign ticket |

### Quality

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quality/reports` | List reports |
| POST | `/api/quality/reports` | Create report |
| GET | `/api/quality/categories` | List categories |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/config` | Get system config |
| PUT | `/api/settings/config` | Update config |
| POST | `/api/settings/config/reload` | Reload config |

---

## Integrations

### SharePoint

1. Go to **IntegrationSystem**
2. Enter credentials:
   - Site URL
   - Tenant ID
   - Client ID
   - Client Secret

### JIRA

1. Go to **IntegrationSystem**
2. Enter credentials:
   - Base URL
   - Email
   - API Token ([Generate](https://id.atlassian.com/manage-profile/security/api-tokens))

---

## Troubleshooting

### Port Already in Use

Change the port in `config/local.json`:
```json
{
  "server": {
    "port": 3001
  }
}
```

### Module Not Found

```bash
rm -rf node_modules
npm install
```

### SQLite Errors (Windows)

```bash
npm install --global windows-build-tools
```

### Configuration Not Loading

1. Check JSON syntax in config files
2. Restart the server
3. Check console for errors

---

## Project Structure

```
customer-support-tool/
├── config/
│   ├── Config.js           # Configuration loader
│   ├── default.json        # Default settings
│   ├── local.json          # Your overrides (gitignored)
│   └── local.json.example  # Example overrides
├── electron/
│   ├── main.js             # Electron main process
│   └── preload.js          # Preload script
├── src/
│   ├── server/
│   │   ├── database/
│   │   │   ├── Database.js # All database operations
│   │   │   └── index.js
│   │   ├── middleware/
│   │   │   └── auth.js     # Authentication
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── renderer/           # Frontend
├── data/                   # Database (auto-created)
├── server.js               # Server entry point
└── package.json
```

---

## License

MIT License
