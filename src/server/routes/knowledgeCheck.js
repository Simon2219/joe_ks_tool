/**
 * Knowledge Check Routes
 * Handles knowledge check/test system operations
 */

const express = require('express');
const router = express.Router();

const { KnowledgeCheckSystem, UserSystem } = require('../database');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

router.use(authenticate);

// ============================================
// CATEGORIES
// ============================================

/**
 * GET /api/knowledge-check/categories
 */
router.get('/categories', requirePermission('kc_questions_view'), (req, res) => {
    try {
        const categories = KnowledgeCheckSystem.getAllCategories();
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get KC categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

/**
 * GET /api/knowledge-check/categories/:id
 */
router.get('/categories/:id', requirePermission('kc_questions_view'), (req, res) => {
    try {
        const category = KnowledgeCheckSystem.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error('Get KC category error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch category' });
    }
});

/**
 * POST /api/knowledge-check/categories
 */
router.post('/categories', requirePermission('kc_categories_create'), (req, res) => {
    try {
        const { name, description, defaultWeighting } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        
        const category = KnowledgeCheckSystem.createCategory({ name, description, defaultWeighting });
        res.status(201).json({ success: true, category });
    } catch (error) {
        console.error('Create KC category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

/**
 * PUT /api/knowledge-check/categories/:id
 */
router.put('/categories/:id', requirePermission('kc_categories_edit'), (req, res) => {
    try {
        const category = KnowledgeCheckSystem.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        
        const updated = KnowledgeCheckSystem.updateCategory(req.params.id, req.body);
        res.json({ success: true, category: updated });
    } catch (error) {
        console.error('Update KC category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

/**
 * DELETE /api/knowledge-check/categories/:id
 */
router.delete('/categories/:id', requirePermission('kc_categories_delete'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteCategory(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete KC category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

/**
 * PUT /api/knowledge-check/categories/reorder
 */
router.put('/categories/reorder', requirePermission('kc_categories_edit'), (req, res) => {
    try {
        const { categoryIds } = req.body;
        
        if (!categoryIds || !Array.isArray(categoryIds)) {
            return res.status(400).json({ success: false, error: 'Category IDs array required' });
        }
        
        KnowledgeCheckSystem.reorderCategories(categoryIds);
        res.json({ success: true });
    } catch (error) {
        console.error('Reorder KC categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to reorder categories' });
    }
});

// ============================================
// TEST CATEGORIES
// ============================================

/**
 * GET /api/knowledge-check/test-categories
 */
router.get('/test-categories', requirePermission('kc_tests_view'), (req, res) => {
    try {
        const categories = KnowledgeCheckSystem.getAllTestCategories();
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get KC test categories error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test categories' });
    }
});

/**
 * GET /api/knowledge-check/test-categories/:id
 */
router.get('/test-categories/:id', requirePermission('kc_tests_view'), (req, res) => {
    try {
        const category = KnowledgeCheckSystem.getTestCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Test category not found' });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error('Get KC test category error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test category' });
    }
});

/**
 * POST /api/knowledge-check/test-categories
 */
router.post('/test-categories', requirePermission('kc_tests_create'), (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        
        const category = KnowledgeCheckSystem.createTestCategory({ name, description });
        res.status(201).json({ success: true, category });
    } catch (error) {
        console.error('Create KC test category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create test category' });
    }
});

/**
 * PUT /api/knowledge-check/test-categories/:id
 */
router.put('/test-categories/:id', requirePermission('kc_tests_edit'), (req, res) => {
    try {
        const category = KnowledgeCheckSystem.getTestCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Test category not found' });
        }
        
        const updated = KnowledgeCheckSystem.updateTestCategory(req.params.id, req.body);
        res.json({ success: true, category: updated });
    } catch (error) {
        console.error('Update KC test category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update test category' });
    }
});

/**
 * DELETE /api/knowledge-check/test-categories/:id
 */
router.delete('/test-categories/:id', requirePermission('kc_tests_delete'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteTestCategory(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete KC test category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete test category' });
    }
});

// ============================================
// QUESTIONS
// ============================================

/**
 * GET /api/knowledge-check/questions
 */
router.get('/questions', requirePermission('kc_questions_view'), (req, res) => {
    try {
        const questions = KnowledgeCheckSystem.getAllQuestions(req.query);
        res.json({ success: true, questions });
    } catch (error) {
        console.error('Get KC questions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch questions' });
    }
});

/**
 * GET /api/knowledge-check/questions/:id
 */
router.get('/questions/:id', requirePermission('kc_questions_view'), (req, res) => {
    try {
        const question = KnowledgeCheckSystem.getQuestionById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        res.json({ success: true, question });
    } catch (error) {
        console.error('Get KC question error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch question' });
    }
});

/**
 * POST /api/knowledge-check/questions
 */
router.post('/questions', requirePermission('kc_questions_create'), (req, res) => {
    try {
        const { questionText, questionType } = req.body;
        
        if (!questionText) {
            return res.status(400).json({ success: false, error: 'Question text is required' });
        }
        
        const question = KnowledgeCheckSystem.createQuestion(req.body);
        res.status(201).json({ success: true, question });
    } catch (error) {
        console.error('Create KC question error:', error);
        res.status(500).json({ success: false, error: 'Failed to create question' });
    }
});

/**
 * PUT /api/knowledge-check/questions/:id
 */
router.put('/questions/:id', requirePermission('kc_questions_edit'), (req, res) => {
    try {
        const question = KnowledgeCheckSystem.getQuestionById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        
        const updated = KnowledgeCheckSystem.updateQuestion(req.params.id, req.body);
        res.json({ success: true, question: updated });
    } catch (error) {
        console.error('Update KC question error:', error);
        res.status(500).json({ success: false, error: 'Failed to update question' });
    }
});

/**
 * DELETE /api/knowledge-check/questions/:id
 */
router.delete('/questions/:id', requirePermission('kc_questions_delete'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteQuestion(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete KC question error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete question' });
    }
});

/**
 * PUT /api/knowledge-check/questions/:id/move
 */
router.put('/questions/:id/move', requirePermission('kc_questions_edit'), (req, res) => {
    try {
        const { categoryId } = req.body;
        
        const question = KnowledgeCheckSystem.moveQuestion(req.params.id, categoryId);
        res.json({ success: true, question });
    } catch (error) {
        console.error('Move KC question error:', error);
        res.status(500).json({ success: false, error: 'Failed to move question' });
    }
});

// ============================================
// TEST RUNS (Testdurchläufe)
// ============================================

/**
 * GET /api/knowledge-check/test-runs
 */
router.get('/test-runs', requirePermission('kc_results_view'), (req, res) => {
    try {
        const runs = KnowledgeCheckSystem.getAllTestRuns(req.query);
        res.json({ success: true, runs });
    } catch (error) {
        console.error('Get test runs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test runs' });
    }
});

/**
 * GET /api/knowledge-check/test-runs/:id
 */
router.get('/test-runs/:id', requirePermission('kc_results_view'), (req, res) => {
    try {
        const run = KnowledgeCheckSystem.getTestRunById(req.params.id);
        if (!run) {
            return res.status(404).json({ success: false, error: 'Test run not found' });
        }
        res.json({ success: true, run });
    } catch (error) {
        console.error('Get test run error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test run' });
    }
});

/**
 * POST /api/knowledge-check/test-runs
 */
router.post('/test-runs', requirePermission('kc_assign_tests'), (req, res) => {
    try {
        const { name, description, testIds, userIds, dueDate, notes } = req.body;
        
        if (!name || !testIds || testIds.length === 0 || !userIds || userIds.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, at least one test, and at least one user are required' 
            });
        }
        
        const run = KnowledgeCheckSystem.createTestRun(req.body, req.user.id);
        res.status(201).json({ success: true, run });
    } catch (error) {
        console.error('Create test run error:', error);
        res.status(500).json({ success: false, error: 'Failed to create test run' });
    }
});

/**
 * PUT /api/knowledge-check/test-runs/:id
 */
router.put('/test-runs/:id', requirePermission('kc_assign_tests'), (req, res) => {
    try {
        const run = KnowledgeCheckSystem.getTestRunById(req.params.id);
        if (!run) {
            return res.status(404).json({ success: false, error: 'Test run not found' });
        }
        
        const updated = KnowledgeCheckSystem.updateTestRun(req.params.id, req.body);
        res.json({ success: true, run: updated });
    } catch (error) {
        console.error('Update test run error:', error);
        res.status(500).json({ success: false, error: 'Failed to update test run' });
    }
});

/**
 * DELETE /api/knowledge-check/test-runs/:id
 */
router.delete('/test-runs/:id', requirePermission('kc_assign_tests'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteTestRun(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete test run error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete test run' });
    }
});

// ============================================
// TESTS
// ============================================

/**
 * GET /api/knowledge-check/tests
 */
router.get('/tests', requirePermission('kc_tests_view'), (req, res) => {
    try {
        const tests = KnowledgeCheckSystem.getAllTests(req.query);
        res.json({ success: true, tests });
    } catch (error) {
        console.error('Get KC tests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tests' });
    }
});

/**
 * GET /api/knowledge-check/tests-with-stats
 * Gets all tests with assignment and result statistics
 */
router.get('/tests-with-stats', requirePermission('kc_results_view'), (req, res) => {
    try {
        const tests = KnowledgeCheckSystem.getTestsWithStats(req.query);
        res.json({ success: true, tests });
    } catch (error) {
        console.error('Get KC tests with stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tests with statistics' });
    }
});

