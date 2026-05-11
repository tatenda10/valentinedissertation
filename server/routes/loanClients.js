const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const LoanClients = require('../controllers/loan clients/LoanClients');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoanClient:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated client ID
 *         email:
 *           type: string
 *           format: email
 *           description: Client's email address
 *         password:
 *           type: string
 *           description: Client's password (will be hashed)
 *         firstName:
 *           type: string
 *           description: Client's first name
 *         lastName:
 *           type: string
 *           description: Client's last name
 *         phoneNumber:
 *           type: string
 *           description: Client's phone number
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Client's date of birth
 *         employmentStatus:
 *           type: string
 *           enum: [employed, self-employed, unemployed, retired]
 *         monthlyIncome:
 *           type: number
 *           description: Client's monthly income
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Loan Clients
 *   description: Loan client management endpoints
 */

/**
 * @swagger
 * /api/loan-clients/register:
 *   post:
 *     summary: Register a new loan client
 *     tags: [Loan Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoanClient'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid input or client already exists
 *       500:
 *         description: Server error
 */
router.post('/register', LoanClients.register);

/**
 * @swagger
 * /api/loan-clients/login:
 *   post:
 *     summary: Login a loan client
 *     tags: [Loan Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 client:
 *                   $ref: '#/components/schemas/LoanClient'
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', LoanClients.login);

/**
 * @swagger
 * /api/loan-clients/profile:
 *   get:
 *     summary: Get current client profile
 *     tags: [Loan Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client:
 *                   $ref: '#/components/schemas/LoanClient'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.get('/profile', authenticate, LoanClients.getCurrentUser);

/**
 * @swagger
 * /api/loan-clients/profile:
 *   put:
 *     summary: Update client profile
 *     tags: [Loan Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               employmentStatus:
 *                 type: string
 *                 enum: [employed, self-employed, unemployed, retired]
 *               monthlyIncome:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.put('/profile', authenticate, LoanClients.updateProfile);

/**
 * @swagger
 * /api/loan-clients/all:
 *   get:
 *     summary: Retrieve all loan clients
 *     tags: [Loan Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of loan clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoanClient'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/all', authenticate, LoanClients.getAllClients);

module.exports = router;  