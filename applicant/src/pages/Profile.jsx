import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    address_street: user?.address_street || '',
    address_city: user?.address_city || '',
    address_state: user?.address_state || '',
    address_zip_code: user?.address_zip_code || '',
    address_country: user?.address_country || '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
    employment_status: user?.employment_status || '',
    monthly_income: user?.monthly_income || '',
    Gender: user?.Gender || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement update profile API call
    setIsEditing(false);
  };

  const inputClassName =
    'mt-1 block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20 disabled:bg-slate-100 disabled:text-slate-500';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#011325] via-[#0b2f4f] to-[#114974] p-6 text-white shadow-xl">
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="mt-2 text-sm text-slate-200">Keep your information accurate to improve application quality.</p>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Account Details</h2>
            <p className="text-sm text-slate-500">Manage personal, contact, and financial information.</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-xl bg-[#0f4d7a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0b3e62]"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Personal Information</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Gender</label>
                  <select name="Gender" value={formData.Gender} onChange={handleChange} disabled={!isEditing} className={inputClassName}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Contact Information</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Phone Number</label>
                  <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Address</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Street</label>
                  <input type="text" name="address_street" value={formData.address_street} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">City</label>
                  <input type="text" name="address_city" value={formData.address_city} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">State</label>
                  <input type="text" name="address_state" value={formData.address_state} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">ZIP Code</label>
                  <input type="text" name="address_zip_code" value={formData.address_zip_code} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Country</label>
                  <input type="text" name="address_country" value={formData.address_country} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Financial Information</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Employment Status</label>
                  <select name="employment_status" value={formData.employment_status} onChange={handleChange} disabled={!isEditing} className={inputClassName}>
                    <option value="">Select Status</option>
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Monthly Income</label>
                  <input type="number" name="monthly_income" value={formData.monthly_income} onChange={handleChange} disabled={!isEditing} className={inputClassName} />
                </div>
              </div>
            </section>

            {isEditing && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
