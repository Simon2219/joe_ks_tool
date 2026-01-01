/**
 * Quality Model
 * Database operations for quality management
 */

const { getDatabase } = require('../sqlite');
const { v4: uuidv4 } = require('uuid');

const QualityModel = {
    // ==========================================
    // QUALITY REPORTS
    // ==========================================

    /**
     * Gets all quality reports with user info
     */
    getAllReports(filters = {}) {
        const db = getDatabase();
        let sql = `
            SELECT qr.*,
                   ua.first_name || ' ' || ua.last_name as agent_name,
                   ue.first_name || ' ' || ue.last_name as evaluator_name
            FROM quality_reports qr
            LEFT JOIN users ua ON qr.agent_id = ua.id
            LEFT JOIN users ue ON qr.evaluator_id = ue.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.agentId) {
            sql += ' AND qr.agent_id = ?';
            params.push(filters.agentId);
        }
        if (filters.evaluatorId) {
            sql += ' AND qr.evaluator_id = ?';
            params.push(filters.evaluatorId);
        }
        if (filters.startDate) {
            sql += ' AND qr.evaluation_date >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            sql += ' AND qr.evaluation_date <= ?';
            params.push(filters.endDate);
        }

        sql += ' ORDER BY qr.evaluation_date DESC';

        const reports = db.prepare(sql).all(...params);
        
        // Get scores for each report
        return reports.map(report => ({
            ...report,
            passed: !!report.passed,
            categoryScores: this.getReportScores(report.id)
        }));
    },

    /**
     * Gets reports for a specific agent
     */
    getByAgent(agentId) {
        return this.getAllReports({ agentId });
    },

    /**
     * Gets a report by ID
     */
    getReportById(id) {
        const db = getDatabase();
        const report = db.prepare(`
            SELECT qr.*,
                   ua.first_name || ' ' || ua.last_name as agent_name,
                   ue.first_name || ' ' || ue.last_name as evaluator_name
            FROM quality_reports qr
            LEFT JOIN users ua ON qr.agent_id = ua.id
            LEFT JOIN users ue ON qr.evaluator_id = ue.id
            WHERE qr.id = ?
        `).get(id);

        if (!report) return null;

        return {
            ...report,
            passed: !!report.passed,
            categoryScores: this.getReportScores(id)
        };
    },

    /**
     * Gets scores for a report
     */
    getReportScores(reportId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT qs.*, qc.name as category_name, qc.weight as category_weight
            FROM quality_scores qs
            LEFT JOIN quality_categories qc ON qs.category_id = qc.id
            WHERE qs.report_id = ?
            ORDER BY qc.name
        `).all(reportId);
    },

    /**
     * Calculates overall score from category scores
     */
    calculateOverallScore(categoryScores, categories) {
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
    },

    /**
     * Creates a new quality report
     */
    createReport(reportData, evaluatorId) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();
        const reportNumber = `QA-${Date.now().toString(36).toUpperCase()}`;

        // Get categories to calculate score
        const categories = this.getAllCategories().filter(c => c.is_active);
        const overallScore = this.calculateOverallScore(reportData.categoryScores, categories);
        const passingScore = this.getPassingScore();

        const transaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO quality_reports (
                    id, report_number, agent_id, evaluator_id, evaluation_type,
                    evaluation_date, overall_score, passed, strengths,
                    areas_for_improvement, coaching_notes, ticket_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                reportNumber,
                reportData.agentId,
                evaluatorId,
                reportData.evaluationType,
                now,
                overallScore,
                overallScore >= passingScore ? 1 : 0,
                reportData.strengths || '',
                reportData.areasForImprovement || '',
                reportData.coachingNotes || '',
                reportData.ticketId || null,
                now,
                now
            );

            // Insert category scores
            const insertScore = db.prepare(`
                INSERT INTO quality_scores (id, report_id, category_id, score, max_score, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const score of reportData.categoryScores) {
                insertScore.run(
                    uuidv4(),
                    id,
                    score.categoryId,
                    score.score,
                    score.maxScore,
                    score.notes || ''
                );
            }
        });

        transaction();
        return this.getReportById(id);
    },

    /**
     * Updates a quality report
     */
    updateReport(id, updates, userId) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getReportById(id);
        if (!existing) return null;

        const transaction = db.transaction(() => {
            // Calculate new score if category scores changed
            let overallScore = existing.overall_score;
            if (updates.categoryScores) {
                const categories = this.getAllCategories().filter(c => c.is_active);
                overallScore = this.calculateOverallScore(updates.categoryScores, categories);
            }
            const passingScore = this.getPassingScore();

            const fields = ['updated_at = ?'];
            const values = [now];

            if (updates.evaluationType !== undefined) {
                fields.push('evaluation_type = ?');
                values.push(updates.evaluationType);
            }
            if (updates.strengths !== undefined) {
                fields.push('strengths = ?');
                values.push(updates.strengths);
            }
            if (updates.areasForImprovement !== undefined) {
                fields.push('areas_for_improvement = ?');
                values.push(updates.areasForImprovement);
            }
            if (updates.coachingNotes !== undefined) {
                fields.push('coaching_notes = ?');
                values.push(updates.coachingNotes);
            }
            if (updates.categoryScores) {
                fields.push('overall_score = ?');
                values.push(overallScore);
                fields.push('passed = ?');
                values.push(overallScore >= passingScore ? 1 : 0);
            }

            values.push(id);
            db.prepare(`UPDATE quality_reports SET ${fields.join(', ')} WHERE id = ?`).run(...values);

            // Update category scores if provided
            if (updates.categoryScores) {
                db.prepare('DELETE FROM quality_scores WHERE report_id = ?').run(id);
                const insertScore = db.prepare(`
                    INSERT INTO quality_scores (id, report_id, category_id, score, max_score, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const score of updates.categoryScores) {
                    insertScore.run(
                        uuidv4(),
                        id,
                        score.categoryId,
                        score.score,
                        score.maxScore,
                        score.notes || ''
                    );
                }
            }
        });

        transaction();
        return this.getReportById(id);
    },

    /**
     * Deletes a quality report
     */
    deleteReport(id) {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM quality_reports WHERE id = ?').run(id);
        return result.changes > 0;
    },

    /**
     * Gets quality statistics
     */
    getStatistics() {
        const db = getDatabase();
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const monthStart = thisMonth.toISOString();

        const total = db.prepare('SELECT COUNT(*) as count FROM quality_reports').get().count;
        
        const reportsThisMonth = db.prepare(`
            SELECT COUNT(*) as count FROM quality_reports WHERE evaluation_date >= ?
        `).get(monthStart).count;

        const avgScore = db.prepare(`
            SELECT AVG(overall_score) as avg FROM quality_reports
        `).get().avg || 0;

        const passingCount = db.prepare(`
            SELECT COUNT(*) as count FROM quality_reports WHERE passed = 1
        `).get().count;

        const categories = db.prepare(`
            SELECT COUNT(*) as count FROM quality_categories WHERE is_active = 1
        `).get().count;

        return {
            totalReports: total,
            reportsThisMonth,
            averageScore: Math.round(avgScore),
            passingRate: total > 0 ? Math.round((passingCount / total) * 100) : 0,
            categoryCount: categories
        };
    },

    /**
     * Gets passing score from settings
     */
    getPassingScore() {
        const db = getDatabase();
        const setting = db.prepare("SELECT value FROM settings WHERE key = 'quality.passingScore'").get();
        return setting ? parseInt(setting.value) : 80;
    },

    // ==========================================
    // QUALITY CATEGORIES
    // ==========================================

    /**
     * Gets all categories with criteria
     */
    getAllCategories() {
        const db = getDatabase();
        const categories = db.prepare(`
            SELECT * FROM quality_categories ORDER BY name
        `).all();

        return categories.map(cat => ({
            ...cat,
            is_active: !!cat.is_active,
            criteria: this.getCategoryCriteria(cat.id)
        }));
    },

    /**
     * Gets active categories
     */
    getActiveCategories() {
        return this.getAllCategories().filter(c => c.is_active);
    },

    /**
     * Gets a category by ID
     */
    getCategoryById(id) {
        const db = getDatabase();
        const category = db.prepare('SELECT * FROM quality_categories WHERE id = ?').get(id);
        if (!category) return null;

        return {
            ...category,
            is_active: !!category.is_active,
            criteria: this.getCategoryCriteria(id)
        };
    },

    /**
     * Gets criteria for a category
     */
    getCategoryCriteria(categoryId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT * FROM quality_criteria WHERE category_id = ? ORDER BY sort_order
        `).all(categoryId);
    },

    /**
     * Creates a quality category
     */
    createCategory(categoryData) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();

        const transaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                categoryData.name.trim(),
                categoryData.description || '',
                categoryData.weight || 25,
                1,
                now,
                now
            );

            // Insert criteria
            if (categoryData.criteria && categoryData.criteria.length > 0) {
                const insertCriteria = db.prepare(`
                    INSERT INTO quality_criteria (id, category_id, name, max_score, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                `);
                categoryData.criteria.forEach((criteria, index) => {
                    insertCriteria.run(uuidv4(), id, criteria.name, criteria.maxScore || 10, index);
                });
            }
        });

        transaction();
        return this.getCategoryById(id);
    },

    /**
     * Updates a quality category
     */
    updateCategory(id, updates) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getCategoryById(id);
        if (!existing) return null;

        const transaction = db.transaction(() => {
            const fields = ['updated_at = ?'];
            const values = [now];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name.trim());
            }
            if (updates.description !== undefined) {
                fields.push('description = ?');
                values.push(updates.description);
            }
            if (updates.weight !== undefined) {
                fields.push('weight = ?');
                values.push(updates.weight);
            }
            if (updates.isActive !== undefined) {
                fields.push('is_active = ?');
                values.push(updates.isActive ? 1 : 0);
            }

            values.push(id);
            db.prepare(`UPDATE quality_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);

            // Update criteria if provided
            if (updates.criteria !== undefined) {
                db.prepare('DELETE FROM quality_criteria WHERE category_id = ?').run(id);
                const insertCriteria = db.prepare(`
                    INSERT INTO quality_criteria (id, category_id, name, max_score, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                `);
                updates.criteria.forEach((criteria, index) => {
                    insertCriteria.run(uuidv4(), id, criteria.name, criteria.maxScore || 10, index);
                });
            }
        });

        transaction();
        return this.getCategoryById(id);
    },

    /**
     * Deletes a quality category
     */
    deleteCategory(id) {
        const db = getDatabase();
        // Check if category is used in any reports
        const used = db.prepare(`
            SELECT COUNT(*) as count FROM quality_scores WHERE category_id = ?
        `).get(id).count;

        if (used > 0) {
            return { success: false, error: 'Category is used in existing evaluations' };
        }

        const result = db.prepare('DELETE FROM quality_categories WHERE id = ?').run(id);
        return { success: result.changes > 0 };
    }
};

module.exports = QualityModel;