/**
 * GET /api/knowledge-check/tests/:id
 */
router.get('/tests/:id', requirePermission('kc_tests_view'), (req, res) => {
    try {
        const test = KnowledgeCheckSystem.getTestById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        res.json({ success: true, test });
    } catch (error) {
        console.error('Get KC test error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch test' });
    }
});

/**
 * POST /api/knowledge-check/tests
 */
router.post('/tests', requirePermission('kc_tests_create'), (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Test name is required' });
        }
        
        const test = KnowledgeCheckSystem.createTest(req.body);
        res.status(201).json({ success: true, test });
    } catch (error) {
        console.error('Create KC test error:', error);
        res.status(500).json({ success: false, error: 'Failed to create test' });
    }
});

/**
 * PUT /api/knowledge-check/tests/:id
 */
router.put('/tests/:id', requirePermission('kc_tests_edit'), (req, res) => {
    try {
        const test = KnowledgeCheckSystem.getTestById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        
        const updated = KnowledgeCheckSystem.updateTest(req.params.id, req.body);
        res.json({ success: true, test: updated });
    } catch (error) {
        console.error('Update KC test error:', error);
        res.status(500).json({ success: false, error: 'Failed to update test' });
    }
});

/**
 * DELETE /api/knowledge-check/tests/:id
 */
