import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import API_URL from '../utils/Api';

const LoanModal = ({ loan, isOpen, onClose }) => {
  if (!isOpen || !loan) return null;

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
              <p className="text-sm font-medium text-slate-500">Application Date</p>
              <p className="mt-1">{new Date(loan.application_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Decision Date</p>
              <p className="mt-1">{loan.decision_date ? new Date(loan.decision_date).toLocaleDateString() : '-'}</p>
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
    const fetchLoans = async () => {
      try {
        const response = await axios.get(`${API_URL}/loans/client/${user.id}`);
        setLoans(response.data.loans);
        setSummary(response.data.summary);
      } catch (fetchError) {
        setError('Failed to fetch loans');
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [user.id]);

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
                    onClick={() => {
                      setSelectedLoan(loan);
                      setIsModalOpen(true);
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
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLoan(null);
        }}
      />
    </div>
  );
};

export default Loans;
