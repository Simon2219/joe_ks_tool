/**
 * Quality Management IPC Handlers
 * Handles quality evaluation reports, categories, and templates
 */

const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { 
    QualityReportsDB, 
    QualityCategoriesDB, 
    QualityTemplatesDB,
    UsersDB,
    TicketsDB 
} = require('../database/dbService');
const { checkPermission, getCurrentSession } = require('./authHandlers');

/**
 * Calculates the overall score from category scores
 */
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

/**
 * Validates quality report data
 */
function validateReportData(reportData) {
    const errors = [];
    
    if (!reportData.agentId) {
        errors.push('Agent is required');
    }
    
    if (!reportData.evaluationType) {
        errors.push('Evaluation type is required');
    }
    
    if (!reportData.categoryScores || reportData.categoryScores.length === 0) {
        errors.push('At least one category score is required');
    }
    
    return errors;
}

/**
 * Enriches report with user information
 */
function enrichReport(report) {
    const agent = UsersDB.getById(report.agentId);
    const evaluator = UsersDB.getById(report.evaluatorId);
    const ticket = report.ticketId ? TicketsDB.getById(report.ticketId) : null;
    
    return {
        ...report,
        agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown',
        evaluatorName: evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : 'Unknown',
        ticketNumber: ticket ? ticket.ticketNumber : null
    };
}

/**
 * Generates agent scorecard
 */
function generateScorecard(agentId, dateRange) {
    let reports = QualityReportsDB.getByAgent(agentId);
    
    if (dateRange) {
        reports = reports.filter(r => {
            const date = new Date(r.evaluationDate);
            return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
        });
    }
    
    if (reports.length === 0) {
        return { totalReports: 0, averageScore: 0, trend: 'stable', categoryBreakdown: [] };
    }
    
    const categories = QualityCategoriesDB.getActive();
    const categoryBreakdown = categories.map(cat => {
        const scores = reports
            .flatMap(r => r.categoryScores)
            .filter(cs => cs.categoryId === cat.id);
        
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / scores.length)
            : 0;
        
        return {
            categoryId: cat.id,
            categoryName: cat.name,
            averageScore: avgScore,
            evaluationCount: scores.length
        };
    });
    
    const averageScore = Math.round(
        reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length
    );
    
    // Calculate trend (comparing last 5 vs previous 5)
    const sortedReports = [...reports].sort((a, b) => 
        new Date(b.evaluationDate) - new Date(a.evaluationDate)
    );
    
    let trend = 'stable';
    if (sortedReports.length >= 10) {
        const recent = sortedReports.slice(0, 5);
        const previous = sortedReports.slice(5, 10);
        const recentAvg = recent.reduce((sum, r) => sum + r.overallScore, 0) / 5;
        const previousAvg = previous.reduce((sum, r) => sum + r.overallScore, 0) / 5;
        
        if (recentAvg > previousAvg + 5) trend = 'improving';
        else if (recentAvg < previousAvg - 5) trend = 'declining';
    }
    
    return {
        totalReports: reports.length,
        averageScore,
        trend,
        categoryBreakdown,
        passingRate: Math.round(reports.filter(r => r.overallScore >= 80).length / reports.length * 100),
        recentReports: sortedReports.slice(0, 5).map(enrichReport)
    };
}

/**
 * Generates team statistics
 */
function generateTeamStats(teamUserIds, dateRange) {
    const stats = {
        totalEvaluations: 0,
        averageScore: 0,
        agentStats: [],
        topPerformers: [],
        needsImprovement: []
    };
    
    let allScores = [];
    
    for (const userId of teamUserIds) {
        const scorecard = generateScorecard(userId, dateRange);
        const user = UsersDB.getById(userId);
        
        if (scorecard.totalReports > 0) {
            stats.totalEvaluations += scorecard.totalReports;
            allScores.push(scorecard.averageScore);
            
            stats.agentStats.push({
                userId,
                userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                totalReports: scorecard.totalReports,
                averageScore: scorecard.averageScore,
                trend: scorecard.trend
            });
        }
    }
    
    if (allScores.length > 0) {
        stats.averageScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
    }
    
    // Sort for top performers and needs improvement
    stats.agentStats.sort((a, b) => b.averageScore - a.averageScore);
    stats.topPerformers = stats.agentStats.filter(a => a.averageScore >= 90).slice(0, 5);
    stats.needsImprovement = stats.agentStats.filter(a => a.averageScore < 70).slice(0, 5);
    
    return stats;
}