router.delete('/tests/:id', requirePermission('kc_tests_delete'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteTest(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete KC test error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete test' });
    }
});

// ============================================
// RESULTS
// ============================================

/**
 * GET /api/knowledge-check/results
 */
router.get('/results', requirePermission('kc_results_view'), (req, res) => {
    try {
        const results = KnowledgeCheckSystem.getAllResults(req.query);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Get KC results error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch results' });
    }
});

/**
 * GET /api/knowledge-check/results/:id
 * Users can view their own results (with kc_assigned_view) or all results (with kc_results_view)
 */
router.get('/results/:id', (req, res) => {
    try {
        const result = KnowledgeCheckSystem.getResultById(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }
        
        // Check permissions: user can view their own results or needs kc_results_view for others
        const isOwnResult = result.userId === req.user.id;
        const hasAssignedView = hasPermission(req.user, 'kc_assigned_view');
        const hasResultsView = hasPermission(req.user, 'kc_results_view');
        
        if (!isOwnResult && !hasResultsView) {
            return res.status(403).json({ success: false, error: 'Permission denied - cannot view results for other users' });
        }
        
        if (isOwnResult && !hasAssignedView && !hasResultsView) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        
        res.json({ success: true, result });
    } catch (error) {
        console.error('Get KC result error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch result' });
    }
});

/**
 * POST /api/knowledge-check/results
 * Create a test result. Users can create results for themselves when taking assigned tests
 * (requires kc_assigned_view), or managers can create results for anyone (requires kc_results_view)
 */
router.post('/results', (req, res) => {
    try {
        const { testId, userId, answers } = req.body;
        
        if (!testId || !userId) {
            return res.status(400).json({ success: false, error: 'Test ID and User ID are required' });
        }
        
        if (!UserSystem.getById(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user' });
        }
        
        // Check permissions: either user is submitting for themselves (with kc_assigned_view)
        // or has kc_results_view to create results for others
        const isOwnResult = userId === req.user.id;
        const hasAssignedView = hasPermission(req.user, 'kc_assigned_view');
        const hasResultsView = hasPermission(req.user, 'kc_results_view');
        
        if (!isOwnResult && !hasResultsView) {
            return res.status(403).json({ success: false, error: 'Permission denied - cannot create results for other users' });
        }
        
        if (isOwnResult && !hasAssignedView && !hasResultsView) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        
        const result = KnowledgeCheckSystem.createResult(req.body, req.user.id);
        res.status(201).json({ success: true, result });
    } catch (error) {
        console.error('Create KC result error:', error);
        res.status(500).json({ success: false, error: 'Failed to create result' });
    }
});

/**
 * PUT /api/knowledge-check/results/:id
 */
router.put('/results/:id', requirePermission('kc_results_view'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.getResultById(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }
        
        const updated = KnowledgeCheckSystem.updateResult(req.params.id, req.body);
        res.json({ success: true, result: updated });
    } catch (error) {
        console.error('Update KC result error:', error);
        res.status(500).json({ success: false, error: 'Failed to update result' });
    }
});

