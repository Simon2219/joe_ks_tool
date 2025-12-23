# Customer Support Tool

A comprehensive web-based customer support application with User Management, Ticket System, and Quality Management.

## 🚀 Quick Start

### Windows
```batch
Double-click: start.bat
```

### Command Line
```bash
npm install
npm start
```

Then open your browser to: **http://localhost:3000**

## 🔐 Default Login

- **Username:** `admin`
- **Password:** `admin123`

⚠️ Change this password after first login!

---

## Features

### 1. User Management
- Create, edit, delete users
- Role-based access control
- User status management (active/inactive)
- Search and filter users
- Export to CSV/JSON

### 2. Ticket System
- Full ticket lifecycle (New → Open → In Progress → Pending → Resolved → Closed)
- Priority levels (Critical, High, Medium, Low)
- Categories (General, Technical, Billing, Sales, Complaint, Feedback)
- Ticket assignment
- Comments and history tracking
- SLA management with auto-due dates

### 3. Quality Management
- Multi-category weighted evaluations
- Criteria-based scoring
- Pass/fail determination
- Coaching notes
- Agent performance tracking

### 4. Role-Based Access Control
- Predefined roles: Administrator, Supervisor, QA Analyst, Agent
- Custom role creation
- Fine-grained permissions (30+)

---

## Project Structure

```
customer-support-tool/
├── server.js              # Express server entry point
├── start.bat              # Windows quick-start script
├── package.json           # Dependencies
├── src/
│   ├── server/            # Backend
│   │   ├── routes/        # API endpoints
│   │   ├── database/      # Data layer
│   │   └── middleware/    # Auth middleware
│   └── renderer/          # Frontend
│       ├── index.html     # Main page
│       ├── styles/        # CSS
│       └── js/            # JavaScript
└── data/                  # Local data storage (auto-created)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets |
| GET | `/api/tickets/:id` | Get ticket |
| POST | `/api/tickets` | Create ticket |
| PUT | `/api/tickets/:id` | Update ticket |
| PUT | `/api/tickets/:id/status` | Change status |
| PUT | `/api/tickets/:id/assign` | Assign ticket |
| DELETE | `/api/tickets/:id` | Delete ticket |
| GET | `/api/tickets/:id/comments` | Get comments |
| POST | `/api/tickets/:id/comments` | Add comment |

### Quality
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quality` | List reports |
| GET | `/api/quality/:id` | Get report |
| POST | `/api/quality` | Create evaluation |
| PUT | `/api/quality/:id` | Update evaluation |
| DELETE | `/api/quality/:id` | Delete evaluation |
| GET | `/api/quality/categories` | Get categories |

### Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List roles |
| POST | `/api/roles` | Create role |
| PUT | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |
| GET | `/api/roles/permissions` | Get all permissions |

---

## Permissions

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
| `admin_access` | Full admin access |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Focus search |
| `Ctrl + R` | Refresh view |
| `Escape` | Close modal |

---

## System Requirements

- **Node.js:** Version 18 or higher
- **Browser:** Chrome, Firefox, Edge, or Safari
- **RAM:** 512MB minimum
- **Disk:** 100MB

---

## License

MIT License
