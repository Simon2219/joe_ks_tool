/**
 * Teams Routes - Unified Team Management
 * Handles team CRUD and team-specific permissions
 */

const express = require('express');
const router = express.Router();

const { TeamsSystem, RoleSystem } = require('../database');
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/teams - Get all teams
 */
router.get('/', requirePermission('teams_view'), (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const teams = includeInactive ? TeamsSystem.getAllIncludingInactive() : TeamsSystem.getAll();
        
        // Add member counts using user_teams table
        const teamsWithStats = teams.map(team => ({
            ...team,
            memberCount: TeamsSystem.getTeamMemberCount(team.id)
        }));
        
        res.json({ success: true, teams: teamsWithStats });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch teams' });
    }
});

/**
 * GET /api/teams/:id - Get team by ID
 */
router.get('/:id', requirePermission('teams_view'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        // Include additional data (no permissions - roles handle permissions)
        team.memberCount = TeamsSystem.getTeamMemberCount(team.id);
        team.statistics = TeamsSystem.getStatistics(team.id);
        
        res.json({ success: true, team });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team' });
    }
});

/**
 * GET /api/teams/:id/members - Get team members (legacy - redirects to team-members)
 */
router.get('/:id/members', requirePermission('teams_view'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        // Use new team-members method that uses user_teams table
        const members = TeamsSystem.getTeamMembers(req.params.id);
        res.json({ success: true, members });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team members' });
    }
});

/**
 * POST /api/teams - Create team
 */
router.post('/', requirePermission('teams_create'), (req, res) => {
    try {
        const { name, teamCode, description, color, isActive, sortOrder } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Team name is required' });
        }
        
        // Check for duplicate code
        if (teamCode && TeamsSystem.getByCode(teamCode)) {
            return res.status(400).json({ success: false, error: 'Team code already exists' });
        }
        
        const team = TeamsSystem.create({ name, teamCode, description, color, isActive, sortOrder });
        res.status(201).json({ success: true, team });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ success: false, error: 'Failed to create team' });
    }
});

/**
 * PUT /api/teams/:id - Update team
 */
router.put('/:id', requirePermission('teams_edit'), (req, res) => {
    try {
        const existing = TeamsSystem.getById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        // Check for duplicate code if changed
        if (req.body.teamCode && req.body.teamCode !== existing.team_code) {
            if (TeamsSystem.getByCode(req.body.teamCode)) {
                return res.status(400).json({ success: false, error: 'Team code already exists' });
            }
        }
        
        const team = TeamsSystem.update(req.params.id, req.body);
        res.json({ success: true, team });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ success: false, error: 'Failed to update team' });
    }
});

/**
 * DELETE /api/teams/:id - Delete team
 */
router.delete('/:id', requirePermission('teams_delete'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        TeamsSystem.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete team error:', error);
        // Check if error is about existing users
        if (error.message?.includes('assigned users')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to delete team' });
    }
});

/**
 * GET /api/teams/:id/statistics - Get team statistics
 */
router.get('/:id/statistics', requirePermission('teams_view'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const statistics = TeamsSystem.getStatistics(req.params.id);
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get team statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team statistics' });
    }
});

/**
 * GET /api/teams/:id/team-members - Get team members (via user_teams)
 */
router.get('/:id/team-members', requirePermission('teams_view'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const members = TeamsSystem.getTeamMembers(req.params.id);
        res.json({ success: true, members });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team members' });
    }
});

/**
 * GET /api/teams/:id/available-users - Get users not in this team
 */
router.get('/:id/available-users', requirePermission('teams_edit'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const users = TeamsSystem.getAllUsersNotInTeam(req.params.id);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get available users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch available users' });
    }
});

/**
 * POST /api/teams/:id/add-user - Add a user to the team
 */
router.post('/:id/add-user', requirePermission('teams_edit'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const { userId, isSupervisor } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }
        
        TeamsSystem.addUserToTeam(userId, req.params.id, isSupervisor || false);
        const members = TeamsSystem.getTeamMembers(req.params.id);
        res.json({ success: true, members });
    } catch (error) {
        console.error('Add user to team error:', error);
        res.status(500).json({ success: false, error: 'Failed to add user to team' });
    }
});

/**
 * DELETE /api/teams/:id/remove-user/:userId - Remove a user from the team
 */
router.delete('/:id/remove-user/:userId', requirePermission('teams_edit'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        TeamsSystem.removeUserFromTeam(req.params.userId, req.params.id);
        const members = TeamsSystem.getTeamMembers(req.params.id);
        res.json({ success: true, members });
    } catch (error) {
        console.error('Remove user from team error:', error);
        res.status(500).json({ success: false, error: 'Failed to remove user from team' });
    }
});

/**
 * PUT /api/teams/:id/set-supervisor/:userId - Set/unset user as supervisor
 */
router.put('/:id/set-supervisor/:userId', requirePermission('teams_edit'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const { isSupervisor } = req.body;
        TeamsSystem.setUserSupervisorStatus(req.params.userId, req.params.id, isSupervisor);
        const members = TeamsSystem.getTeamMembers(req.params.id);
        res.json({ success: true, members });
    } catch (error) {
        console.error('Set supervisor status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update supervisor status' });
    }
});

/**
 * GET /api/teams/user/:userId/teams - Get teams for a specific user
 */
router.get('/user/:userId/teams', requirePermission('teams_view'), (req, res) => {
    try {
        const teams = TeamsSystem.getUserTeams(req.params.userId);
        res.json({ success: true, teams });
    } catch (error) {
        console.error('Get user teams error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user teams' });
    }
});

module.exports = router;
