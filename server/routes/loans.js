const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isClient } = require('../middleware/auth');
const LoansController = require('../controllers/loans/LoansController');
const upload = require('../middleware/upload');

/**
 * @swagger
 * components:
 *   schemas:
 *     Loan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         loan_reference:
 *           type: string
 *         client_id:
 *           type: integer
 *         amount:
 *           type: string
 *         purpose:
 *           type: string
 *         duration:
 *           type: integer
 *         interest_rate:
 *           type: string
 *         monthly_payment:
 *           type: string
 *         status:
 *           type: string
 *           enum: [approved, rejected, pending]
 *         decision_reason:
 *           type: string
 *         monthly_income:
 *           type: string
 *         employment_status:
 *           type: string
 *         existing_loans:
 *           type: integer
 *         application_date:
 *           type: string
 *           format: date-time
 *         decision_date:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Loans
 *     description: Loan management endpoints
 */

/**
 * @swagger
 * /api/loans/submit:
 *   post:
 *     summary: Submit a new loan application
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - purpose
 *               - duration
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               purpose:
 *                 type: string
 *                 example: "Small business expansion"
 *               duration:
 *                 type: integer
 *                 example: 12
 *               monthlyIncome:
 *                 type: number
 *                 example: 150000
 *               employmentStatus:
 *                 type: string
 *                 enum: [employed, self-employed, unemployed, retired]
 *                 example: "employed"
 *               existingLoans:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       201:
 *         description: Loan application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 loan:
 *                   $ref: '#/components/schemas/Loan'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/submit', authenticate, isClient, LoansController.submitLoan);

/**
 * @swagger
 * /api/loans/analyze-statement:
 *   post:
 *     summary: Upload and parse an EcoCash PDF statement
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - statement
 *             properties:
 *               statement:
 *                 type: string
 *                 format: binary
 *                 description: EcoCash PDF statement file
 *     responses:
 *       200:
 *         description: Statement parsed successfully
 *       400:
 *         description: Missing PDF file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/analyze-statement', authenticate, isClient, upload.single('statement'), LoansController.analyzeEcoCashStatement);

/**
 * @swagger
 * /api/loans/submit-with-pdf:
 *   post:
 *     summary: Submit a new loan application with EcoCash PDF statement
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - purpose
 *               - duration
 *               - statement
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               purpose:
 *                 type: string
 *                 example: "Small business expansion"
 *               duration:
 *                 type: integer
 *                 example: 12
 *               monthlyIncome:
 *                 type: number
 *                 example: 150000
 *               employmentStatus:
 *                 type: string
 *                 example: "self_employed"
 *               existingLoans:
 *                 type: integer
 *                 example: 0
 *               clientId:
 *                 type: integer
 *                 example: 1
 *               statement:
 *                 type: string
 *                 format: binary
 *                 description: EcoCash PDF statement file
 *     responses:
 *       201:
 *         description: Loan application submitted successfully with PDF
 *       400:
 *         description: Missing PDF file or required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/submit-with-pdf', authenticate, isClient, upload.single('statement'), LoansController.submitLoanWithPDF);

/**
 * @swagger
 * /api/loans/client/{clientId}:
 *   get:
 *     summary: Get all loans for a specific client
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID to fetch loans for
 *     responses:
 *       200:
 *         description: List of client's loans with summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Loan'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalLoans:
 *                       type: integer
 *                     activeLoans:
 *                       type: integer
 *                     rejectedLoans:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only access own loans unless admin
 *       404:
 *         description: Client not found
 */
router.get('/client/:clientId', authenticate, LoansController.getClientLoans);

