import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    try {
      const response = await axios.get(`/api/loans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoan(response.data.loan);
    } catch (error) {
      console.error('Error fetching loan:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewPDF = () => {
    if (loan?.statement_path) {
      // Extract filename from path
      const filename = loan.statement_path.split('/').pop();
      window.open(`/api/loans/pdf/${filename}`, '_blank');
    } else {
      alert('No PDF statement uploaded for this loan');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span style={{ background: '#28a745', color: 'white', padding: '4px 12px', borderRadius: '20px' }}>✅ Approved</span>;
      case 'rejected':
        return <span style={{ background: '#dc3545', color: 'white', padding: '4px 12px', borderRadius: '20px' }}>❌ Rejected</span>;
      default:
        return <span style={{ background: '#ffc107', color: '#856404', padding: '4px 12px', borderRadius: '20px' }}>⏳ Pending</span>;
    }
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading loan details...</div>;
  }

  if (!loan) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loan not found</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <button 
        onClick={() => navigate('/loans')}
        style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}
      >
        ← Back to Loans
      </button>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 20px 0' }}>Loan Details</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div>
            <p><strong>Reference Number:</strong></p>
            <p>{loan.loan_reference}</p>
          </div>
          <div>
            <p><strong>Status:</strong></p>
            <p>{getStatusBadge(loan.status)}</p>
          </div>
          <div>
            <p><strong>Amount:</strong></p>
            <p>${parseFloat(loan.amount).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Duration:</strong></p>
            <p>{loan.duration} months</p>
          </div>
          <div>
            <p><strong>Monthly Payment:</strong></p>
            <p>${parseFloat(loan.monthly_payment || 0).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Monthly Income:</strong></p>
            <p>${parseFloat(loan.monthly_income || 0).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Purpose:</strong></p>
            <p>{loan.purpose || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Interest Rate:</strong></p>
            <p>{loan.interest_rate}%</p>
          </div>
          <div>
            <p><strong>Employment Status:</strong></p>
            <p>{loan.employment_status || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Existing Loans:</strong></p>
            <p>{loan.existing_loans || 0}</p>
          </div>
          <div>
            <p><strong>Application Date:</strong></p>
            <p>{new Date(loan.application_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p><strong>Decision Date:</strong></p>
            <p>{loan.decision_date ? new Date(loan.decision_date).toLocaleDateString() : 'Pending'}</p>
          </div>
        </div>

        {loan.decision_reason && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#f8d7da', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
            <p><strong>Decision Reason:</strong></p>
            <p style={{ margin: 0 }}>{loan.decision_reason}</p>
          </div>
        )}

        {/* PDF View Button */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button 
            onClick={viewPDF}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📄 View Uploaded Statement (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;