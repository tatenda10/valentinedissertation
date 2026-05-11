const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const swaggerUI = require('swagger-ui-express')
const specs = require('./config/swagger.js')
const db = require('./config/database.js')
const { defaultLimiter } = require('./middleware/rateLimiter')
const logger = require('./config/logger')

// Import routes
const userRoutes = require('./routes/userRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const rolesRoutes = require('./routes/roles.js')
const loansRoutes = require('./routes/loans.js')
const loanClientsRoutes = require('./routes/loanClients.js')
const reportRoutes = require('./routes/ReportRoutes.js')
const auditRoutes = require('./routes/auditRoutes.js')  // ADD THIS LINE

const app = express()

// ✅ FIXED CORS (IMPORTANT)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:5174'],
  credentials: true
}))

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Apply rate limiting to all routes
app.use(defaultLimiter)

// Basic route for API health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running' })
})

// Swagger Documentation
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(specs))

// Test database connection
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    logger.info('Successfully connected to MySQL database');
    connection.release();
  } catch (error) {
    logger.error('Error connecting to the database:', error.message);
    process.exit(1);
  }
};

// Initialize database connection
testConnection();

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/roles', rolesRoutes)
app.use('/api/loans', loansRoutes)
app.use('/api/loan-clients', loanClientsRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', auditRoutes)  // ADD THIS LINE

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});