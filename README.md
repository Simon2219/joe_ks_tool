# Customer Support Tool

A comprehensive Microsoft Desktop Application built with Electron.js for customer support agencies. This tool provides User Management, Ticket System, and Quality Management functionalities with role-based access control and integration capabilities.

## Features

### Core Modules

#### 1. User Management
- **CRUD Operations**: Create, Read, Update, Delete users
- **Role Assignment**: Assign roles with specific permissions
- **User Status**: Active/Inactive status management
- **Search & Filter**: Filter by role, status, or search by name/email
- **Export/Import**: Export users to CSV/JSON, import from JSON
- **User Statistics**: Dashboard with user metrics

#### 2. Ticket System
- **Ticket CRUD**: Full ticket lifecycle management
- **Status Workflow**: New → Open → In Progress → Pending → Resolved → Closed
- **Priority Levels**: Critical, High, Medium, Low
- **Categories**: General, Technical, Billing, Sales, Complaint, Feedback, Other
- **Assignment**: Assign tickets to agents
- **Comments**: Add internal comments to tickets
- **History Tracking**: Full audit trail of changes
- **SLA Management**: Automatic due date calculation based on priority
- **Search & Filter**: Filter by status, priority, assignee
- **Export**: Export tickets to CSV/JSON

#### 3. Quality Management
- **Quality Evaluations**: Create detailed quality assessments
- **Category Scoring**: Score agents across multiple categories
- **Weighted Scores**: Categories have configurable weights
- **Criteria-Based**: Each category has multiple scoring criteria
- **Agent Scorecards**: View agent performance over time
- **Team Statistics**: Overview of team quality metrics
- **Trend Analysis**: Track performance trends
- **Templates**: Create reusable evaluation templates
- **Export**: Export quality reports

### Administration

#### Role-Based Access Control
- **Predefined Roles**: Administrator, Supervisor, QA Analyst, Agent
- **Custom Roles**: Create roles with specific permissions
- **Permission Management**: Fine-grained access control
- **Admin Designation**: Mark roles as admin for full access

#### Settings
- **Account Settings**: Change password
- **System Settings**: Company name, timezone, QA passing score
- **Integration Settings**: Configure external services

### Integrations

#### Microsoft SharePoint
- **OAuth 2.0 Authentication**
- **List Operations**: CRUD for SharePoint lists
- **Document Management**: Upload/download documents
- **Search**: Search SharePoint content

#### Atlassian JIRA
- **API Token Authentication**
- **Project Management**: View JIRA projects
- **Issue Operations**: Create, update, transition issues
- **Ticket Sync**: Sync local tickets with JIRA
- **Comments**: Add comments to JIRA issues

## Technology Stack

- **Framework**: Electron.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js
- **Database**: JSON-based local storage
- **Authentication**: bcrypt.js for password hashing
- **API Integration**: Axios for HTTP requests

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd customer-support-tool
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the application**
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

### Build for Distribution
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Default Credentials

After first launch, use these credentials to login:
- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password after first login!

## Project Structure

```
customer-support-tool/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.js              # Main entry point
│   │   ├── preload.js           # Preload script for IPC
│   │   ├── database/            # Database layer
│   │   │   ├── dbInit.js        # Database initialization
│   │   │   └── dbService.js     # CRUD operations
│   │   └── ipc/                 # IPC handlers
│   │       ├── authHandlers.js
│   │       ├── userHandlers.js
│   │       ├── ticketHandlers.js
│   │       ├── qualityHandlers.js
│   │       ├── roleHandlers.js
│   │       └── settingsHandlers.js
│   ├── renderer/                # Frontend
│   │   ├── index.html           # Main HTML
│   │   ├── styles/              # CSS files
│   │   │   ├── main.css
│   │   │   ├── components.css
│   │   │   └── views.css
│   │   └── js/                  # JavaScript modules
│   │       ├── app.js           # Main application controller
│   │       ├── utils/           # Utilities
│   │       ├── components/      # Reusable components
│   │       └── views/           # View controllers
│   └── api/                     # External API integrations
│       ├── sharepoint/          # SharePoint integration
│       └── jira/                # JIRA integration
├── data/                        # Local data storage (auto-created)
├── assets/                      # Application assets
├── package.json
└── README.md
```

## API Documentation

### SharePoint Integration

```javascript
// Connect to SharePoint
await window.electronAPI.sharepoint.connect({
    siteUrl: 'https://yourtenant.sharepoint.com/sites/yoursite',
    tenantId: 'your-tenant-id',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret'
});

// Get lists
const lists = await window.electronAPI.sharepoint.getLists();

// Get list items
const items = await window.electronAPI.sharepoint.getListItems('ListName');

// Create list item
await window.electronAPI.sharepoint.createListItem('ListName', { Title: 'New Item' });

// Upload document
await window.electronAPI.sharepoint.uploadDocument('Documents', {
    name: 'file.pdf',
    content: fileBuffer
});
```

### JIRA Integration

```javascript
// Connect to JIRA
await window.electronAPI.jira.connect({
    baseUrl: 'https://yourcompany.atlassian.net',
    email: 'your-email@company.com',
    apiToken: 'your-api-token'
});

// Get projects
const projects = await window.electronAPI.jira.getProjects();

// Get issues
const issues = await window.electronAPI.jira.getIssues('PROJECT-KEY', {
    status: 'In Progress',
    maxResults: 50
});

// Create issue
await window.electronAPI.jira.createIssue('PROJECT-KEY', {
    summary: 'Issue title',
    description: 'Issue description',
    issueType: 'Task',
    priority: 'Medium'
});

// Sync tickets with JIRA
await window.electronAPI.jira.syncWithTickets();
```

## Permissions Reference

| Permission | Description |
|------------|-------------|
| `user_view` | View user list and details |
| `user_create` | Create new users |
| `user_edit` | Edit existing users |
| `user_delete` | Delete users |
| `user_export` | Export user data |
| `user_import` | Import user data |
| `ticket_view` | View own tickets |
| `ticket_view_all` | View all tickets |
| `ticket_create` | Create tickets |
| `ticket_edit` | Edit tickets |
| `ticket_delete` | Delete tickets |
| `ticket_assign` | Assign tickets |
| `ticket_bulk_update` | Bulk operations |
| `ticket_export` | Export tickets |
| `quality_view` | View own evaluations |
| `quality_view_all` | View all evaluations |
| `quality_create` | Create evaluations |
| `quality_edit` | Edit evaluations |
| `quality_delete` | Delete evaluations |
| `quality_manage_categories` | Manage QA categories |
| `quality_manage_templates` | Manage templates |
| `quality_export` | Export quality data |
| `role_view` | View roles |
| `role_create` | Create roles |
| `role_edit` | Edit roles |
| `role_delete` | Delete roles |
| `settings_view` | View settings |
| `settings_edit` | Edit settings |
| `admin_access` | Full admin access |
| `integration_sharepoint` | Use SharePoint |
| `integration_jira` | Use JIRA |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus global search |
| `Ctrl/Cmd + R` | Refresh current view |
| `Escape` | Close modal |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue in the repository or contact the development team.
