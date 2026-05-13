import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import API_URL from '../utils/Api';

const LoanModal = ({ loan, isOpen, onClose, onRepaymentRecorded }) => {
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_note: '',
  });
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [repaymentError, setRepaymentError] = useState('');
  const [repaymentSuccess, setRepaymentSuccess] = useState('');

  useEffect(() => {
    if (!loan || !isOpen) {
      return;
    }

    setRepaymentForm({
      amount: '',
      payment_method: '',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_note: '',
    });
    setRepaymentError('');
    setRepaymentSuccess('');
  }, [loan, isOpen]);

  if (!isOpen || !loan) return null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : '-';

  const repaymentSummary = loan.repayment_summary || {};
  const canRepay = String(loan.status || '').toLowerCase() === 'approved';

  const handleRepaymentSubmit = async (event) => {
    event.preventDefault();
    setRepaymentError('');
    setRepaymentSuccess('');

    if (!(Number(repaymentForm.amount) > 0)) {
      setRepaymentError('Enter a repayment amount greater than zero.');
      return;
    }

    try {
      setSubmittingRepayment(true);
      await axios.post(`${API_URL}/loans/${loan.id}/repayments`, repaymentForm);
      setRepaymentSuccess('Repayment submitted successfully.');

      if (onRepaymentRecorded) {
        await onRepaymentRecorded(loan.id);
      }

      setRepaymentForm((current) => ({
        ...current,
        amount: '',
        reference_note: '',
      }));
    } catch (error) {
      setRepaymentError(
        error.response?.data?.message || error.message || 'Failed to submit repayment.',
      );
    } finally {
      setSubmittingRepayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Loan Details</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close details modal">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Applicant</p>
              <p className="mt-1">{`${loan.first_name} ${loan.last_name}`}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Contact</p>
              <p className="mt-1">{loan.email}</p>
              <p className="mt-1">{loan.phone_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Loan Reference</p>
              <p className="mt-1">{loan.loan_reference}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Status</p>
              <p className={`mt-1 capitalize ${loan.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>{loan.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Amount</p>
              <p className="mt-1">${Number(loan.amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Interest Rate</p>
              <p className="mt-1">{loan.interest_rate}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Monthly Payment</p>
              <p className="mt-1">${loan.monthly_payment}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Duration</p>
              <p className="mt-1">{loan.duration} months</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-slate-500">Purpose</p>
              <p className="mt-1">{loan.purpose}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-slate-500">Decision Reason</p>
              <p className="mt-1">{loan.decision_reason || 'Pending review'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Paid</p>
              <p className="mt-1">{formatCurrency(repaymentSummary.totalPaid || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Remaining Balance</p>
              <p className="mt-1">{formatCurrency(repaymentSummary.remainingBalance || loan.amount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Next Due Date</p>
              <p className="mt-1">{formatDate(repaymentSummary.nextDueDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Installments Paid</p>
              <p className="mt-1">{repaymentSummary.installmentsPaid || 0}/{repaymentSummary.totalInstallments || loan.duration || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Application Date</p>
              <p className="mt-1">{new Date(loan.application_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Decision Date</p>
              <p className="mt-1">{loan.decision_date ? new Date(loan.decision_date).toLocaleDateString() : '-'}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Make a Repayment</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Submit a repayment for this loan from your applicant account.
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {Math.min(Number(repaymentSummary.progressPercent || 0), 100)}% paid
              </div>
            </div>

            {!canRepay ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Repayments are available only after a loan has been approved.
              </div>
            ) : (
              <form onSubmit={handleRepaymentSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Amount</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={repaymentForm.amount}
                      onChange={(event) => setRepaymentForm((current) => ({ ...current, amount: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
                      placeholder="Enter repayment amount"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Payment Date</label>
                    <input
                      type="date"
                      value={repaymentForm.payment_date}
                      onChange={(event) => setRepaymentForm((current) => ({ ...current, payment_date: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Payment Method</label>
                    <select
                      value={repaymentForm.payment_method}
                      onChange={(event) => setRepaymentForm((current) => ({ ...current, payment_method: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
                    >
                      <option value="">Select a method</option>
                      <option value="ecocash">EcoCash</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Reference Note</label>
                    <input
                      type="text"
                      value={repaymentForm.reference_note}
                      onChange={(event) => setRepaymentForm((current) => ({ ...current, reference_note: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
                      placeholder="Receipt number or note"
                    />
                  </div>
                </div>

                {repaymentError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {repaymentError}
                  </div>
                ) : null}

                {repaymentSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {repaymentSuccess}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingRepayment}
                    className="rounded-xl bg-[#0f4d7a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0b3e62] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingRepayment ? 'Submitting...' : 'Submit Repayment'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8">
            <h4 className="text-lg font-semibold text-slate-900">Repayment History</h4>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(loan.repayment_history || []).length ? (
                    loan.repayment_history.map((repayment) => (
                      <tr key={repayment.id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatDate(repayment.payment_date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(repayment.amount_paid)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{repayment.payment_method || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{repayment.reference_note || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-5 text-center text-sm text-slate-500">No repayments have been recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loans = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, [user.id]);

  const fetchLoanDetails = async (loanId) => {
    const response = await axios.get(`${API_URL}/loans/${loanId}`);
    return response.data?.loan || null;
  };

  const fetchLoans = async (selectedLoanId = null) => {
    try {
      setError('');
      const response = await axios.get(`${API_URL}/loans/client/${user.id}`);
      const nextLoans = response.data?.loans || [];
      setLoans(nextLoans);
      setSummary(response.data?.summary || null);

      if (selectedLoanId) {
        const updatedSelectedLoan = await fetchLoanDetails(selectedLoanId);
        setSelectedLoan(updatedSelectedLoan);
      }
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">Loading your loans...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>;
  }

  const getStatusStyles = (status) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <h1 className="text-2xl font-semibold">My Loans</h1>
        <p className="mt-2 text-sm text-slate-200">Review your applications and inspect each decision in detail.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Total Loans</h3>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.totalLoans || 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-emerald-700">Active Loans</h3>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">{summary?.activeLoans || 0}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-red-700">Rejected Loans</h3>
          <p className="mt-2 text-3xl font-semibold text-red-800">{summary?.rejectedLoans || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-blue-700">Total Amount</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-800">${Number(summary?.totalAmount || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Loan Reference</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Interest Rate</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loans.map((loan) => (
              <tr key={loan.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{loan.loan_reference}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">${Number(loan.amount || 0).toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{loan.interest_rate}%</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyles(loan.status)}`}>
                    {loan.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={async () => {
                      try {
                        const detailedLoan = await fetchLoanDetails(loan.id);
                        setSelectedLoan(detailedLoan || loan);
                        setIsModalOpen(true);
                      } catch (fetchError) {
                        setError(fetchError.response?.data?.message || 'Failed to fetch loan details');
                      }
                    }}
                    className="text-[#0f4d7a] hover:text-[#011325]"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LoanModal
        loan={selectedLoan}
        isOpen={isModalOpen}
        onRepaymentRecorded={async (loanId) => {
          await fetchLoans(loanId);
        }}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLoan(null);
        }}
      />
    </div>
  );
};

export default Loans;
