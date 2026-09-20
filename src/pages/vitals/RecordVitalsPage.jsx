import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPatients } from '../../api/patients';
import { recordVitals } from '../../api/vitals';
import { Activity } from 'lucide-react';

export default function RecordVitalsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [vitals, setVitals] = useState({
    temperature: 98.6,
    heartRate: 75,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    oxygenSaturation: 98,
    weight: 60,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listPatients({ limit: 100 }).then((res) => {
      const list = res.data.data.patients || [];
      setPatients(list);
      if (list.length > 0) setSelectedPatientId(list[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setError('');
    setSubmitting(true);
    try {
      await recordVitals({
        patientId: selectedPatientId,
        temperature: Number(vitals.temperature),
        heartRate: Number(vitals.heartRate),
        bloodPressure: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`,
        oxygenSaturation: Number(vitals.oxygenSaturation),
        weight: Number(vitals.weight),
      });
      navigate(`/patients/${selectedPatientId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record vitals');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">Record Patient Vitals</h1>
        <p className="text-sm text-stone-500 mt-1">Capture clinical indicators and automatically track on timeline</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Select Patient *</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.village || 'Pune'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                value={vitals.heartRate}
                onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">BP Systolic (mmHg)</label>
              <input
                type="number"
                value={vitals.bloodPressureSystolic}
                onChange={(e) => setVitals({ ...vitals, bloodPressureSystolic: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">BP Diastolic (mmHg)</label>
              <input
                type="number"
                value={vitals.bloodPressureDiastolic}
                onChange={(e) => setVitals({ ...vitals, bloodPressureDiastolic: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={vitals.oxygenSaturation}
                onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={vitals.weight}
                onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !selectedPatientId}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {submitting ? 'Saving Vitals...' : 'Record Vitals & Log to Timeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}