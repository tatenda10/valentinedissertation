import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_URL from '../../utils/Api';

const badgeStyles = {
  LOAN_APPROVED: 'bg-emerald-100 text-emerald-700',
  LOAN_REJECTED: 'bg-red-100 text-red-700',
  LOGIN: 'bg-blue-100 text-blue-700',
  UPDATE: 'bg-amber-100 text-amber-700',
};

const Audit_logs = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    unique_actors: 0,
    total_approvals: 0,
    total_rejections: 0,
  });
  const [filters, setFilters] = useState({
    action: '',
    date: '',
    limit: '100',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.date) params.set('date', filters.date);
    if (filters.limit) params.set('limit', filters.limit);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_URL}/admin/audit-logs?${queryString}`);
        setLogs(response.data?.logs || []);
        setSummary(response.data?.summary || {});
      } catch (fetchError) {
        const errorMessage =
          fetchError.response?.data?.message ||
          fetchError.message ||
          'Failed to load audit logs';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [queryString]);

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

  const getActionBadge = (action) => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        badgeStyles[action] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {String(action || 'UNKNOWN').replaceAll('_', ' ')}
    </span>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="mt-2 text-sm text-slate-200">
          Review approvals, rejections, authentication events, and other sensitive actions across the platform.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Events</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.total || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Unique Actors</p>
          <p className="mt-2 text-3xl font-semibold text-blue-800">{summary.unique_actors || 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Loan Approvals</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">{summary.total_approvals || 0}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">Loan Rejections</p>
          <p className="mt-2 text-3xl font-semibold text-red-800">{summary.total_rejections || 0}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Action</label>
            <select
              value={filters.action}
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
            >
              <option value="">All actions</option>
              <option value="LOAN_APPROVED">Loan approved</option>
              <option value="LOAN_REJECTED">Loan rejected</option>
              <option value="LOGIN">Login</option>
              <option value="UPDATE">Update</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600">Window</label>
            <select
              value={filters.limit}
              onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20"
            >
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="200">Last 200</option>
              <option value="500">Last 500</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters({ action: '', date: '', limit: '100' })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading audit logs...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-700">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No audit entries matched the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">When</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{formatDate(log.created_at)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{log.actor_name || 'System'}</td>
                    <td className="whitespace-nowrap px-6 py-4">{getActionBadge(log.action)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                      {log.entity_type || '-'}
                      {log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                    <td className="max-w-xl px-6 py-4 text-sm text-slate-600">{log.details || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Audit_logs;
