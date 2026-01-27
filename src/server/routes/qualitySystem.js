/**
 * Quality System v2 Routes
 * Comprehensive API for Quality Tasks, Checks, Evaluations, and Team Management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

const { QS, UserSystem, TeamsSystem } = require('../database');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');
const FileService = require('../services/fileService');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: FileService.getMaxFileSize() }
});

router.use(authenticate);

// ============================================
// TEAMS (Uses unified TeamsSystem)
// ============================================

/**
 * GET /api/qs/teams
 * Get all teams the user has access to for QS
 */
router.get('/teams', requirePermission('qs_view'), (req, res) => {
    try {
        let teams = QS.getAllTeams();
        
        // Filter based on user's team assignment (unless they can view all)
        if (!hasPermission(req.user, 'qs_tracking_view_all')) {
            const user = UserSystem.getById(req.user.id);
            if (user?.team_id) {
                teams = teams.filter(t => t.id === user.team_id);
            } else {
                // User has no team assigned and can't view all - show empty
                teams = [];
            }
        }
        
        res.json({ success: true, teams });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch teams' });
    }
});

/**
 * GET /api/qs/teams/:id
 * Get team by ID
 */
router.get('/teams/:id', requirePermission('qs_view'), (req, res) => {
    try {
        const team = QS.getTeamById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        res.json({ success: true, team });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team' });
    }
});

/**
 * GET /api/qs/teams/:id/agents
 * Get agents in a team (users assigned to this team)
 */
router.get('/teams/:id/agents', requirePermission('qs_view'), (req, res) => {
    try {
        const agents = TeamsSystem.getMembers(req.params.id);
        res.json({ success: true, agents });
    } catch (error) {
        console.error('Get team agents error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team agents' });
    }
});

/**
 * GET /api/qs/teams/:id/statistics
 * Get team statistics
 */
