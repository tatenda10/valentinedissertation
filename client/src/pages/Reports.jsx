import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLoans: 0,
    totalAmount: 0,
    approvedLoans: 0,
    rejectedLoans: 0,
    pendingLoans: 0,
    averageLoanAmount: 0,
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/loans/statistics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading reports...</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <h1>Reports & Analytics</h1>
      <p>Loan performance metrics</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Total Loans</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalLoans}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Total Amount</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>${parseFloat(stats.totalAmount || 0).toLocaleString()}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Approved Loans</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'green' }}>{stats.approvedLoans}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Rejected Loans</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'red' }}>{stats.rejectedLoans}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Pending Loans</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'orange' }}>{stats.pendingLoans}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Average Loan</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>${parseFloat(stats.averageLoanAmount || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;