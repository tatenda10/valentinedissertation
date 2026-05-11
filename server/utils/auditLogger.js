// backend/utils/auditLogger.js
const { getConnection } = require('../config/database');

const logAudit = async (adminId, adminUsername, action, entityType, entityId, details, ipAddress) => {
  const connection = await getConnection();
  
  try {
    await connection.execute(
      `INSERT INTO audit_logs (admin_id, admin_username, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [adminId, adminUsername, action, entityType || null, entityId || null, details || null, ipAddress || null]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging shouldn't break the main flow
  } finally {
    connection.release();
  }
};

const getAuditLogs = async (filters = {}) => {
  const connection = await getConnection();
  
  try {
    let query = `SELECT * FROM audit_logs ORDER BY created_at DESC`;
    let params = [];
    
    if (filters.action) {
      query = `SELECT * FROM audit_logs WHERE action LIKE ? ORDER BY created_at DESC`;
      params = [`%${filters.action}%`];
    }
    
    if (filters.date) {
      query = `SELECT * FROM audit_logs WHERE DATE(created_at) = ? ORDER BY created_at DESC`;
      params = [filters.date];
    }
    
    if (filters.admin_id) {
      query = `SELECT * FROM audit_logs WHERE admin_id = ? ORDER BY created_at DESC`;
      params = [filters.admin_id];
    }
    
    const [logs] = await connection.execute(query, params);
    return logs;
  } catch (error) {
    console.error('Get audit logs error:', error);
    return [];
  } finally {
    connection.release();
  }
};

module.exports = { logAudit, getAuditLogs };