const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { getConnection } = require('../config/database');

const getAuditSchemaConfig = async (connection) => {
  const [columns] = await connection.execute('SHOW COLUMNS FROM audit_logs');
  const fieldNames = new Set(columns.map((column) => column.Field));
  const usesAdminSchema = fieldNames.has('action') && fieldNames.has('admin_username');

  return {
    fieldNames,
    actorIdColumn: fieldNames.has('admin_id') ? 'admin_id' : 'user_id',
    actionColumn: usesAdminSchema ? 'action' : 'action_type',
    actorLabelColumn: usesAdminSchema
      ? "COALESCE(admin_username, CONCAT('Admin #', admin_id))"
      : "COALESCE(CONCAT('User #', user_id), 'System')",
    detailsColumn: usesAdminSchema ? 'details' : 'action_description',
    statusColumn: fieldNames.has('status') ? 'status' : null,
  };
};

const buildAuditWhereClause = ({ action, date, actorId }, config) => {
  const conditions = [];
  const params = [];

  if (action) {
    conditions.push(`${config.actionColumn} LIKE ?`);
    params.push(`%${action}%`);
  }

  if (date) {
    conditions.push('DATE(created_at) = ?');
    params.push(date);
  }

  if (actorId) {
    conditions.push(`${config.actorIdColumn} = ?`);
    params.push(actorId);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
};

router.get('/audit-logs', authenticate, isAdmin, async (req, res) => {
  const connection = await getConnection();

  try {
    const { action, date, admin_id, user_id, limit = 100 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const schemaConfig = await getAuditSchemaConfig(connection);
    const actorId = admin_id || user_id || null;
    const { clause, params } = buildAuditWhereClause({ action, date, actorId }, schemaConfig);

    const [logs] = await connection.execute(
      `
        SELECT
          id,
          created_at,
          ${schemaConfig.actorIdColumn} AS actor_id,
          ${schemaConfig.actionColumn} AS action,
          ${schemaConfig.actorLabelColumn} AS actor_name,
          ${schemaConfig.detailsColumn} AS details,
          ip_address,
          ${schemaConfig.fieldNames.has('user_agent') ? 'user_agent' : 'NULL'} AS user_agent,
          ${schemaConfig.fieldNames.has('error_message') ? 'error_message' : 'NULL'} AS error_message,
          entity_type,
          entity_id,
          ${schemaConfig.statusColumn ? `${schemaConfig.statusColumn}` : 'NULL'} AS status
        FROM audit_logs
        ${clause}
        ORDER BY created_at DESC
        LIMIT ${parsedLimit}
      `,
      params,
    );

    const [summaryRows] = await connection.execute(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(DISTINCT ${schemaConfig.actorIdColumn}) AS unique_actors,
          SUM(CASE WHEN ${schemaConfig.actionColumn} = 'LOAN_APPROVED' THEN 1 ELSE 0 END) AS total_approvals,
          SUM(CASE WHEN ${schemaConfig.actionColumn} = 'LOAN_REJECTED' THEN 1 ELSE 0 END) AS total_rejections
        FROM audit_logs
        ${clause}
      `,
      params,
    );

    res.json({
      success: true,
      logs,
      summary: summaryRows[0] || {
        total: 0,
        unique_actors: 0,
        total_approvals: 0,
        total_rejections: 0,
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error while fetching audit logs', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/audit-logs/:id', authenticate, isAdmin, async (req, res) => {
  const connection = await getConnection();

  try {
    const schemaConfig = await getAuditSchemaConfig(connection);
    const [logs] = await connection.execute(
      `
        SELECT
          id,
          created_at,
          ${schemaConfig.actorIdColumn} AS actor_id,
          ${schemaConfig.actionColumn} AS action,
          ${schemaConfig.actorLabelColumn} AS actor_name,
          ${schemaConfig.detailsColumn} AS details,
          ip_address,
          ${schemaConfig.fieldNames.has('user_agent') ? 'user_agent' : 'NULL'} AS user_agent,
          ${schemaConfig.fieldNames.has('error_message') ? 'error_message' : 'NULL'} AS error_message,
          entity_type,
          entity_id,
          ${schemaConfig.statusColumn ? `${schemaConfig.statusColumn}` : 'NULL'} AS status
        FROM audit_logs
        WHERE id = ?
      `,
      [req.params.id],
    );

    if (!logs.length) {
      return res.status(404).json({ message: 'Audit log not found' });
    }

    res.json({ log: logs[0] });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ message: 'Server error while fetching audit log', error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
