import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import API_URL from '../utils/Api';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
};

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalLoans: 0,
    totalAmount: 0,
    approvedLoans: 0,
    rejectedLoans: 0,
    pendingLoans: 0,
    averageLoanAmount: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [genderData, setGenderData] = useState({ male: 0, female: 0 });
  const [demographics, setDemographics] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError('');

        const [statsResponse, monthlyResponse, genderResponse, demographicsResponse] = await Promise.all([
          axios.get(`${API_URL}/loans/statistics`),
          axios.get(`${API_URL}/loans/reports/monthly`),
          axios.get(`${API_URL}/loans/reports/gender`),
          axios.get(`${API_URL}/reports/client-demographics`),
        ]);

        setStats(statsResponse.data || {});
        setMonthlyData(monthlyResponse.data || []);
        setGenderData(genderResponse.data || { male: 0, female: 0 });
        setDemographics(demographicsResponse.data?.demographics || []);
      } catch (fetchError) {
        const errorMessage =
          fetchError.response?.data?.message ||
          fetchError.message ||
          'Failed to load reports';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const exportToCsv = () => {
    const header = ['Month', 'Total Loans', 'Approved', 'Rejected'];
    const rows = monthlyData.map((item) => [item.month, item.loans, item.approved, item.rejected]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loan-reports-${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">Loading reports...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
            <p className="mt-2 text-sm text-slate-200">
              Monitor portfolio performance, approval mix, gender distribution, and monthly application flow.
            </p>
          </div>
          <button
            type="button"
            onClick={exportToCsv}
            className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Export Monthly Report
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Loans</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalLoans || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Portfolio Value</p>
          <p className="mt-2 text-3xl font-semibold text-blue-800">{formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <p className="text-sm text-violet-700">Average Loan</p>
          <p className="mt-2 text-3xl font-semibold text-violet-800">{formatCurrency(stats.averageLoanAmount)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">{stats.approvedLoans || 0}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">Rejected</p>
          <p className="mt-2 text-3xl font-semibold text-red-800">{stats.rejectedLoans || 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-700">Pending Review</p>
          <p className="mt-2 text-3xl font-semibold text-amber-800">{stats.pendingLoans || 0}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Loan Status Mix</h2>
          <p className="mt-1 text-sm text-slate-500">How the current portfolio is split by final decision.</p>
          <div className="mt-6 h-72">
            <Doughnut
              data={{
                labels: ['Approved', 'Rejected', 'Pending'],
                datasets: [
                  {
                    data: [stats.approvedLoans || 0, stats.rejectedLoans || 0, stats.pendingLoans || 0],
                    backgroundColor: ['#059669', '#dc2626', '#d97706'],
                    borderWidth: 0,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Applicants by Gender</h2>
          <p className="mt-1 text-sm text-slate-500">Distribution of loan applicants with known gender data.</p>
          <div className="mt-6 h-72">
            <Doughnut
              data={{
                labels: ['Male', 'Female'],
                datasets: [
                  {
                    data: [genderData.male || 0, genderData.female || 0],
                    backgroundColor: ['#2563eb', '#db2777'],
                    borderWidth: 0,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Employment Mix</h2>
          <p className="mt-1 text-sm text-slate-500">Client base grouped by employment profile.</p>
          <div className="mt-6 space-y-4">
            {demographics.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No client demographic data is available yet.</div>
            ) : (
              demographics.map((entry) => (
                <div key={entry.employment_status} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold capitalize text-slate-900">{entry.employment_status || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">Average income: {formatCurrency(entry.averageIncome)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-slate-900">{entry.clientCount || 0}</p>
                      <p className="text-xs text-slate-500">clients</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Monthly Loan Trends</h2>
        <p className="mt-1 text-sm text-slate-500">Applications approved and rejected over the last six months.</p>
        <div className="mt-6 h-96">
          <Bar
            data={{
              labels: monthlyData.map((entry) => entry.month),
              datasets: [
                {
                  label: 'Approved',
                  data: monthlyData.map((entry) => entry.approved),
                  backgroundColor: '#059669',
                  borderRadius: 10,
                },
                {
                  label: 'Rejected',
                  data: monthlyData.map((entry) => entry.rejected),
                  backgroundColor: '#dc2626',
                  borderRadius: 10,
                },
                {
                  label: 'Total Applications',
                  data: monthlyData.map((entry) => entry.loans),
                  backgroundColor: '#2563eb',
                  borderRadius: 10,
                },
              ],
            }}
            options={{
              ...chartOptions,
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      </section>
    </div>
  );
};

export default Reports;