/**
 * @swagger
 * /api/loans/all:
 *   get:
 *     summary: Get all loans (Admin only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all loans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Loan'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/all', authenticate, isAdmin, LoansController.getAllLoans);

/**
 * @swagger
 * /api/loans/approved:
 *   get:
 *     summary: Get approved loans (Admin only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved loans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Loan'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/approved', authenticate, isAdmin, LoansController.getApprovedLoans);

/**
 * @swagger
 * /api/loans/rejected:
 *   get:
 *     summary: Get rejected loans (Admin only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rejected loans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Loan'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/rejected', authenticate, isAdmin, LoansController.getRejectedLoans);

/**
 * @swagger
 * /api/loans/pending:
 *   get:
 *     summary: Get pending loans for review (Admin only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending loans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Loan'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/pending', authenticate, isAdmin, async (req, res) => {
    try {
        const { getConnection } = require('../config/database');
        const connection = await getConnection();
        const [loans] = await connection.execute(
            `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
             FROM loans l
             JOIN clients c ON l.client_id = c.id
             WHERE l.status = 'pending'
             ORDER BY l.application_date ASC`,
        );
        connection.release();
        res.json({ loans });
    } catch (error) {
        console.error('Get pending loans error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/**
 * @swagger
 * /api/loans/statistics:
 *   get:
 *     summary: Get loan statistics for dashboard (Admin only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loan statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLoans:
 *                   type: integer
 *                 totalAmount:
 *                   type: number
 *                 approvedLoans:
 *                   type: integer
 *                 rejectedLoans:
 *                   type: integer
 *                 pendingLoans:
 *                   type: integer
 *                 averageLoanAmount:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/statistics', authenticate, isAdmin, async (req, res) => {
    try {
        const { getConnection } = require('../config/database');
        const connection = await getConnection();
        const [[stats]] = await connection.execute(`
            SELECT 
                COUNT(*) as totalLoans,
                SUM(amount) as totalAmount,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedLoans,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedLoans,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingLoans,
                AVG(amount) as averageLoanAmount
            FROM loans
        `);
        connection.release();
        res.json(stats);
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ================= NEW REPORT ENDPOINTS =================

/**
 * @swagger
 * /api/loans/reports/monthly:
 *   get:
 *     summary: Get monthly loan trends (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly loan data for charts
 */
router.get('/reports/monthly', authenticate, isAdmin, async (req, res) => {
    const { getConnection } = require('../config/database');
    const connection = await getConnection();
    try {
        const [data] = await connection.execute(`
            SELECT 
                DATE_FORMAT(MIN(application_date), '%b') as month,
                COUNT(*) as loans,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM loans
            WHERE application_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(application_date), MONTH(application_date)
            ORDER BY YEAR(application_date) ASC, MONTH(application_date) ASC
        `);
        res.json(data);
    } catch (error) {
        console.error('Get monthly reports error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @swagger
 * /api/loans/reports/gender:
 *   get:
 *     summary: Get loan distribution by gender (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gender distribution data
 */
router.get('/reports/gender', authenticate, isAdmin, async (req, res) => {
    const { getConnection } = require('../config/database');
    const connection = await getConnection();
    try {
        const [data] = await connection.execute(`
            SELECT 
                SUM(CASE WHEN c.gender = 'male' THEN 1 ELSE 0 END) as male,
                SUM(CASE WHEN c.gender = 'female' THEN 1 ELSE 0 END) as female
            FROM clients c
            JOIN loans l ON l.client_id = c.id
            WHERE c.gender IS NOT NULL
        `);
        res.json(data[0] || { male: 0, female: 0 });
    } catch (error) {
        console.error('Get gender reports error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// ================= PDF VIEWING ENDPOINT (NEW) =================

/**
 * @swagger
 * /api/loans/pdf/{filename}:
 *   get:
 *     summary: View uploaded PDF statement (Admin only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: PDF filename to view
 *     responses:
 *       200:
 *         description: PDF file
 *       403:
 *         description: Forbidden
 *       404:
 *         description: File not found
 */
router.get('/pdf/:filename', authenticate, isAdmin, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { filename } = req.params;
        
        // Security: prevent directory traversal attacks
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(403).json({ message: 'Invalid filename' });
        }
        
        // Define the upload directory (update this to match your uploads folder)
        const uploadDir = path.join(__dirname, '../uploads');
        const filePath = path.join(uploadDir, filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'PDF file not found' });
        }
        
        // Send the PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(filePath);
        
    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).json({ message: 'Error loading PDF file' });
    }
});

/**
 * @swagger
 * /api/loans/{id}:
 *   get:
 *     summary: Get specific loan by ID
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Loan details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loan:
 *                   $ref: '#/components/schemas/Loan'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only access own loans unless admin
 *       404:
 *         description: Loan not found
 */
router.get('/:id', authenticate, LoansController.getLoanById);

router.get('/:id/repayments', authenticate, LoansController.getLoanRepayments);

router.post('/:id/repayments', authenticate, LoansController.recordRepayment);

/**
 * @swagger
 * /api/loans/{id}/status:
 *   put:
 *     summary: Update loan status (approve/reject) - Admin only
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Loan ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *                 example: "approved"
 *               decision_reason:
 *                 type: string
 *                 example: "Good credit score and stable income"
 *               interest_rate:
 *                 type: string
 *                 example: "12.5"
 *               monthly_payment:
 *                 type: string
 *                 example: "458.33"
 *     responses:
 *       200:
 *         description: Loan status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Loan'
 *       400:
 *         description: Invalid status or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Loan not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', authenticate, isAdmin, LoansController.updateLoanStatus);

module.exports = router;
