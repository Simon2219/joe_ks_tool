/**
 * Quality Management Routes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { QualityReportsDB, QualityCategoriesDB, UsersDB } = require('../database/dbService');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

// Calculate overall score
function calculateOverallScore(categoryScores, categories) {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const catScore of categoryScores) {
        const category = categories.find(c => c.id === catScore.categoryId);
        if (category) {
            totalWeight += category.weight;
            weightedScore += (catScore.score / catScore.maxScore) * category.weight;
        }
    }

    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
}

// Enrich report with user names
function enrichReport(report) {
    const agent = UsersDB.getById(report.agentId);
    const evaluator = UsersDB.getById(report.evaluatorId);
    return {
        ...report,
        agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown',
        evaluatorName: evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : 'Unknown'
    };
}

// GET /api/quality
router.get('/', authenticate, requirePermission('quality_view'), (req, res) => {
    try {
        let reports;
        const { agentId, startDate, endDate } = req.query;

        if (hasPermission(req.user, 'quality_view_all')) {
            reports = QualityReportsDB.getAll();
        } else {
            reports = QualityReportsDB.getByAgent(req.user.id);
        }

        // Apply filters
        if (agentId) reports = reports.filter(r => r.agentId === agentId);
        if (startDate) reports = reports.filter(r => new Date(r.evaluationDate) >= new Date(startDate));
        if (endDate) reports = reports.filter(r => new Date(r.evaluationDate) <= new Date(endDate));

        reports = reports.map(enrichReport);
        reports.sort((a, b) => new Date(b.evaluationDate) - new Date(a.evaluationDate));

        res.json({ success: true, reports });
    } catch (error) {
        console.error('Get reports error:', error);
        res.json({ success: false, error: 'Failed to retrieve reports' });
    }
});

// GET /api/quality/statistics
router.get('/statistics', authenticate, requirePermission('quality_view'), (req, res) => {
    try {
        const reports = QualityReportsDB.getAll();
        const categories = QualityCategoriesDB.getAll().filter(c => c.isActive);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const reportsThisMonth = reports.filter(r => new Date(r.evaluationDate) >= thisMonth);

        const avgScore = reports.length > 0
            ? Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length)
            : 0;

        res.json({
            success: true,
            statistics: {
                totalReports: reports.length,
                reportsThisMonth: reportsThisMonth.length,
                averageScore: avgScore,
                passingRate: reports.length > 0
                    ? Math.round(reports.filter(r => r.passed).length / reports.length * 100)
                    : 0,
                categoryCount: categories.length
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.json({ success: false, error: 'Failed to get statistics' });
    }
});

// GET /api/quality/categories
router.get('/categories', authenticate, (req, res) => {
    try {
        const categories = QualityCategoriesDB.getAll();
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.json({ success: false, error: 'Failed to get categories' });
    }
});

// GET /api/quality/:id
router.get('/:id', authenticate, requirePermission('quality_view'), (req, res) => {
    try {
        const report = QualityReportsDB.getById(req.params.id);
        if (!report) {
            return res.json({ success: false, error: 'Report not found' });
        }
        res.json({ success: true, report: enrichReport(report) });
    } catch (error) {
        console.error('Get report error:', error);
        res.json({ success: false, error: 'Failed to retrieve report' });
    }
});

// POST /api/quality
router.post('/', authenticate, requirePermission('quality_create'), (req, res) => {
    try {
        const reportData = req.body;

        if (!reportData.agentId) {
            return res.json({ success: false, error: 'Agent is required' });
        }
        if (!reportData.evaluationType) {
            return res.json({ success: false, error: 'Evaluation type is required' });
        }
        if (!reportData.categoryScores || reportData.categoryScores.length === 0) {
            return res.json({ success: false, error: 'Category scores are required' });
        }

        const categories = QualityCategoriesDB.getAll().filter(c => c.isActive);
        const overallScore = calculateOverallScore(reportData.categoryScores, categories);

        const newReport = {
            id: uuidv4(),
            reportNumber: `QA-${Date.now().toString(36).toUpperCase()}`,
            agentId: reportData.agentId,
            evaluatorId: req.user.id,
            evaluationType: reportData.evaluationType,
            evaluationDate: new Date().toISOString(),
            categoryScores: reportData.categoryScores,
            overallScore,
            passed: overallScore >= 80,
            strengths: reportData.strengths || '',
            areasForImprovement: reportData.areasForImprovement || '',
            coachingNotes: reportData.coachingNotes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        QualityReportsDB.create(newReport);
        res.json({ success: true, report: enrichReport(newReport) });
    } catch (error) {
        console.error('Create report error:', error);
        res.json({ success: false, error: 'Failed to create report' });
    }
});

// PUT /api/quality/:id
router.put('/:id', authenticate, requirePermission('quality_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const reportData = req.body;

        const existingReport = QualityReportsDB.getById(id);
        if (!existingReport) {
            return res.json({ success: false, error: 'Report not found' });
        }

        const categories = QualityCategoriesDB.getAll().filter(c => c.isActive);
        const categoryScores = reportData.categoryScores || existingReport.categoryScores;
        const overallScore = calculateOverallScore(categoryScores, categories);

        const updates = {
            evaluationType: reportData.evaluationType ?? existingReport.evaluationType,
            categoryScores,
            overallScore,
            passed: overallScore >= 80,
            strengths: reportData.strengths ?? existingReport.strengths,
            areasForImprovement: reportData.areasForImprovement ?? existingReport.areasForImprovement,
            coachingNotes: reportData.coachingNotes ?? existingReport.coachingNotes
        };

        const updatedReport = QualityReportsDB.update(id, updates);
        res.json({ success: true, report: enrichReport(updatedReport) });
    } catch (error) {
        console.error('Update report error:', error);
        res.json({ success: false, error: 'Failed to update report' });
    }
});

// DELETE /api/quality/:id
router.delete('/:id', authenticate, requirePermission('quality_delete'), (req, res) => {
    try {
        const report = QualityReportsDB.getById(req.params.id);
        if (!report) {
            return res.json({ success: false, error: 'Report not found' });
        }

        QualityReportsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete report error:', error);
        res.json({ success: false, error: 'Failed to delete report' });
    }
});

// POST /api/quality/categories
router.post('/categories', authenticate, requirePermission('quality_manage_categories'), (req, res) => {
    try {
        const categoryData = req.body;

        if (!categoryData.name || categoryData.name.trim() === '') {
            return res.json({ success: false, error: 'Category name is required' });
        }

        const newCategory = {
            id: uuidv4(),
            name: categoryData.name.trim(),
            description: categoryData.description || '',
            weight: categoryData.weight || 25,
            isActive: true,
            criteria: categoryData.criteria || [],
            createdAt: new Date().toISOString()
        };

        QualityCategoriesDB.create(newCategory);
        res.json({ success: true, category: newCategory });
    } catch (error) {
        console.error('Create category error:', error);
        res.json({ success: false, error: 'Failed to create category' });
    }
});

module.exports = router;
