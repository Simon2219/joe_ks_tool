/**
 * Quality Management Routes
 * CRUD operations for quality reports and categories
 */

const express = require('express');
const router = express.Router();

const { QualityModel, UserModel } = require('../database');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

/**
 * Formats quality report for response
 */
function formatReport(report) {
    return {
        id: report.id,
        reportNumber: report.report_number,
        agentId: report.agent_id,
        agentName: report.agent_name || 'Unknown',
        evaluatorId: report.evaluator_id,
        evaluatorName: report.evaluator_name || 'Unknown',
        evaluationType: report.evaluation_type,
        evaluationDate: report.evaluation_date,
        overallScore: report.overall_score,
        passed: report.passed,
        strengths: report.strengths,
        areasForImprovement: report.areas_for_improvement,
        coachingNotes: report.coaching_notes,
        ticketId: report.ticket_id,
        categoryScores: report.categoryScores || [],
        createdAt: report.created_at,
        updatedAt: report.updated_at
    };
}

/**
 * Formats category for response
 */
function formatCategory(category) {
    return {
        id: category.id,
        name: category.name,
        description: category.description,
        weight: category.weight,
        isActive: category.is_active,
        criteria: category.criteria || [],
        createdAt: category.created_at,
        updatedAt: category.updated_at
    };
}

/**
 * GET /api/quality
 * Returns quality reports (filtered by permissions)
 */
router.get('/', authenticate, requirePermission('quality_view'), (req, res) => {
    try {
        let reports;
        const { agentId, startDate, endDate } = req.query;

        // Check if user can view all reports
        if (hasPermission(req.user, 'quality_view_all')) {
            reports = QualityModel.getAllReports({ agentId, startDate, endDate });
        } else {
            // User can only see their own evaluations
            reports = QualityModel.getByAgent(req.user.id);
            // Apply date filters
            if (startDate) {
                reports = reports.filter(r => new Date(r.evaluation_date) >= new Date(startDate));
            }
            if (endDate) {
                reports = reports.filter(r => new Date(r.evaluation_date) <= new Date(endDate));
            }
        }

        res.json({ 
            success: true, 
            reports: reports.map(formatReport) 
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve reports' });
    }
});

/**
 * GET /api/quality/statistics
 * Returns quality statistics
 */
router.get('/statistics', authenticate, requirePermission('quality_view'), (req, res) => {
    try {
        const statistics = QualityModel.getStatistics();
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/quality/categories
 * Returns all quality categories
 */
router.get('/categories', authenticate, (req, res) => {
    try {
        const categories = QualityModel.getAllCategories();
        res.json({ 
            success: true, 
            categories: categories.map(formatCategory) 
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to get categories' });
    }
});

/**
 * GET /api/quality/:id
 * Returns a specific quality report
 */
router.get('/:id', authenticate, requirePermission('quality_view'), (req, res) => {
    try {
        const report = QualityModel.getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        // Check if user can view this report
        if (!hasPermission(req.user, 'quality_view_all')) {
            if (report.agent_id !== req.user.id) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You can only view your own evaluations' 
                });
            }
        }

        res.json({ success: true, report: formatReport(report) });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve report' });
    }
});

/**
 * POST /api/quality
 * Creates a new quality report
 */
router.post('/', authenticate, requirePermission('quality_create'), (req, res) => {
    try {
        const reportData = req.body;

        // Validation
        if (!reportData.agentId) {
            return res.status(400).json({ success: false, error: 'Agent is required' });
        }
        if (!reportData.evaluationType) {
            return res.status(400).json({ success: false, error: 'Evaluation type is required' });
        }
        if (!reportData.categoryScores || reportData.categoryScores.length === 0) {
            return res.status(400).json({ success: false, error: 'Category scores are required' });
        }

        // Validate agent exists
        const agent = UserModel.getById(reportData.agentId);
        if (!agent) {
            return res.status(400).json({ success: false, error: 'Agent not found' });
        }

        // Check self-evaluation setting
        const allowSelf = QualityModel.getPassingScore(); // Reuse model, add this check in settings
        if (reportData.agentId === req.user.id) {
            // Could check settings for allowSelfEvaluation here
        }

        const newReport = QualityModel.createReport(reportData, req.user.id);
        res.status(201).json({ success: true, report: formatReport(newReport) });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ success: false, error: 'Failed to create report' });
    }
});

/**
 * PUT /api/quality/:id
 * Updates a quality report
 */
router.put('/:id', authenticate, requirePermission('quality_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const reportData = req.body;

        const existingReport = QualityModel.getReportById(id);
        if (!existingReport) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        const updatedReport = QualityModel.updateReport(id, reportData, req.user.id);
        res.json({ success: true, report: formatReport(updatedReport) });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ success: false, error: 'Failed to update report' });
    }
});

/**
 * DELETE /api/quality/:id
 * Deletes a quality report
 */
router.delete('/:id', authenticate, requirePermission('quality_delete'), (req, res) => {
    try {
        const report = QualityModel.getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        QualityModel.deleteReport(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
});

/**
 * POST /api/quality/categories
 * Creates a new quality category
 */
router.post('/categories', authenticate, requirePermission('quality_manage_categories'), (req, res) => {
    try {
        const categoryData = req.body;

        if (!categoryData.name || categoryData.name.trim() === '') {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }

        const newCategory = QualityModel.createCategory(categoryData);
        res.status(201).json({ success: true, category: formatCategory(newCategory) });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

/**
 * PUT /api/quality/categories/:id
 * Updates a quality category
 */
router.put('/categories/:id', authenticate, requirePermission('quality_manage_categories'), (req, res) => {
    try {
        const { id } = req.params;
        const categoryData = req.body;

        const existingCategory = QualityModel.getCategoryById(id);
        if (!existingCategory) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }

        const updatedCategory = QualityModel.updateCategory(id, categoryData);
        res.json({ success: true, category: formatCategory(updatedCategory) });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

/**
 * DELETE /api/quality/categories/:id
 * Deletes a quality category
 */
router.delete('/categories/:id', authenticate, requirePermission('quality_manage_categories'), (req, res) => {
    try {
        const result = QualityModel.deleteCategory(req.params.id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

module.exports = router;
