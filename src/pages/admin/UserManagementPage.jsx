import { useState } from 'react';
import { registerUser } from '../../api/auth';
import { UserCog, CheckCircle } from 'lucide-react';

export default function UserManagementPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'ASHA',
    identifier: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await registerUser(formData);
      setMessage(`Successfully registered user ${formData.name} (${formData.identifier})`);
      setFormData({ name: '', phone: '', role: 'ASHA', identifier: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">Healthcare Staff Management</h1>
        <p className="text-sm text-stone-500 mt-1">Register verified ASHA workers, ANMs, and PHC doctors into the platform</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Staff Member Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Rajesh Kulkarni"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="ASHA">ASHA Worker</option>
                <option value="ANM">Auxiliary Nurse Midwife (ANM)</option>
                <option value="DOCTOR">PHC Doctor</option>
                <option value="SPECIALIST">Specialist</option>
                <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                <option value="SYSTEM_ADMIN">System Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Official Identifier *</label>
              <input
                type="text"
                required
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                placeholder="e.g. ASHA-PUNE-012"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserCog className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Create Healthcare Worker Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}