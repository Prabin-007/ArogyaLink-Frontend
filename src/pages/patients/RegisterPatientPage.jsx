import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '../../api/patients';
import { UserPlus, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'PREGNANT_WOMAN', label: 'Pregnant Woman' },
  { value: 'INFANT', label: 'Infant (0-1 yr)' },
  { value: 'CHILD_UNDER_5', label: 'Child (1-5 yrs)' },
  { value: 'ELDERLY', label: 'Elderly (60+ yrs)' },
  { value: 'CHRONIC_DISEASE', label: 'Chronic Disease Patient' },
];

export default function RegisterPatientPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'FEMALE',
    phone: '',
    village: '',
    district: 'Pune',
    state: 'Maharashtra',
    address: '',
    category: 'GENERAL',
    isHighRisk: false,
    riskReasons: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        phone: formData.phone.trim() || undefined,
        village: formData.village.trim() || undefined,
        district: formData.district.trim() || undefined,
        state: formData.state.trim() || undefined,
        address: formData.address.trim() || undefined,
        category: formData.category,
        isHighRisk: formData.isHighRisk,
        riskReasons: formData.isHighRisk && formData.riskReasons ? formData.riskReasons.split(',').map(s => s.trim()) : undefined,
      };
      const res = await createPatient(payload);
      const newId = res.data.data.patient.id;
      navigate(`/patients/${newId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register patient. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">Register New Patient</h1>
        <p className="text-sm text-stone-500 mt-1">Enroll an individual into the rural healthcare continuity registry</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Meena Sharma"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Village</label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="e.g. Saswad"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Pune"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Patient Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={formData.isHighRisk}
                onChange={(e) => setFormData({ ...formData, isHighRisk: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-sm font-medium text-stone-800">Flag as High Risk</span>
            </label>
            {formData.isHighRisk && (
              <input
                type="text"
                value={formData.riskReasons}
                onChange={(e) => setFormData({ ...formData, riskReasons: e.target.value })}
                placeholder="Risk indicators (e.g. Severe Anemia, BP > 140/90, Gestational Diabetes)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-red-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Register Patient & View Timeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}