/**
 * Registers quality management IPC handlers
 */
function registerQualityHandlers() {
    // Get all reports
    ipcMain.handle('quality:getAll', async (event, filters = {}) => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            let reports;
            const session = getCurrentSession();
            
            if (checkPermission('quality_view_all')) {
                reports = Object.keys(filters).length > 0
                    ? QualityReportsDB.getFiltered(filters)
                    : QualityReportsDB.getAll();
            } else {
                // Only show reports where user is the agent
                reports = QualityReportsDB.getByAgent(session.user.id);
            }
            
            reports = reports.map(enrichReport);
            reports.sort((a, b) => new Date(b.evaluationDate) - new Date(a.evaluationDate));
            
            return { success: true, reports };
        } catch (error) {
            console.error('Get quality reports error:', error);
            return { success: false, error: 'Failed to retrieve reports' };
        }
    });
    
    // Get report by ID
    ipcMain.handle('quality:getById', async (event, id) => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const report = QualityReportsDB.getById(id);
            if (!report) {
                return { success: false, error: 'Report not found' };
            }
            
            return { success: true, report: enrichReport(report) };
        } catch (error) {
            console.error('Get report error:', error);
            return { success: false, error: 'Failed to retrieve report' };
        }
    });
    
    // Create report
    ipcMain.handle('quality:create', async (event, reportData) => {
        try {
            if (!checkPermission('quality_create')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const errors = validateReportData(reportData);
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            const session = getCurrentSession();
            const categories = QualityCategoriesDB.getActive();
            
            // Calculate overall score
            const overallScore = calculateOverallScore(reportData.categoryScores, categories);
            
            const newReport = {
                id: uuidv4(),
                reportNumber: `QA-${Date.now().toString(36).toUpperCase()}`,
                agentId: reportData.agentId,
                evaluatorId: session.user.id,
                ticketId: reportData.ticketId || null,
                evaluationType: reportData.evaluationType, // call, email, chat, ticket
                evaluationDate: new Date().toISOString(),
                categoryScores: reportData.categoryScores,
                overallScore,
                passed: overallScore >= 80,
                strengths: reportData.strengths || '',
                areasForImprovement: reportData.areasForImprovement || '',
                actionItems: reportData.actionItems || [],
                coachingNotes: reportData.coachingNotes || '',
                agentAcknowledged: false,
                agentComments: '',
                status: 'pending_review', // pending_review, acknowledged, disputed
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            QualityReportsDB.create(newReport);
            
            return { success: true, report: enrichReport(newReport) };
        } catch (error) {
            console.error('Create report error:', error);
            return { success: false, error: 'Failed to create report' };
        }
    });
    
    // Update report
    ipcMain.handle('quality:update', async (event, id, reportData) => {
        try {
            if (!checkPermission('quality_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const existingReport = QualityReportsDB.getById(id);
            if (!existingReport) {
                return { success: false, error: 'Report not found' };
            }
            
            const categories = QualityCategoriesDB.getActive();
            const categoryScores = reportData.categoryScores || existingReport.categoryScores;
            const overallScore = calculateOverallScore(categoryScores, categories);
            
            const updates = {
                ticketId: reportData.ticketId ?? existingReport.ticketId,
                evaluationType: reportData.evaluationType ?? existingReport.evaluationType,
                categoryScores,
                overallScore,
                passed: overallScore >= 80,
                strengths: reportData.strengths ?? existingReport.strengths,
                areasForImprovement: reportData.areasForImprovement ?? existingReport.areasForImprovement,
                actionItems: reportData.actionItems ?? existingReport.actionItems,
                coachingNotes: reportData.coachingNotes ?? existingReport.coachingNotes
            };
            
            const updatedReport = QualityReportsDB.update(id, updates);
            
            return { success: true, report: enrichReport(updatedReport) };
        } catch (error) {
            console.error('Update report error:', error);
            return { success: false, error: 'Failed to update report' };
        }
    });
    
    // Delete report
    ipcMain.handle('quality:delete', async (event, id) => {
        try {
            if (!checkPermission('quality_delete')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const report = QualityReportsDB.getById(id);
            if (!report) {
                return { success: false, error: 'Report not found' };
            }
            
            QualityReportsDB.delete(id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete report error:', error);
            return { success: false, error: 'Failed to delete report' };
        }
    });
    
    // Get reports by agent
    ipcMain.handle('quality:getByAgent', async (event, agentId) => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const reports = QualityReportsDB.getByAgent(agentId).map(enrichReport);
            return { success: true, reports };
        } catch (error) {
            console.error('Get reports by agent error:', error);
            return { success: false, error: 'Failed to retrieve reports' };
        }
    });
    
    // Get reports by evaluator
    ipcMain.handle('quality:getByEvaluator', async (event, evaluatorId) => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const reports = QualityReportsDB.getByEvaluator(evaluatorId).map(enrichReport);
            return { success: true, reports };
        } catch (error) {
            console.error('Get reports by evaluator error:', error);
            return { success: false, error: 'Failed to retrieve reports' };
        }
    });
    
    // Get categories
    ipcMain.handle('quality:getCategories', async () => {
        try {
            const categories = QualityCategoriesDB.getAll();
            return { success: true, categories };
        } catch (error) {
            console.error('Get categories error:', error);
            return { success: false, error: 'Failed to retrieve categories' };
        }
    });
    
    // Create category
    ipcMain.handle('quality:createCategory', async (event, categoryData) => {
        try {
            if (!checkPermission('quality_manage_categories')) {
                return { success: false, error: 'Permission denied' };
            }
            
            if (!categoryData.name || categoryData.name.trim() === '') {
                return { success: false, error: 'Category name is required' };
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
            
            return { success: true, category: newCategory };
        } catch (error) {
            console.error('Create category error:', error);
            return { success: false, error: 'Failed to create category' };
        }
    });
    
    // Update category
    ipcMain.handle('quality:updateCategory', async (event, id, categoryData) => {
        try {
            if (!checkPermission('quality_manage_categories')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const existingCategory = QualityCategoriesDB.getById(id);
            if (!existingCategory) {
                return { success: false, error: 'Category not found' };
            }
            
            const updates = {
                name: categoryData.name ?? existingCategory.name,
                description: categoryData.description ?? existingCategory.description,
                weight: categoryData.weight ?? existingCategory.weight,
                isActive: categoryData.isActive ?? existingCategory.isActive,
                criteria: categoryData.criteria ?? existingCategory.criteria
            };
            
            const updatedCategory = QualityCategoriesDB.update(id, updates);
            
            return { success: true, category: updatedCategory };
        } catch (error) {
            console.error('Update category error:', error);
            return { success: false, error: 'Failed to update category' };
        }
    });
    
    // Delete category
    ipcMain.handle('quality:deleteCategory', async (event, id) => {
        try {
            if (!checkPermission('quality_manage_categories')) {
                return { success: false, error: 'Permission denied' };
            }
            
            QualityCategoriesDB.delete(id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete category error:', error);
            return { success: false, error: 'Failed to delete category' };
        }
    });
    
    // Get agent scorecard
    ipcMain.handle('quality:getScorecard', async (event, agentId, dateRange) => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const scorecard = generateScorecard(agentId, dateRange);
            const agent = UsersDB.getById(agentId);
            
            return { 
                success: true, 
                scorecard: {
                    ...scorecard,
                    agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown'
                }
            };
        } catch (error) {
            console.error('Get scorecard error:', error);
            return { success: false, error: 'Failed to get scorecard' };
        }
    });
    
    // Get team statistics
    ipcMain.handle('quality:getTeamStats', async (event, teamId, dateRange) => {
        try {
            if (!checkPermission('quality_view_all')) {
                return { success: false, error: 'Permission denied' };
            }
            
            // Get all agents for now (could be filtered by team/department)
            const agents = UsersDB.getByRole('agent');
            const teamUserIds = agents.map(a => a.id);
            
            const stats = generateTeamStats(teamUserIds, dateRange);
            
            return { success: true, statistics: stats };
        } catch (error) {
            console.error('Get team stats error:', error);
            return { success: false, error: 'Failed to get team statistics' };
        }
    });
    
    // Get overall statistics
    ipcMain.handle('quality:getStatistics', async () => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const reports = QualityReportsDB.getAll();
            const categories = QualityCategoriesDB.getActive();
            
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            
            const reportsThisMonth = reports.filter(r => new Date(r.evaluationDate) >= thisMonth);
            
            const avgScore = reports.length > 0
                ? Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length)
                : 0;
            
            const avgScoreThisMonth = reportsThisMonth.length > 0
                ? Math.round(reportsThisMonth.reduce((sum, r) => sum + r.overallScore, 0) / reportsThisMonth.length)
                : 0;
            
            return {
                success: true,
                statistics: {
                    totalReports: reports.length,
                    reportsThisMonth: reportsThisMonth.length,
                    averageScore: avgScore,
                    averageScoreThisMonth: avgScoreThisMonth,
                    passingRate: reports.length > 0
                        ? Math.round(reports.filter(r => r.passed).length / reports.length * 100)
                        : 0,
                    categoryCount: categories.length,
                    pendingReview: reports.filter(r => r.status === 'pending_review').length
                }
            };
        } catch (error) {
            console.error('Get statistics error:', error);
            return { success: false, error: 'Failed to get statistics' };
        }
    });
    
    // Export reports
    ipcMain.handle('quality:export', async (event, filters, format) => {
        try {
            if (!checkPermission('quality_export')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const reports = filters
                ? QualityReportsDB.getFiltered(filters).map(enrichReport)
                : QualityReportsDB.getAll().map(enrichReport);
            
            let data;
            if (format === 'json') {
                data = JSON.stringify(reports, null, 2);
            } else if (format === 'csv') {
                const headers = ['Report #', 'Agent', 'Evaluator', 'Type', 'Score', 'Passed', 'Date'];
                const rows = reports.map(r => [
                    r.reportNumber, r.agentName, r.evaluatorName, r.evaluationType,
                    r.overallScore, r.passed ? 'Yes' : 'No', r.evaluationDate
                ]);
                data = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
            } else {
                return { success: false, error: 'Invalid export format' };
            }
            
            return { success: true, data, format };
        } catch (error) {
            console.error('Export reports error:', error);
            return { success: false, error: 'Failed to export reports' };
        }
    });
    
    // Get templates
    ipcMain.handle('quality:getTemplates', async () => {
        try {
            if (!checkPermission('quality_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const templates = QualityTemplatesDB.getAll();
            return { success: true, templates };
        } catch (error) {
            console.error('Get templates error:', error);
            return { success: false, error: 'Failed to retrieve templates' };
        }
    });
    
    // Create template
    ipcMain.handle('quality:createTemplate', async (event, templateData) => {
        try {
            if (!checkPermission('quality_manage_templates')) {
                return { success: false, error: 'Permission denied' };
            }
            
            if (!templateData.name || templateData.name.trim() === '') {
                return { success: false, error: 'Template name is required' };
            }
            
            const newTemplate = {
                id: uuidv4(),
                name: templateData.name.trim(),
                description: templateData.description || '',
                evaluationType: templateData.evaluationType || 'general',
                categories: templateData.categories || [],
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            QualityTemplatesDB.create(newTemplate);
            
            return { success: true, template: newTemplate };
        } catch (error) {
            console.error('Create template error:', error);
            return { success: false, error: 'Failed to create template' };
        }
    });
    
    // Update template
    ipcMain.handle('quality:updateTemplate', async (event, id, templateData) => {
        try {
            if (!checkPermission('quality_manage_templates')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const existingTemplate = QualityTemplatesDB.getById(id);
            if (!existingTemplate) {
                return { success: false, error: 'Template not found' };
            }
            
            const updates = {
                name: templateData.name ?? existingTemplate.name,
                description: templateData.description ?? existingTemplate.description,
                evaluationType: templateData.evaluationType ?? existingTemplate.evaluationType,
                categories: templateData.categories ?? existingTemplate.categories,
                isActive: templateData.isActive ?? existingTemplate.isActive
            };
            
            const updatedTemplate = QualityTemplatesDB.update(id, updates);
            
            return { success: true, template: updatedTemplate };
        } catch (error) {
            console.error('Update template error:', error);
            return { success: false, error: 'Failed to update template' };
        }
    });
    
    // Delete template
    ipcMain.handle('quality:deleteTemplate', async (event, id) => {
        try {
            if (!checkPermission('quality_manage_templates')) {
                return { success: false, error: 'Permission denied' };
            }
            
            QualityTemplatesDB.delete(id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete template error:', error);
            return { success: false, error: 'Failed to delete template' };
        }
    });
}

module.exports = { registerQualityHandlers };
