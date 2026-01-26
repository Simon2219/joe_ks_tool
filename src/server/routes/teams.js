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
        
        // Add member counts
        const teamsWithStats = teams.map(team => ({
            ...team,
            memberCount: TeamsSystem.getMemberCount(team.id)
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
        
        // Include additional data
        team.memberCount = TeamsSystem.getMemberCount(team.id);
        team.permissions = TeamsSystem.getPermissions(team.id);
        team.statistics = TeamsSystem.getStatistics(team.id);
        
        res.json({ success: true, team });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team' });
    }
});

/**
 * GET /api/teams/:id/members - Get team members
 */
router.get('/:id/members', requirePermission('teams_view'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const members = TeamsSystem.getMembers(req.params.id);
        res.json({ success: true, members });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team members' });
    }
});

/**
 * GET /api/teams/:id/permissions - Get team permissions
 */
router.get('/:id/permissions', requirePermission('teams_view'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const permissions = TeamsSystem.getPermissions(req.params.id);
        res.json({ success: true, permissions });
    } catch (error) {
        console.error('Get team permissions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team permissions' });
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
 * PUT /api/teams/:id/permissions - Set team permissions
 */
router.put('/:id/permissions', requirePermission('teams_permissions_manage'), (req, res) => {
    try {
        const team = TeamsSystem.getById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        
        const { permissions } = req.body;
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, error: 'Permissions must be an array' });
        }
        
        const updatedPermissions = TeamsSystem.setPermissions(req.params.id, permissions);
        res.json({ success: true, permissions: updatedPermissions });
    } catch (error) {
        console.error('Set team permissions error:', error);
        res.status(500).json({ success: false, error: 'Failed to set team permissions' });
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

module.exports = router;
