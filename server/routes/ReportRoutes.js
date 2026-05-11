const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Reports = require('../controllers/Reports/Reports');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Endpoints for generating various reports
 */

/**
 * @swagger
 * /api/reports/loan-summary:
 *   get:
 *     summary: Generate a loan summary report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loan summary report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalLoans:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     approvedLoans:
 *                       type: integer
 *                     rejectedLoans:
 *                       type: integer
 *                     averageLoanAmount:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/loan-summary', authenticate, Reports.generateLoanSummaryReport);

/**
 * @swagger
 * /api/reports/client-demographics:
 *   get:
 *     summary: Generate a client demographics report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client demographics report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 demographics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       employment_status:
 *                         type: string
 *                       clientCount:
 *                         type: integer
 *                       averageIncome:
 *                         type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/client-demographics', authenticate, Reports.generateClientDemographicsReport);

/**
 * @swagger
 * /api/reports/approved-loans-by-gender:
 *   get:
 *     summary: Generate a report of approved loans by gender
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved loans by gender report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       gender:
 *                         type: string
 *                       approvedLoans:
 *                         type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/approved-loans-by-gender', authenticate, Reports.generateApprovedLoansByGenderReport);

/**
 * @swagger
 * /api/reports/loans-by-month:
 *   get:
 *     summary: Generate a report of loans by month
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loans by month report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                       totalLoans:
 *                         type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/loans-by-month', authenticate, Reports.generateLoansByMonthReport);

module.exports = router;