/**
 * DELETE /api/knowledge-check/results/:id
 */
router.delete('/results/:id', requirePermission('kc_results_delete'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteResult(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete KC result error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete result' });
    }
});

// ============================================
// TEST ASSIGNMENTS
// ============================================

/**
 * GET /api/knowledge-check/assignments
 * Get all assignments (filtered by permissions - users see only their own)
 */
router.get('/assignments', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const filters = { ...req.query };
        
        // Regular users can only see their own assignments
        if (!hasPermission(req.user, 'kc_assign_tests')) {
            filters.userId = req.user.id;
        }
        
        const assignments = KnowledgeCheckSystem.getAllAssignments(filters);
        res.json({ success: true, assignments });
    } catch (error) {
        console.error('Get KC assignments error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
    }
});

/**
 * GET /api/knowledge-check/assignments/my
 * Get current user's assignments
 */
router.get('/assignments/my', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const assignments = KnowledgeCheckSystem.getMyAssignments(req.user.id);
        res.json({ success: true, assignments });
    } catch (error) {
        console.error('Get my assignments error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch your assignments' });
    }
});

/**
 * GET /api/knowledge-check/assignments/pending-count
 * Get pending assignments count for current user
 */
router.get('/assignments/pending-count', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const count = KnowledgeCheckSystem.getPendingAssignmentsCount(req.user.id);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get pending count error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch pending count' });
    }
});

/**
 * GET /api/knowledge-check/assignments/:id
 */
router.get('/assignments/:id', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const assignment = KnowledgeCheckSystem.getAssignmentById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        
        // Check if user can access this assignment
        if (!hasPermission(req.user, 'kc_assign_tests') && assignment.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        res.json({ success: true, assignment });
    } catch (error) {
        console.error('Get KC assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch assignment' });
    }
});

/**
 * POST /api/knowledge-check/assignments
 * Create a new test assignment
 */
router.post('/assignments', requirePermission('kc_assign_tests'), (req, res) => {
    try {
        const { testId, userId, dueDate, notes } = req.body;
        
        if (!testId || !userId) {
            return res.status(400).json({ success: false, error: 'Test ID and User ID are required' });
        }
        
        // Check if test exists
        const test = KnowledgeCheckSystem.getTestById(testId);
        if (!test) {
            return res.status(400).json({ success: false, error: 'Test not found' });
        }
        
        // Check if user exists
        const user = UserSystem.getById(userId);
        if (!user) {
            return res.status(400).json({ success: false, error: 'User not found' });
        }
        
        const assignment = KnowledgeCheckSystem.createAssignment(req.body, req.user.id);
        res.status(201).json({ success: true, assignment });
    } catch (error) {
        console.error('Create KC assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to create assignment' });
    }
});

/**
 * PUT /api/knowledge-check/assignments/:id
 */
router.put('/assignments/:id', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const assignment = KnowledgeCheckSystem.getAssignmentById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        
        // Regular users can only update status when completing
        if (!hasPermission(req.user, 'kc_assign_tests') && assignment.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const updated = KnowledgeCheckSystem.updateAssignment(req.params.id, req.body);
        res.json({ success: true, assignment: updated });
    } catch (error) {
        console.error('Update KC assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to update assignment' });
    }
});

/**
 * DELETE /api/knowledge-check/assignments/:id
 */
router.delete('/assignments/:id', requirePermission('kc_assign_tests'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.deleteAssignment(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Delete KC assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete assignment' });
    }
});

/**
 * GET /api/knowledge-check/assignments/:id/take-test
 * Get full test data for taking an assigned test
 * Only the assigned user can access this
 */
router.get('/assignments/:id/take-test', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const assignment = KnowledgeCheckSystem.getAssignmentById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        
        // Only the assigned user can take the test
        if (assignment.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Access denied - not your assignment' });
        }
        
        // Check assignment status
        if (assignment.status === 'completed') {
            return res.status(400).json({ success: false, error: 'Test already completed' });
        }
        
        // Get the full test with questions
        const test = KnowledgeCheckSystem.getTestById(assignment.testId);
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        
        // Get all questions with their options for this test
        const questions = [];
        for (const tq of test.questions || []) {
            const question = KnowledgeCheckSystem.getQuestionById(tq.questionId);
            if (question) {
                questions.push({
                    ...question,
                    effectiveWeighting: tq.customWeighting || question.weighting || question.categoryWeighting || 1
                });
            }
        }
        
        res.json({ 
            success: true, 
            test: {
                id: test.id,
                testNumber: test.testNumber,
                name: test.name,
                description: test.description,
                passingScore: test.passingScore,
                timeLimitMinutes: test.timeLimitMinutes
            },
            questions,
            assignment: {
                id: assignment.id,
                dueDate: assignment.dueDate,
                notes: assignment.notes
            }
        });
    } catch (error) {
        console.error('Get take-test data error:', error);
        res.status(500).json({ success: false, error: 'Failed to load test data' });
    }
});

