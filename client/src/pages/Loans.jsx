import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../utils/Api';

function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanDetailsLoading, setLoanDetailsLoading] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(`${API_URL}/loans/all`);
      setLoans(response.data?.loans || []);
    } catch (fetchError) {
      const errorMessage =
        fetchError.response?.data?.message ||
        fetchError.message ||
        'Failed to fetch loans';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalLoans: loans.length,
    activeLoans: loans.filter(
      (loan) => loan.status?.toLowerCase() === 'approved'
    ).length,
    rejectedLoans: loans.filter(
      (loan) => loan.status?.toLowerCase() === 'rejected'
    ).length,
    totalAmount: loans.reduce(
      (sum, loan) => sum + parseFloat(loan.amount || 0),
      0
    ),
  };

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '-';

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount) || 0);

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const openLoanDetails = async (loanId) => {
    try {
      setLoanDetailsLoading(true);
      const response = await axios.get(`${API_URL}/loans/${loanId}`);
      setSelectedLoan(response.data?.loan || null);
    } catch (fetchError) {
      const errorMessage =
        fetchError.response?.data?.message ||
        fetchError.message ||
        'Failed to fetch loan details';
      setError(errorMessage);
    } finally {
      setLoanDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        Loading loans...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <h1 className="text-2xl font-semibold">Loans Overview</h1>
        <p className="mt-2 text-sm text-slate-200">
          Manage and review all loan applications submitted to the platform.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Loans</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {stats.totalLoans}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Approved Loans</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">
            {stats.activeLoans}
          </p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">Rejected Loans</p>
          <p className="mt-2 text-3xl font-semibold text-red-800">
            {stats.rejectedLoans}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Total Amount</p>
          <p className="mt-2 text-3xl font-semibold text-blue-800">
            {formatCurrency(stats.totalAmount)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {loan.loan_reference || `Loan #${loan.id}`}
                    </div>
                    <div className="text-sm text-slate-500">
                      Client ID: {loan.client_id ?? '-'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                    {formatCurrency(loan.amount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {loan.purpose || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                        loan.status
                      )}`}
                    >
                      {loan.status || '-'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => openLoanDetails(loan.id)}
                    className="text-[#0f4d7a] hover:text-[#011325]"
                  >
                    View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4">
          <div className="mx-auto mt-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Loan Details</h3>
              <button
                onClick={() => setSelectedLoan(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {loanDetailsLoading ? (
              <div className="py-12 text-center text-slate-600">Loading loan details...</div>
            ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 rounded-xl bg-slate-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">
                  Loan Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Reference Number
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.loan_reference || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Client ID
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.client_id ?? '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Amount
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatCurrency(selectedLoan.amount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Purpose
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.purpose || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Duration
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.duration ? `${selectedLoan.duration} months` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Interest Rate
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.interest_rate ?? '-'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Monthly Payment
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatCurrency(selectedLoan.monthly_payment)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Employment Status
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.employment_status || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Monthly Income
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatCurrency(selectedLoan.monthly_income)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Existing Loans
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedLoan.existing_loans ?? '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Recommended Amount
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatCurrency(selectedLoan.recommended_amount || selectedLoan.affordability?.recommendedAmount || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Max Affordable Loan
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatCurrency(selectedLoan.max_affordable_loan || selectedLoan.affordability?.maxAffordableLoan || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Application Date
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatDate(selectedLoan.application_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      Decision Date
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatDate(selectedLoan.decision_date)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">Status</div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                      selectedLoan.status
                    )}`}
                  >
                    {selectedLoan.status || '-'}
                  </span>
                </div>
              </div>

              {selectedLoan.statement_overview && (
                <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">EcoCash Statement Summary</div>
                      <div className="text-sm text-slate-600">Quick breakdown of the uploaded statement we extracted.</div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                      {selectedLoan.statement_overview.statementCount} statement
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Transactions</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{selectedLoan.statement_overview.transactionCount}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Money In</div>
                      <div className="mt-2 text-xl font-semibold text-emerald-700">{selectedLoan.statement_overview.moneyInCount}</div>
                      <div className="text-xs text-slate-500">{formatCurrency(selectedLoan.statement_overview.totalMoneyIn)}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Money Out</div>
                      <div className="mt-2 text-xl font-semibold text-red-700">{selectedLoan.statement_overview.moneyOutCount}</div>
                      <div className="text-xs text-slate-500">{formatCurrency(selectedLoan.statement_overview.totalMoneyOut)}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Est. Monthly Income</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(selectedLoan.statement_overview.estimatedMonthlyIncome)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-span-2 rounded-xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">
                  Decision Reason
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {selectedLoan.decision_reason || '-'}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Loans;