router.get('/teams/:id/statistics', requirePermission('qs_view'), (req, res) => {
    try {
        const statistics = QS.getTeamStatistics(req.params.id, req.query);
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get team statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// ============================================
// TASK CATEGORIES
// ============================================

/**
 * GET /api/qs/teams/:teamId/task-categories
 */
router.get('/teams/:teamId/task-categories', requirePermission('qs_tasks_view'), (req, res) => {
    try {
        const categories = QS.getTaskCategories(req.params.teamId);
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get task categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

/**
 * POST /api/qs/teams/:teamId/task-categories
 */
router.post('/teams/:teamId/task-categories', requirePermission('qs_categories_create'), (req, res) => {
    try {
        const category = QS.createTaskCategory(req.params.teamId, req.body);
        res.status(201).json({ success: true, category });
    } catch (error) {
        console.error('Create task category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

/**
 * PUT /api/qs/task-categories/:id
 */
router.put('/task-categories/:id', requirePermission('qs_categories_edit'), (req, res) => {
    try {
        const category = QS.updateTaskCategory(req.params.id, req.body);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error('Update task category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

/**
 * DELETE /api/qs/task-categories/:id
 */
router.delete('/task-categories/:id', requirePermission('qs_categories_delete'), (req, res) => {
    try {
        const result = QS.deleteTaskCategory(req.params.id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Delete task category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

// ============================================
// TASKS
// ============================================

/**
 * GET /api/qs/teams/:teamId/tasks
 */
router.get('/teams/:teamId/tasks', requirePermission('qs_tasks_view'), (req, res) => {
    try {
        const options = {
            includeArchived: req.query.includeArchived === 'true',
            includeInactive: req.query.includeInactive === 'true',
            categoryId: req.query.categoryId
        };
        const tasks = QS.getTasks(req.params.teamId, options);
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
    }
});

/**
 * GET /api/qs/tasks/:id
 */
router.get('/tasks/:id', requirePermission('qs_tasks_view'), (req, res) => {
    try {
        const task = QS.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        res.json({ success: true, task });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch task' });
    }
});

/**
 * POST /api/qs/teams/:teamId/tasks
 */
router.post('/teams/:teamId/tasks', requirePermission('qs_tasks_create'), (req, res) => {
    try {
        const task = QS.createTask(req.params.teamId, req.body, req.user.id);
        res.status(201).json({ success: true, task });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ success: false, error: 'Failed to create task' });
    }
});

/**
 * PUT /api/qs/tasks/:id
 */
router.put('/tasks/:id', requirePermission('qs_tasks_edit'), (req, res) => {
    try {
        const task = QS.updateTask(req.params.id, req.body);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        res.json({ success: true, task });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ success: false, error: 'Failed to update task' });
    }
});

/**
 * DELETE /api/qs/tasks/:id
 */
router.delete('/tasks/:id', requirePermission('qs_tasks_delete'), (req, res) => {
    try {
        const result = QS.deleteTask(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete task' });
    }
});

/**
 * PUT /api/qs/tasks/:id/archive
 */
router.put('/tasks/:id/archive', requirePermission('qs_tasks_delete'), (req, res) => {
    try {
        const task = QS.archiveTask(req.params.id);
        res.json({ success: true, task });
    } catch (error) {
        console.error('Archive task error:', error);
        res.status(500).json({ success: false, error: 'Failed to archive task' });
    }
});

/**
 * PUT /api/qs/tasks/:id/restore
 */
router.put('/tasks/:id/restore', requirePermission('qs_tasks_delete'), (req, res) => {
    try {
        const task = QS.restoreTask(req.params.id);
        res.json({ success: true, task });
    } catch (error) {
        console.error('Restore task error:', error);
        res.status(500).json({ success: false, error: 'Failed to restore task' });
    }
});

// ============================================
// CHECK CATEGORIES
// ============================================

/**
 * GET /api/qs/teams/:teamId/check-categories
 */
router.get('/teams/:teamId/check-categories', requirePermission('qs_checks_view'), (req, res) => {
    try {
        const categories = QS.getCheckCategories(req.params.teamId);
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get check categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

/**
 * POST /api/qs/teams/:teamId/check-categories
 */
router.post('/teams/:teamId/check-categories', requirePermission('qs_categories_create'), (req, res) => {
    try {
        const category = QS.createCheckCategory(req.params.teamId, req.body);
        res.status(201).json({ success: true, category });
    } catch (error) {
        console.error('Create check category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

/**
 * PUT /api/qs/check-categories/:id
 */
router.put('/check-categories/:id', requirePermission('qs_categories_edit'), (req, res) => {
    try {
        const category = QS.updateCheckCategory(req.params.id, req.body);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error('Update check category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

/**
 * DELETE /api/qs/check-categories/:id
 */
router.delete('/check-categories/:id', requirePermission('qs_categories_delete'), (req, res) => {
    try {
        const result = QS.deleteCheckCategory(req.params.id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Delete check category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

// ============================================
// CHECKS
// ============================================

/**
 * GET /api/qs/teams/:teamId/checks
 */
router.get('/teams/:teamId/checks', requirePermission('qs_checks_view'), (req, res) => {
    try {
        const options = {
            includeArchived: req.query.includeArchived === 'true',
            includeInactive: req.query.includeInactive === 'true',
            categoryId: req.query.categoryId,
            includeTasks: req.query.includeTasks === 'true'
        };
        const checks = QS.getChecks(req.params.teamId, options);
        res.json({ success: true, checks });
    } catch (error) {
        console.error('Get checks error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch checks' });
    }
});

/**
 * GET /api/qs/checks/:id
 */
router.get('/checks/:id', requirePermission('qs_checks_view'), (req, res) => {
    try {
        const includeTasks = req.query.includeTasks !== 'false';
        const check = QS.getCheckById(req.params.id, includeTasks);
        if (!check) {
            return res.status(404).json({ success: false, error: 'Check not found' });
        }
        res.json({ success: true, check });
    } catch (error) {
        console.error('Get check error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch check' });
    }
});

/**
 * POST /api/qs/teams/:teamId/checks
 */
router.post('/teams/:teamId/checks', requirePermission('qs_checks_create'), (req, res) => {
    try {
        const check = QS.createCheck(req.params.teamId, req.body, req.user.id);
        res.status(201).json({ success: true, check });
    } catch (error) {
        console.error('Create check error:', error);
        res.status(500).json({ success: false, error: 'Failed to create check' });
    }
});

/**
 * PUT /api/qs/checks/:id
 */
router.put('/checks/:id', requirePermission('qs_checks_edit'), (req, res) => {
    try {
        const check = QS.updateCheck(req.params.id, req.body);
        if (!check) {
            return res.status(404).json({ success: false, error: 'Check not found' });
        }
        res.json({ success: true, check });
    } catch (error) {
        console.error('Update check error:', error);
        res.status(500).json({ success: false, error: 'Failed to update check' });
    }
});

/**
 * DELETE /api/qs/checks/:id
 */
router.delete('/checks/:id', requirePermission('qs_checks_delete'), (req, res) => {
    try {
        const result = QS.deleteCheck(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete check error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete check' });
    }
});

/**
 * PUT /api/qs/checks/:id/archive
 */
router.put('/checks/:id/archive', requirePermission('qs_checks_delete'), (req, res) => {
    try {
        const check = QS.archiveCheck(req.params.id);
        res.json({ success: true, check });
    } catch (error) {
        console.error('Archive check error:', error);
        res.status(500).json({ success: false, error: 'Failed to archive check' });
    }
});

/**
 * PUT /api/qs/checks/:id/restore
 */
router.put('/checks/:id/restore', requirePermission('qs_checks_delete'), (req, res) => {
    try {
        const check = QS.restoreCheck(req.params.id);
        res.json({ success: true, check });
    } catch (error) {
        console.error('Restore check error:', error);
        res.status(500).json({ success: false, error: 'Failed to restore check' });
    }
});

// ============================================
// EVALUATIONS
// ============================================

/**
 * GET /api/qs/teams/:teamId/evaluations
 */
router.get('/teams/:teamId/evaluations', (req, res) => {
    try {
        // Check if user can view team results or only own
        const canViewTeam = hasPermission(req.user, 'qs_results_view_team');
        const canViewOwn = hasPermission(req.user, 'qs_results_view_own');
        
        if (!canViewTeam && !canViewOwn) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        
        const options = { ...req.query };
        
        // If can only view own, filter to user's evaluations
        if (!canViewTeam) {
            options.agentId = req.user.id;
        }
        
        const evaluations = QS.getEvaluations(req.params.teamId, options);
        res.json({ success: true, evaluations });
    } catch (error) {
        console.error('Get evaluations error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch evaluations' });
    }
});

/**
 * GET /api/qs/evaluations/:id
 */
router.get('/evaluations/:id', (req, res) => {
    try {
        const evaluation = QS.getEvaluationById(req.params.id, true);
        if (!evaluation) {
            return res.status(404).json({ success: false, error: 'Evaluation not found' });
        }
        
        // Check permissions
        const canViewTeam = hasPermission(req.user, 'qs_results_view_team');
        const isOwnResult = evaluation.agentId === req.user.id;
        
        if (!canViewTeam && !isOwnResult) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        
        // Hide supervisor notes if user doesn't have permission
        if (!hasPermission(req.user, 'qs_supervisor_notes_view') && !isOwnResult) {
            evaluation.supervisorNotes = null;
        }
        
        res.json({ success: true, evaluation });
    } catch (error) {
        console.error('Get evaluation error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch evaluation' });
    }
});

/**
 * POST /api/qs/teams/:teamId/evaluations
 * Create a new evaluation (start)
 */
router.post('/teams/:teamId/evaluations', requirePermission('qs_evaluate'), (req, res) => {
    try {
        const evaluation = QS.createEvaluation(req.params.teamId, req.body, req.user.id);
        res.status(201).json({ success: true, evaluation });
    } catch (error) {
        console.error('Create evaluation error:', error);
        res.status(500).json({ success: false, error: 'Failed to create evaluation' });
    }
});

/**
 * POST /api/qs/teams/:teamId/evaluations/random
 * Create a random evaluation
 */
router.post('/teams/:teamId/evaluations/random', requirePermission('qs_evaluate_random'), (req, res) => {
    try {
        const agent = QS.getRandomAgent(req.params.teamId, req.body.excludeRecentDays || 7);
        if (!agent) {
            return res.status(400).json({ success: false, error: 'No eligible agents found' });
        }
        
        const evaluation = QS.createEvaluation(req.params.teamId, {
            ...req.body,
            agentId: agent.id
        }, req.user.id);
        
        res.status(201).json({ success: true, evaluation, agent });
    } catch (error) {
        console.error('Create random evaluation error:', error);
        res.status(500).json({ success: false, error: 'Failed to create random evaluation' });
    }
});

/**
 * PUT /api/qs/evaluations/:id/submit
 * Submit/complete an evaluation
 */
router.put('/evaluations/:id/submit', requirePermission('qs_evaluate'), (req, res) => {
    try {
        const evaluation = QS.getEvaluationById(req.params.id, false);
        if (!evaluation) {
            return res.status(404).json({ success: false, error: 'Evaluation not found' });
        }
        
        // Check if user is the evaluator
        if (evaluation.evaluatorId !== req.user.id && !req.user.role?.isAdmin) {
            return res.status(403).json({ success: false, error: 'Only the evaluator can submit' });
        }
        
        const result = QS.submitEvaluation(req.params.id, req.body);
        res.json({ success: true, evaluation: result });
    } catch (error) {
        console.error('Submit evaluation error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit evaluation' });
    }
});

/**
 * PUT /api/qs/evaluations/:id/notes
 * Update supervisor notes
 */
router.put('/evaluations/:id/notes', requirePermission('qs_supervisor_notes_view'), (req, res) => {
    try {
        const evaluation = QS.updateEvaluationNotes(req.params.id, req.body.notes);
        res.json({ success: true, evaluation });
    } catch (error) {
        console.error('Update evaluation notes error:', error);
        res.status(500).json({ success: false, error: 'Failed to update notes' });
    }
});

/**
 * DELETE /api/qs/evaluations/:id
 */
router.delete('/evaluations/:id', requirePermission('qs_results_delete'), (req, res) => {
    try {
        const result = QS.deleteEvaluation(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete evaluation error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete evaluation' });
    }
});

// ============================================
// EVIDENCE
// ============================================

/**
 * POST /api/qs/evaluations/:id/evidence
 * Upload evidence for an evaluation
 */
router.post('/evaluations/:id/evidence', requirePermission('qs_evaluate'), upload.single('file'), async (req, res) => {
    try {
        const evaluation = QS.getEvaluationById(req.params.id, false);
        if (!evaluation) {
            return res.status(404).json({ success: false, error: 'Evaluation not found' });
        }
        
        let evidenceData = {
            evidenceType: req.body.evidenceType || 'text',
            evidenceText: req.body.evidenceText || '',
            url: req.body.url || ''
        };
        
        // Handle file upload
        if (req.file) {
            const uploadResult = await FileService.upload(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'evidence'
            );
            
            if (!uploadResult.success) {
                return res.status(400).json({ success: false, error: uploadResult.error });
            }
            
            evidenceData.filePath = uploadResult.file.filePath;
            evidenceData.fileName = uploadResult.file.originalName;
            evidenceData.evidenceType = FileService.isImage(req.file.mimetype) ? 'image' : 'file';
        }
        
        const evidenceId = QS.addEvaluationEvidence(req.params.id, evidenceData, req.body.answerId || null);
        res.status(201).json({ success: true, evidenceId });
    } catch (error) {
        console.error('Upload evidence error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload evidence' });
    }
});

/**
 * DELETE /api/qs/evidence/:id
 */
router.delete('/evidence/:id', requirePermission('qs_evaluate'), async (req, res) => {
    try {
        const result = QS.deleteEvaluationEvidence(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete evidence error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete evidence' });
    }
});

// ============================================
// QUOTAS
// ============================================

/**
 * GET /api/qs/teams/:teamId/quotas
 */
router.get('/teams/:teamId/quotas', requirePermission('qs_view'), (req, res) => {
    try {
        const quotas = QS.getQuotas(req.params.teamId);
        res.json({ success: true, quotas });
    } catch (error) {
        console.error('Get quotas error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quotas' });
    }
});

/**
 * PUT /api/qs/teams/:teamId/quotas
 */
router.put('/teams/:teamId/quotas', requirePermission('qs_quotas_manage'), (req, res) => {
    try {
        const quotas = QS.setQuota(req.params.teamId, req.body);
        res.json({ success: true, quotas });
    } catch (error) {
        console.error('Set quota error:', error);
        res.status(500).json({ success: false, error: 'Failed to set quota' });
    }
});

// ============================================
// SETTINGS
// ============================================

/**
 * GET /api/qs/teams/:teamId/settings
 */
router.get('/teams/:teamId/settings', requirePermission('qs_view'), (req, res) => {
    try {
        // Get all settings at once from the JSON column
        const storedSettings = QS.getTeamSettings(req.params.teamId);
        
        // Merge with defaults
        const settings = {
            passingScore: storedSettings.passingScore || '80',
            defaultScoringType: storedSettings.defaultScoringType || 'points',
            defaultScaleSize: storedSettings.defaultScaleSize || '5',
            defaultInteractionChannel: storedSettings.defaultInteractionChannel || 'ticket'
        };
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

/**
 * PUT /api/qs/teams/:teamId/settings
 */
router.put('/teams/:teamId/settings', requirePermission('qs_settings_manage'), (req, res) => {
    try {
        // Set all settings at once using the batch method
        QS.setTeamSettings(req.params.teamId, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});

// ============================================
// GLOBAL TRACKING
// ============================================

/**
 * GET /api/qs/tracking/evaluations
 * Get all evaluations across teams (for tracking view)
 */
router.get('/tracking/evaluations', requirePermission('qs_tracking_view'), (req, res) => {
    try {
        let teamIds = null;
        
        // Filter by accessible teams if not admin
        if (!hasPermission(req.user, 'qs_tracking_view_all')) {
            const teams = QS.getAllTeams();
            teamIds = teams
                .filter(t => {
                    if (t.teamCode === 'billa' && hasPermission(req.user, 'qs_team_billa_access')) return true;
                    if (t.teamCode === 'social_media' && hasPermission(req.user, 'qs_team_social_access')) return true;
                    return false;
                })
                .map(t => t.id);
        }
        
        const evaluations = QS.getAllEvaluations({
            ...req.query,
            teamIds
        });
        
        res.json({ success: true, evaluations });
    } catch (error) {
        console.error('Get tracking evaluations error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch evaluations' });
    }
});

/**
 * GET /api/qs/tracking/statistics
 * Get global statistics
 */
router.get('/tracking/statistics', requirePermission('qs_tracking_view'), (req, res) => {
    try {
        let teamIds = null;
        
        if (!hasPermission(req.user, 'qs_tracking_view_all')) {
            const teams = QS.getAllTeams();
            teamIds = teams
                .filter(t => {
                    if (t.teamCode === 'billa' && hasPermission(req.user, 'qs_team_billa_access')) return true;
                    if (t.teamCode === 'social_media' && hasPermission(req.user, 'qs_team_social_access')) return true;
                    return false;
                })
                .map(t => t.id);
        }
        
        const statistics = QS.getGlobalStatistics(teamIds);
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get tracking statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// ============================================
// AGENT RESULTS (My Results)
// ============================================

/**
 * GET /api/qs/my-results
 * Get current user's evaluation results
 */
router.get('/my-results', requirePermission('qs_results_view_own'), (req, res) => {
    try {
        const statistics = QS.getAgentStatistics(req.user.id);
        res.json({ success: true, ...statistics });
    } catch (error) {
        console.error('Get my results error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch results' });
    }
});

/**
 * GET /api/qs/agents/:id/statistics
 * Get agent statistics
 */
router.get('/agents/:id/statistics', requirePermission('qs_results_view_team'), (req, res) => {
    try {
        const statistics = QS.getAgentStatistics(req.params.id, req.query.teamId);
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get agent statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
