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
 * Formats a quality report for API response (snake_case to camelCase)
 */
function formatReport(report) {
    if (!report) return null;
    return {
        id: report.id,
        reportNumber: report.report_number,
        agentId: report.agent_id,
        agentName: report.agent_name,
        evaluatorId: report.evaluator_id,
        evaluatorName: report.evaluator_name,
        evaluationType: report.evaluation_type,
        evaluationDate: report.evaluation_date,
        overallScore: report.overall_score,
        passed: report.passed,
        strengths: report.strengths,
        areasForImprovement: report.improvements,
        coachingNotes: report.coaching_notes,
        categoryScores: report.categoryScores?.map(cs => ({
            categoryId: cs.category_id,
            categoryName: cs.category_name,
            weight: cs.weight,
            score: cs.score,
            maxScore: cs.max_score
        })) || [],
        createdAt: report.created_at,
        updatedAt: report.updated_at
    };
}

/**
 * Formats a quality category for API response
 */
function formatCategory(category) {
    if (!category) return null;
    return {
        id: category.id,
        name: category.name,
        description: category.description,
        weight: category.weight,
        isActive: category.is_active,
        criteria: category.criteria?.map(c => ({
            id: c.id,
            name: c.name,
            maxScore: c.max_score
        })) || [],
        createdAt: category.created_at,
        updatedAt: category.updated_at
    };
}

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
        
        res.json({ success: true, reports: reports.map(formatReport) });
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

        res.json({ success: true, report: formatReport(report) });
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

        res.status(201).json({ success: true, report: formatReport(report) });
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
        res.json({ success: true, report: formatReport(updated) });
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
        res.json({ success: true, categories: categories.map(formatCategory) });
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
        res.status(201).json({ success: true, category: formatCategory(category) });
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
        res.json({ success: true, category: formatCategory(updated) });
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
        res.json({ success: true, statistics: QualitySystem.getStatistics() });
    } catch (error) {
        console.error('Get quality stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/quality/export
 * Exports quality reports as CSV
 */
router.get('/export', requirePermission('quality_view'), (req, res) => {
    try {
        let reports;
        
        if (hasPermission(req.user, 'quality_view_all')) {
            reports = QualitySystem.getAllReports(req.query);
        } else {
            reports = QualitySystem.getByAgent(req.user.id);
        }
        
        const formattedReports = reports.map(formatReport);
        
        // Generate CSV
        const headers = ['Report #', 'Agent', 'Evaluator', 'Type', 'Score', 'Passed', 'Date', 'Strengths', 'Areas for Improvement', 'Coaching Notes'];
        const rows = formattedReports.map(r => [
            r.reportNumber,
            r.agentName,
            r.evaluatorName,
            r.evaluationType,
            r.overallScore + '%',
            r.passed ? 'Yes' : 'No',
            new Date(r.evaluationDate).toLocaleDateString(),
            (r.strengths || '').replace(/"/g, '""'),
            (r.areasForImprovement || '').replace(/"/g, '""'),
            (r.coachingNotes || '').replace(/"/g, '""')
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        res.json({ success: true, data: csv });
    } catch (error) {
        console.error('Export quality reports error:', error);
        res.status(500).json({ success: false, error: 'Failed to export reports' });
    }
});

module.exports = router;
