import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import API_URL from '../utils/Api';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function Dashboard() {
  const [loanSummary, setLoanSummary] = useState(null);
  const [demographics, setDemographics] = useState([]);
  const [loansByGender, setLoansByGender] = useState([]);
  const [loansByMonth, setLoansByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        loanSummaryResponse,
        demographicsResponse,
        loansByGenderResponse,
        loansByMonthResponse
      ] = await Promise.all([
        axios.get(`${API_URL}/reports/loan-summary`),
        axios.get(`${API_URL}/reports/client-demographics`),
        axios.get(`${API_URL}/reports/approved-loans-by-gender`),
        axios.get(`${API_URL}/reports/loans-by-month`)
      ]);

      const summary = loanSummaryResponse.data?.summary || {};
      summary.totalAmount = parseFloat(summary.totalAmount) || 0;
      summary.averageLoanAmount = parseFloat(summary.averageLoanAmount) || 0;

      setLoanSummary(summary);
      setDemographics(demographicsResponse.data?.demographics || []);
      setLoansByGender(loansByGenderResponse.data?.report || []);
      setLoansByMonth(loansByMonthResponse.data?.report || []);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load dashboard reports';
      setError(errorMessage);
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartCardClass = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm';

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        Loading dashboard...
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
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl sm:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Admin Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">Portfolio Overview</h1>
        <p className="mt-3 text-sm text-slate-200">
          Track loan volumes, approvals, and trend performance across the platform.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Loans</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {loanSummary?.totalLoans || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Total Amount</p>
          <p className="mt-2 text-3xl font-semibold text-blue-800">
            ${loanSummary?.totalAmount?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">
            {loanSummary?.approvedLoans || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">Rejected</p>
          <p className="mt-2 text-3xl font-semibold text-red-800">
            {loanSummary?.rejectedLoans || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <p className="text-sm text-violet-700">Avg Loan</p>
          <p className="mt-2 text-3xl font-semibold text-violet-800">
            ${loanSummary?.averageLoanAmount?.toFixed(2) || '0.00'}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className={chartCardClass}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Client Demographics</h2>
          <Pie
            data={{
              labels: demographics.map((d) => d.employment_status),
              datasets: [
                {
                  data: demographics.map((d) => d.clientCount),
                  backgroundColor: ['#0f4d7a', '#2a7ab1', '#73a9d0', '#b8d6ea']
                }
              ]
            }}
          />
        </div>

        <div className={chartCardClass}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Approved Loans by Gender</h2>
          <Pie
            data={{
              labels: loansByGender.map((l) => l.gender),
              datasets: [
                {
                  data: loansByGender.map((l) => l.approvedLoans),
                  backgroundColor: ['#0f4d7a', '#3a87bc']
                }
              ]
            }}
          />
        </div>

        <div className={chartCardClass}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Loans by Month</h2>
          <Bar
            data={{
              labels: loansByMonth.map((l) => l.month),
              datasets: [
                {
                  label: 'Loans',
                  data: loansByMonth.map((l) => l.totalLoans),
                  backgroundColor: '#2a7ab1'
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { beginAtZero: true, grid: { display: false } },
                y: { beginAtZero: true }
              }
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default Dashboard;