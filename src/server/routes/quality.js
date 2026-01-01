/**
 * Quality Routes - QualitySystem
 * Handles quality evaluation operations
 */

const express = require('express');
const router = express.Router();

const { QualitySystem, UserSystem } = require('../database');
const { authenticate, requirePermission, hasPermission, canAccessResource } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/quality/reports
 */
router.get('/reports', requirePermission('quality_view'), (req, res) => {
    try {
        let reports;
        
        if (hasPermission(req.user, 'quality_view_all')) {
            reports = QualitySystem.getAllReports(req.query);
        } else {
            reports = QualitySystem.getByAgent(req.user.id);
        }
        
        res.json({ success: true, reports });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reports' });
    }
});

/**
 * GET /api/quality/reports/:id
 */
router.get('/reports/:id', requirePermission('quality_view'), (req, res) => {
    try {
        const report = QualitySystem.getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        if (!canAccessResource(req.user, 'quality', report.agent_id)) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        res.json({ success: true, report });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch report' });
    }
});

/**
 * POST /api/quality/reports
 */
router.post('/reports', requirePermission('quality_create'), (req, res) => {
    try {
        const { agentId, evaluationType, categoryScores, strengths, areasForImprovement, coachingNotes } = req.body;

        if (!agentId || !evaluationType || !categoryScores) {
            return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        if (!UserSystem.getById(agentId)) {
            return res.status(400).json({ success: false, error: 'Invalid agent' });
        }

        const report = QualitySystem.createReport({
            agentId, evaluationType, categoryScores, strengths, areasForImprovement, coachingNotes
        }, req.user.id);

        res.status(201).json({ success: true, report });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ success: false, error: 'Failed to create report' });
    }
});

/**
 * PUT /api/quality/reports/:id
 */
router.put('/reports/:id', requirePermission('quality_edit'), (req, res) => {
    try {
        const report = QualitySystem.getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        // Only allow evaluator or admin to edit
        if (report.evaluator_id !== req.user.id && !req.user.role?.isAdmin) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const updated = QualitySystem.updateReport(req.params.id, req.body);
        res.json({ success: true, report: updated });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ success: false, error: 'Failed to update report' });
    }
});

/**
 * DELETE /api/quality/reports/:id
 */
router.delete('/reports/:id', requirePermission('quality_delete'), (req, res) => {
    try {
        const report = QualitySystem.getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        QualitySystem.deleteReport(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
});

/**
 * GET /api/quality/categories
 */
router.get('/categories', requirePermission('quality_view'), (req, res) => {
    try {
        const categories = QualitySystem.getAllCategories();
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

/**
 * POST /api/quality/categories
 */
router.post('/categories', requirePermission('quality_manage'), (req, res) => {
    try {
        const { name, description, weight, criteria } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        const category = QualitySystem.createCategory({ name, description, weight, criteria });
        res.status(201).json({ success: true, category });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

/**
 * PUT /api/quality/categories/:id
 */
router.put('/categories/:id', requirePermission('quality_manage'), (req, res) => {
    try {
        const category = QualitySystem.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }

        const updated = QualitySystem.updateCategory(req.params.id, req.body);
        res.json({ success: true, category: updated });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

/**
 * DELETE /api/quality/categories/:id
 */
router.delete('/categories/:id', requirePermission('quality_manage'), (req, res) => {
    try {
        const result = QualitySystem.deleteCategory(req.params.id);
        
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

/**
 * GET /api/quality/stats
 */
router.get('/stats', requirePermission('quality_view'), (req, res) => {
    try {
        res.json({ success: true, stats: QualitySystem.getStatistics() });
    } catch (error) {
        console.error('Get quality stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

module.exports = router;
