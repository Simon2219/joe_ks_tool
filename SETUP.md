# Customer Support Tool - Setup Guide

This guide will help you set up and run the Customer Support Tool on your system.

## Prerequisites

- **Node.js** version 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Windows 10/11** (for desktop app build)

## Quick Start (Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Application

**Option A: Web Server Only (Browser Access)**
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

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Available settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | auto-generated | Secret for JWT tokens |
| `ENCRYPTION_DISABLED` | `false` | Disable credential encryption |
| `ENCRYPTION_KEY` | auto-generated | Custom encryption key (64 hex chars) |

### Generating Secrets

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Building the Desktop App

### Windows Installer

```bash
npm run build:win
```

This creates:
- `dist/Customer Support Tool-1.0.0-x64.exe` - NSIS Installer
- `dist/Customer Support Tool-1.0.0-portable.exe` - Portable version

### Mac (requires macOS)

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
| `.encryption-key` | Encryption key (if auto-generated) |

### Backup

To backup your data:
```bash
cp -r data/ backup/
```

### Reset Database

To reset to fresh state:
```bash
rm -rf data/
npm start
```

---

## Security

### Encryption

By default, integration credentials (SharePoint, JIRA) are encrypted at rest using AES-256-GCM.

- Encryption key is auto-generated on first run
- Stored in `data/.encryption-key`
- **IMPORTANT:** Back up this key! If lost, you'll need to re-enter all integration credentials.

To disable encryption (for testing only):
```bash
ENCRYPTION_DISABLED=true npm start
```

### JWT Tokens

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens are automatically refreshed

### Permissions

The system uses role-based access control (RBAC):

| Role | Description |
|------|-------------|
| **Administrator** | Full access to all features |
| **Supervisor** | Team management, ticket oversight |
| **QA Analyst** | Quality evaluations |
| **Support Agent** | Ticket handling only |

---

## API Endpoints

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
| GET | `/api/users` | List all users |
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
| GET | `/api/quality` | List evaluations |
| POST | `/api/quality` | Create evaluation |
| GET | `/api/quality/categories` | List categories |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List roles |
| POST | `/api/roles` | Create role |
| GET | `/api/roles/permissions` | All permissions |

---

## Integrations

### SharePoint

1. Go to **Settings** → **Integrations**
2. Enter SharePoint credentials:
   - Site URL
   - Tenant ID (Azure AD)
   - Client ID (App Registration)
   - Client Secret

### JIRA

1. Go to **Settings** → **Integrations**
2. Enter JIRA credentials:
   - Base URL (e.g., `https://company.atlassian.net`)
   - Email
   - API Token ([Generate here](https://id.atlassian.com/manage-profile/security/api-tokens))

---

## Troubleshooting

### "Port 3000 is already in use"

Change the port:
```bash
PORT=3001 npm start
```

### "Module not found" errors

Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### SQLite errors on Windows

Install build tools:
```bash
npm install --global windows-build-tools
```

### Electron app won't start

Make sure the server can start first:
```bash
npm start
```

If that works, try rebuilding Electron deps:
```bash
npm run postinstall
```

---

## Development

### Project Structure

```
customer-support-tool/
├── electron/           # Electron main process
│   ├── main.js         # Main entry point
│   └── preload.js      # Preload script
├── src/
│   ├── server/         # Backend (Express)
│   │   ├── database/   # SQLite models
│   │   ├── middleware/ # Auth middleware
│   │   ├── routes/     # API routes
│   │   └── services/   # Business logic
│   └── renderer/       # Frontend
│       ├── js/         # JavaScript
│       ├── styles/     # CSS
│       └── index.html  # Main page
├── data/               # Database (gitignored)
├── server.js           # Server entry point
└── package.json
```

### Running in Development

```bash
# Terminal 1: Start server with auto-reload
npm run dev

# Terminal 2: Start Electron (if needed)
npm run electron
```

### Adding New Permissions

1. Add to `src/server/database/seed.js` in `DEFAULT_PERMISSIONS`
2. Add to `src/renderer/js/utils/permissions.js` in `getPermissionName()`
3. Use in routes with `requirePermission('your_permission')`

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review the console for error messages
- Check `data/` directory exists and is writable

---

## License

MIT License
