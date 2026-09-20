import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPatients } from '../../api/patients';
import { createEncounter } from '../../api/encounters';
import { Stethoscope } from 'lucide-react';

export default function NewEncounterPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [encounterType, setEncounterType] = useState('PHC_VISIT');
  const [facilityId, setFacilityId] = useState('Saswad PHC');
  const [encounterDate, setEncounterDate] = useState(() => {
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm in local time
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listPatients({ limit: 100 }).then((res) => {
      const list = res.data.data.patients || [];
      setPatients(list);
      if (list.length > 0) setPatientId(list[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) return;
    setError('');
    setSubmitting(true);
    try {
      const symptomList = symptoms ? symptoms.split(',').map(s => s.trim()).filter(Boolean) : [];
      await createEncounter({
        patientId,
        facilityId,
        encounterType,
        encounterDate: new Date(encounterDate).toISOString(),
        symptoms: symptomList,
        clinicalNotes: clinicalNotes.trim(),
      });
      navigate(`/patients/${patientId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create consultation encounter');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">New Clinical Consultation</h1>
        <p className="text-sm text-stone-500 mt-1">Doctor encounter note, diagnosis, and care plan</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Patient *</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.village || 'Pune'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Encounter Type *</label>
              <select
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="PHC_VISIT">PHC Visit</option>
                <option value="TELECONSULTATION">Teleconsultation</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="FOLLOW_UP_VISIT">Follow-up Visit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Consultation Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={encounterDate}
                onChange={(e) => setEncounterDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Facility Name / ID *</label>
            <input
              type="text"
              required
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              placeholder="e.g. Saswad PHC"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Symptoms (comma separated)</label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Persistent fever, headache, body aches"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Clinical Notes & Assessment</label>
            <textarea
              rows={4}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter patient findings, treatment given, recommendations..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !patientId}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Stethoscope className="w-4 h-4" />
              {submitting ? 'Recording Encounter...' : 'Complete Encounter & Add to Timeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}