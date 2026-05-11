import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/Api';

function Dashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const response = await axios.get(`${API_URL}/loans/client/${user.id}`);
        setLoans(response.data?.loans || []);
      } catch (fetchError) {
        setError('Could not load your latest loan data.');
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [user.id]);

  const metrics = useMemo(() => {
    const total = loans.length;
    const approved = loans.filter((loan) => loan.status === 'approved').length;
    const rejected = loans.filter((loan) => loan.status === 'rejected').length;
    const pending = loans.filter((loan) => !['approved', 'rejected'].includes(loan.status)).length;
    const totalAmount = loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

    return { total, approved, rejected, pending, totalAmount };
  }, [loans]);

  const recentLoans = useMemo(() => loans.slice(0, 4), [loans]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl sm:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200">
          Track your loan applications, view outcomes, and continue your loan process from one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/apply-loan"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#011325] transition hover:bg-slate-100"
          >
            Apply for a loan
          </Link>
          <Link
            to="/loans"
            className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View my loans
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Applications</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">{metrics.approved}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-700">In Review</p>
          <p className="mt-2 text-3xl font-semibold text-amber-800">{metrics.pending}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Requested Amount</p>
          <p className="mt-2 text-3xl font-semibold text-blue-800">${metrics.totalAmount.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Applications</h2>
          <Link to="/loans" className="text-sm font-medium text-[#0f4d7a] hover:text-[#011325]">
            See all
          </Link>
        </div>

        {loading && <p className="px-6 py-6 text-sm text-slate-500">Loading your applications...</p>}
        {!loading && error && <p className="px-6 py-6 text-sm text-red-600">{error}</p>}
        {!loading && !error && recentLoans.length === 0 && (
          <div className="px-6 py-8">
            <p className="text-sm text-slate-600">You have not submitted any applications yet.</p>
            <Link to="/apply-loan" className="mt-3 inline-block text-sm font-medium text-[#0f4d7a] hover:text-[#011325]">
              Start your first application
            </Link>
          </div>
        )}
        {!loading && !error && recentLoans.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{loan.loan_reference || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">${Number(loan.amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{loan.duration} months</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          loan.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : loan.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {loan.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
