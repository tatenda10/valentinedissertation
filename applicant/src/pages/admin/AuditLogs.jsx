// frontend/src/pages/admin/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', date: '', limit: 100 });
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    fetchLogs();
  }, [filters]);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.date) params.append('date', filters.date);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await axios.get(`/api/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data.logs || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Admin privileges required.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const getActionBadge = (action) => {
    if (action === 'LOAN_APPROVED') return <span className="badge-approve">✅ Approved</span>;
    if (action === 'LOAN_REJECTED') return <span className="badge-reject">❌ Rejected</span>;
    return <span className="badge-default">{action || 'Unknown'}</span>;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="audit-logs-container">
      <h1>📋 Audit Logs</h1>
      <p>Track all administrative actions and security events</p>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-value">{summary.total || 0}</div>
          <div className="summary-label">Total Actions</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.total_approvals || 0}</div>
          <div className="summary-label">Approvals</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.total_rejections || 0}</div>
          <div className="summary-label">Rejections</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.unique_admins || 0}</div>
          <div className="summary-label">Active Admins</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="filters-bar">
        <select 
          value={filters.action} 
          onChange={(e) => setFilters({...filters, action: e.target.value})}
        >
          <option value="">All Actions</option>
          <option value="LOAN_APPROVED">Loan Approved</option>
          <option value="LOAN_REJECTED">Loan Rejected</option>
        </select>
        
        <input 
          type="date" 
          value={filters.date} 
          onChange={(e) => setFilters({...filters, date: e.target.value})}
        />
        
        <select 
          value={filters.limit} 
          onChange={(e) => setFilters({...filters, limit: e.target.value})}
        >
          <option value="50">Last 50</option>
          <option value="100">Last 100</option>
          <option value="200">Last 200</option>
          <option value="500">Last 500</option>
        </select>
        
        <button className="btn-refresh" onClick={fetchLogs}>🔄 Refresh</button>
      </div>
      
      {/* Logs Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="no-data">No audit logs found</div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>{log.admin_username || log.admin_name || `Admin #${log.admin_id}`}</td>
                  <td>{getActionBadge(log.action)}</td>
                  <td>{log.entity_type || '-'} #{log.entity_id || '-'}</td>
                  <td className="details-cell">{log.details || '-'}</td>
                  <td><code>{log.ip_address || '-'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <style>{`
        .audit-logs-container { padding: 24px; background: #f5f7fa; min-height: 100vh; font-family: Arial, sans-serif; }
        h1 { margin: 0 0 8px 0; color: #1a1a2e; }
        p { color: #666; margin-bottom: 20px; }
        .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
        .summary-card { background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .summary-value { font-size: 32px; font-weight: bold; color: #1a1a2e; }
        .summary-label { font-size: 14px; color: #666; margin-top: 8px; }
        .filters-bar { display: flex; gap: 12px; margin-bottom: 20px; background: white; padding: 16px; border-radius: 12px; flex-wrap: wrap; }
        .filters-bar select, .filters-bar input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
        .btn-refresh { padding: 8px 16px; background: #1a1a2e; color: white; border: none; border-radius: 6px; cursor: pointer; }
        .btn-refresh:hover { background: #16213e; }
        .table-container { background: white; border-radius: 12px; overflow-x: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table th, .audit-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
        .audit-table th { background: #f8f9fa; font-weight: 600; color: #333; }
        .details-cell { max-width: 300px; word-wrap: break-word; font-size: 13px; color: #555; }
        .badge-approve, .badge-reject, .badge-default { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .badge-approve { background: #d4edda; color: #155724; }
        .badge-reject { background: #f8d7da; color: #721c24; }
        .badge-default { background: #e2e3e5; color: #383d41; }
        code { background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
        .loading, .no-data { text-align: center; padding: 40px; color: #666; }
        @media (max-width: 768px) {
          .summary-cards { grid-template-columns: repeat(2, 1fr); }
          .audit-table { font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default AuditLogs;