// ============================================
// STATISTICS & EXPORT
// ============================================

/**
 * GET /api/knowledge-check/stats
 */
router.get('/stats', requirePermission('kc_view'), (req, res) => {
    try {
        const userId = req.user?.id;
        const statistics = KnowledgeCheckSystem.getStatistics(userId);
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get KC stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

/**
 * GET /api/knowledge-check/export/results
 */
router.get('/export/results', requirePermission('kc_results_view'), (req, res) => {
    try {
        const results = KnowledgeCheckSystem.getAllResults(req.query);
        
        // Generate CSV
        const headers = ['Result #', 'Test', 'User', 'Evaluator', 'Score', 'Percentage', 'Passed', 'Date'];
        const rows = results.map(r => [
            r.resultNumber,
            r.testName,
            r.userName,
            r.evaluatorName || '',
            `${r.totalScore}/${r.maxScore}`,
            `${r.percentage}%`,
            r.passed ? 'Yes' : 'No',
            r.completedAt ? new Date(r.completedAt).toLocaleDateString() : ''
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        res.json({ success: true, data: csv });
    } catch (error) {
        console.error('Export KC results error:', error);
        res.status(500).json({ success: false, error: 'Failed to export results' });
    }
});

/**
 * POST /api/knowledge-check/check-answer
 * Helper endpoint to check an open-ended answer
 * Users with kc_assigned_view can check answers while taking their tests
 */
router.post('/check-answer', requirePermission('kc_assigned_view'), (req, res) => {
    try {
        const { answer, exactAnswer, triggerWords } = req.body;
        
        const result = KnowledgeCheckSystem.checkOpenAnswer(answer, exactAnswer, triggerWords || []);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Check answer error:', error);
        res.status(500).json({ success: false, error: 'Failed to check answer' });
    }
});

// ============================================
// ARCHIVE
// ============================================

/**
 * GET /api/knowledge-check/archive/stats
 */
router.get('/archive/stats', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const stats = KnowledgeCheckSystem.getArchiveStatistics();
        res.json({ success: true, statistics: stats });
    } catch (error) {
        console.error('Get archive stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch archive statistics' });
    }
});

/**
 * GET /api/knowledge-check/archive/questions
 */
router.get('/archive/questions', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const questions = KnowledgeCheckSystem.getAllQuestions({ archivedOnly: true });
        res.json({ success: true, questions });
    } catch (error) {
        console.error('Get archived questions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch archived questions' });
    }
});

/**
 * GET /api/knowledge-check/archive/tests
 */
router.get('/archive/tests', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const tests = KnowledgeCheckSystem.getAllTests({ archivedOnly: true });
        res.json({ success: true, tests });
    } catch (error) {
        console.error('Get archived tests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch archived tests' });
    }
});

/**
 * PUT /api/knowledge-check/archive/questions/:id/restore
 */
router.put('/archive/questions/:id/restore', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const question = KnowledgeCheckSystem.restoreQuestion(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        res.json({ success: true, question });
    } catch (error) {
        console.error('Restore question error:', error);
        res.status(500).json({ success: false, error: 'Failed to restore question' });
    }
});

/**
 * PUT /api/knowledge-check/archive/tests/:id/restore
 */
router.put('/archive/tests/:id/restore', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const test = KnowledgeCheckSystem.restoreTest(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        res.json({ success: true, test });
    } catch (error) {
        console.error('Restore test error:', error);
        res.status(500).json({ success: false, error: 'Failed to restore test' });
    }
});

/**
 * DELETE /api/knowledge-check/archive/questions/:id
 */
router.delete('/archive/questions/:id', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.permanentDeleteQuestion(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Permanent delete question error:', error);
        res.status(500).json({ success: false, error: 'Failed to permanently delete question' });
    }
});

/**
 * DELETE /api/knowledge-check/archive/tests/:id
 */
router.delete('/archive/tests/:id', requirePermission('kc_archive_access'), (req, res) => {
    try {
        const result = KnowledgeCheckSystem.permanentDeleteTest(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Permanent delete test error:', error);
        res.status(500).json({ success: false, error: 'Failed to permanently delete test' });
    }
});

module.exports = router;
