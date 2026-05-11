import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../utils/Api';

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/loan-clients/all`);
      setClients(response.data.clients);
    } catch (fetchError) {
      setError('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = (clientId) => {
    console.log(`Disable client with ID: ${clientId}`);
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">Loading clients...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error}</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="mt-2 text-sm text-slate-200">Review and manage client records across the platform.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{client.first_name} {client.last_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{client.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{client.phone_number}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button onClick={() => setSelectedClient(client)} className="mr-4 font-medium text-[#0f4d7a] hover:text-[#011325]">View Details</button>
                    <button onClick={() => handleDisable(client.id)} className="font-medium text-red-600 hover:text-red-700">Disable</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4">
          <div className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Client Details</h3>
              <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-sm font-medium text-slate-500">Full Name</div><div className="mt-1 text-sm text-slate-900">{selectedClient.first_name} {selectedClient.last_name}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Email</div><div className="mt-1 text-sm text-slate-900">{selectedClient.email}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Phone Number</div><div className="mt-1 text-sm text-slate-900">{selectedClient.phone_number}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Address</div><div className="mt-1 text-sm text-slate-900">{`${selectedClient.address_street}, ${selectedClient.address_city}, ${selectedClient.address_state}, ${selectedClient.address_zip_code}, ${selectedClient.address_country}`}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Employment Status</div><div className="mt-1 text-sm text-slate-900">{selectedClient.employment_status}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Monthly Income</div><div className="mt-1 text-sm text-slate-900">{parseFloat(selectedClient.monthly_income || 0).toFixed(2)}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Date of Birth</div><div className="mt-1 text-sm text-slate-900">{new Date(selectedClient.date_of_birth).toLocaleDateString()}</div></div>
              <div><div className="text-sm font-medium text-slate-500">Created At</div><div className="mt-1 text-sm text-slate-900">{new Date(selectedClient.created_at).toLocaleDateString()}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
