const { verifyToken } = require('../utils/jwt');
const logger = require('../config/logger');
const { getConnection } = require('../config/database');
const AuditLogger = require('../services/auditLogger');
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            logger.warn('No token provided');
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
           const decoded = verifyToken(token);

            // Normalize token payload
            req.user = {
                ...decoded,
                userId: decoded.userId || decoded.clientId || decoded.id,
                // Ensure roles is always an array
                roles: decoded.roles ? (
                    Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles]
                ) : ['client'] // Default role if none provided
            };

            // Log successful authentication
            await AuditLogger.log({
                userId: req.user.userId,
                actionType: AuditLogger.ACTION_TYPES.LOGIN,
                actionDescription: 'User authenticated successfully',
                entityType: 'USER',
                entityId: req.user.userId,
                req,
                status: AuditLogger.STATUS.SUCCESS
            });

            next();
        } catch (error) {
            logger.warn('Invalid token:', { error: error.message });
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        logger.error('Authentication error:', { error: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const { userId, roles } = req.user;

            if (!roles || !roles.some(role => allowedRoles.includes(role))) {
                // Log unauthorized access attempt
                await AuditLogger.log({
                    userId,
                    actionType: AuditLogger.ACTION_TYPES.UPDATE,
                    actionDescription: 'Unauthorized access attempt',
                    entityType: 'USER',
                    entityId: userId,
                    req,
                    status: AuditLogger.STATUS.FAILURE,
                    errorMessage: `Required roles: ${allowedRoles.join(', ')}`
                });

                return res.status(403).json({ 
                    message: 'You do not have permission to perform this action' 
                });
            }

            next();
        } catch (error) {
            logger.error('Authorization error:', { error: error.message });
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                logger.warn('Request validation failed:', { 
                    error: error.details[0].message,
                    body: req.body 
                });
                return res.status(400).json({ 
                    message: error.details[0].message 
                });
            }
            next();
        } catch (error) {
            logger.error('Validation error:', { error: error.message });
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

/**
 * Middleware to check if user has required roles
 * @param {string[]} requiredRoles - Array of role names required for access
 */
const hasRoles = (requiredRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists
            if (!req.user) {
                logger.warn('Role check failed: No user found');
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Get user roles (always array)
            const userRoles = req.user.roles || ['client'];
            
            // Normalize to lowercase for case-insensitive comparison
            const normalizedUserRoles = userRoles.map(r => String(r).toLowerCase());
            const normalizedRequired = requiredRoles.map(r => String(r).toLowerCase());

            const hasRequiredRole = normalizedUserRoles.some(role => 
                normalizedRequired.includes(role)
            );

            if (!hasRequiredRole) {
                logger.warn('Role check failed:', {
                    userId: req.user.userId,
                    userRoles: userRoles,
                    requiredRoles: requiredRoles
                });

                return res.status(403).json({ 
                    message: 'You do not have the required role to perform this action',
                    required: requiredRoles,
                    yourRoles: userRoles
                });
            }

            next();
        } catch (error) {
            logger.error('Role check error:', { error: error.message });
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

// Convenience middleware for common roles
const isAdmin = hasRoles(['admin']);
const isClient = hasRoles(['client', 'loan_client']);
const isStaff = hasRoles(['staff', 'admin']);

module.exports = {
    authenticate,
    authorize,
    validateRequest,
    hasRoles,
    isAdmin,      // New: Quick admin check
    isClient,     // New: Quick client check
    isStaff       // New: Quick staff/admin check
};