// backend/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { getConnection } = require('../config/database');

// Get all audit logs (Admin only)
router.get('/audit-logs', authenticate, isAdmin, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { action, date, admin_id, limit = 100 } = req.query;
    
    let query = `
      SELECT al.*, 
             CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) as admin_name
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      WHERE 1=1
    `;
    let params = [];
    
    if (action) {
      query += ` AND al.action LIKE ?`;
      params.push(`%${action}%`);
    }
    
    if (date) {
      query += ` AND DATE(al.created_at) = ?`;
      params.push(date);
    }
    
    if (admin_id) {
      query += ` AND al.admin_id = ?`;
      params.push(admin_id);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const [logs] = await connection.execute(query, params);
    
    // Get summary stats
    const [summary] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT admin_id) as unique_admins,
        SUM(CASE WHEN action = 'LOAN_APPROVED' THEN 1 ELSE 0 END) as total_approvals,
        SUM(CASE WHEN action = 'LOAN_REJECTED' THEN 1 ELSE 0 END) as total_rejections
      FROM audit_logs
    `);
    
    res.json({
      success: true,
      logs: logs,
      summary: summary[0]
    });
    
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
});

// Get single audit log by ID
router.get('/audit-logs/:id', authenticate, isAdmin, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { id } = req.params;
    const [logs] = await connection.execute(
      `SELECT * FROM audit_logs WHERE id = ?`,
      [id]
    );
    
    if (logs.length === 0) {
      return res.status(404).json({ message: 'Audit log not found' });
    }
    
    res.json({ log: logs[0] });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;