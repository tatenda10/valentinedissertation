import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../utils/Api';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_URL}/loans/${id}`);
        setLoan(response.data?.loan || null);
      } catch (fetchError) {
        const errorMessage =
          fetchError.response?.data?.message ||
          fetchError.message ||
          'Failed to load loan details';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchLoanDetails();
  }, [id]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Pending';

  const getStatusBadge = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (normalized === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  const viewPDF = () => {
    if (!loan?.statement_path) {
      window.alert('No PDF statement was uploaded for this loan.');
      return;
    }

    const filename = loan.statement_path.split(/[/\\]/).pop();
    window.open(`${API_URL}/loans/pdf/${filename}`, '_blank');
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">Loading loan details...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>;
  }

  if (!loan) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">Loan not found.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <button
          type="button"
          onClick={() => navigate('/loans')}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Back to Loans
        </button>
        <h1 className="mt-4 text-2xl font-semibold">Loan Details</h1>
        <p className="mt-2 text-sm text-slate-200">
          Inspect the application, review the rejection rationale, and check the extracted EcoCash statement summary.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Application Snapshot</h2>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadge(loan.status)}`}>
              {loan.status || 'pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Reference</p>
              <p className="mt-1 text-sm text-slate-900">{loan.loan_reference || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Amount Requested</p>
              <p className="mt-1 text-sm text-slate-900">{formatCurrency(loan.amount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Recommended Amount</p>
              <p className="mt-1 text-sm text-slate-900">{formatCurrency(loan.recommended_amount || loan.affordability?.recommendedAmount || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Max Affordable Loan</p>
              <p className="mt-1 text-sm text-slate-900">{formatCurrency(loan.max_affordable_loan || loan.affordability?.maxAffordableLoan || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Monthly Income</p>
              <p className="mt-1 text-sm text-slate-900">{formatCurrency(loan.monthly_income)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Monthly Payment</p>
              <p className="mt-1 text-sm text-slate-900">{formatCurrency(loan.monthly_payment)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Duration</p>
              <p className="mt-1 text-sm text-slate-900">{loan.duration ? `${loan.duration} months` : '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Interest Rate</p>
              <p className="mt-1 text-sm text-slate-900">{loan.interest_rate ?? '-'}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Employment Status</p>
              <p className="mt-1 text-sm text-slate-900">{loan.employment_status || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Existing Loans</p>
              <p className="mt-1 text-sm text-slate-900">{loan.existing_loans ?? 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Application Date</p>
              <p className="mt-1 text-sm text-slate-900">{formatDate(loan.application_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Decision Date</p>
              <p className="mt-1 text-sm text-slate-900">{formatDate(loan.decision_date)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Decision Summary</h2>
          <p className="mt-1 text-sm text-slate-500">This explains why the application was approved, pending, or rejected.</p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-700">{loan.decision_reason || 'No decision note has been saved yet.'}</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Eligible amount</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(loan.recommended_amount || loan.affordability?.recommendedAmount || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Affordable ceiling</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(loan.max_affordable_loan || loan.affordability?.maxAffordableLoan || 0)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={viewPDF}
              className="rounded-xl bg-[#0f4d7a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0b3e62]"
            >
              View Uploaded Statement
            </button>
          </div>
        </div>
      </section>

      {loan.statement_overview && (
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">EcoCash Extraction Summary</h2>
              <p className="mt-1 text-sm text-slate-600">
                Brief of the uploaded statement: extracted transactions, total inflows and outflows, and estimated income.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
              {loan.statement_overview.statementCount} statement
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{loan.statement_overview.transactionCount}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Incoming</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{loan.statement_overview.moneyInCount}</p>
              <p className="text-xs text-slate-500">{formatCurrency(loan.statement_overview.totalMoneyIn)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Outgoing</p>
              <p className="mt-2 text-2xl font-semibold text-red-700">{loan.statement_overview.moneyOutCount}</p>
              <p className="text-xs text-slate-500">{formatCurrency(loan.statement_overview.totalMoneyOut)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net cash flow</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(loan.statement_overview.netCashFlow)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated monthly income</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(loan.statement_overview.estimatedMonthlyIncome)}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default LoanDetails;
