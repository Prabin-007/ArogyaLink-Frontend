import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listReferrals, createReferral, getReferralRecommendations } from '../../api/referrals';
import { listPatients } from '../../api/patients';
import { listFacilities } from '../../api/facilities';
import { REFERRAL_STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import { Plus, X, Building2, User, AlertTriangle, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

const BOARD_COLUMNS = [
  { key: 'CREATED', label: 'Created', headerColor: 'bg-amber-500' },
  { key: 'ACCEPTED', label: 'Accepted', headerColor: 'bg-emerald-500' },
  { key: 'PATIENT_ARRIVED', label: 'Patient Arrived', headerColor: 'bg-sky-500' },
  { key: 'TREATED', label: 'Treated', headerColor: 'bg-teal-500' },
];

const AVAILABLE_SERVICES = [
  'General Consultation',
  'Emergency Care',
  'Teleconsultation',
  'Maternal Care',
  'Child Care',
  'Cardiology',
  'Minor Surgery',
];

const AVAILABLE_DIAGNOSTICS = [
  'ECG',
  'X-Ray',
  'Ultrasound',
  'Blood Test',
];

const AVAILABLE_MEDICINES = [
  'Amoxicillin',
  'Paracetamol',
  'Atorvastatin',
  'Metformin',
  'ORS',
];

export default function ReferralBoardPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mode toggle: Smart AI vs Direct
  const [isSmartMode, setIsSmartMode] = useState(true);

  // New referral form state
  const [patientId, setPatientId] = useState('');
  const [receivingFacilityId, setReceivingFacilityId] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [reason, setReason] = useState('');

  // Smart referral parameters (Ayush AI + Shruti Resources)
  const [requiredService, setRequiredService] = useState('Cardiology');
  const [selectedDiagnostics, setSelectedDiagnostics] = useState(['ECG']);
  const [selectedMedicines, setSelectedMedicines] = useState(['Amoxicillin']);
  const [recommendationPreview, setRecommendationPreview] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  const fetchReferrals = async () => {
    try {
      const res = await listReferrals();
      setReferrals(res.data.data?.referrals || []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const openModal = async () => {
    setError('');
    setShowModal(true);
    try {
      const [pRes, fRes] = await Promise.all([
        listPatients({ limit: 50 }),
        listFacilities(),
      ]);
      const pList = pRes.data.data?.patients || [];
      const fList = fRes.data.data?.facilities || [];
      setPatients(pList);
      setFacilities(fList);
      if (pList.length > 0 && !patientId) setPatientId(pList[0].id);
      if (fList.length > 0 && !receivingFacilityId) setReceivingFacilityId(fList[0].id || fList[0].name);

      // Trigger initial AI recommendation preview
      fetchRecommendationPreview(pList[0]?.id || '', 'Cardiology', ['ECG'], ['Amoxicillin'], 'HIGH');
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  const fetchRecommendationPreview = async (pId, service, diags, meds, prio) => {
    setLoadingRecommendation(true);
    try {
      const res = await getReferralRecommendations({
        patientLatitude: 18.2810,
        patientLongitude: 73.6210,
        requiredService: service || undefined,
        requiredDiagnostics: diags,
        requiredMedicines: meds,
        priority: prio,
        emergency: prio === 'EMERGENCY',
      });
      if (res.data.data?.recommendation) {
        setRecommendationPreview(res.data.data.recommendation);
        setReceivingFacilityId(res.data.data.recommendation.facilityId);
      }
    } catch (err) {
      console.warn('Could not fetch recommendation preview:', err.message);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const handleToggleDiagnostic = (diag) => {
    const updated = selectedDiagnostics.includes(diag)
      ? selectedDiagnostics.filter((d) => d !== diag)
      : [...selectedDiagnostics, diag];
    setSelectedDiagnostics(updated);
    fetchRecommendationPreview(patientId, requiredService, updated, selectedMedicines, priority);
  };

  const handleToggleMedicine = (med) => {
    const updated = selectedMedicines.includes(med)
      ? selectedMedicines.filter((m) => m !== med)
      : [...selectedMedicines, med];
    setSelectedMedicines(updated);
    fetchRecommendationPreview(patientId, requiredService, selectedDiagnostics, updated, priority);
  };

  const handleServiceChange = (s) => {
    setRequiredService(s);
    fetchRecommendationPreview(patientId, s, selectedDiagnostics, selectedMedicines, priority);
  };

  const handlePriorityChange = (p) => {
    setPriority(p);
    fetchRecommendationPreview(patientId, requiredService, selectedDiagnostics, selectedMedicines, p);
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!patientId || !reason.trim()) {
      setError('Please select a patient and provide a reason for referral.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        patientId,
        referringFacilityId: 'Saswad PHC',
        priority,
        reason: reason.trim(),
      };

      if (isSmartMode) {
        payload.patientLatitude = 18.2810;
        payload.patientLongitude = 73.6210;
        payload.requiredService = requiredService;
        payload.requiredDiagnostics = selectedDiagnostics;
        payload.requiredMedicines = selectedMedicines;
        payload.emergency = priority === 'EMERGENCY';
      } else {
        payload.receivingFacilityId = receivingFacilityId;
      }

      await createReferral(payload);
      setShowModal(false);
      setReason('');
      await fetchReferrals();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Referral Board</h1>
          <p className="text-sm text-stone-500">Track referrals, AI recommendation scores, and live hospital resource routing</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Referral
        </button>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BOARD_COLUMNS.map((col) => {
          const items = referrals.filter((r) => r.status === col.key);
          return (
            <div key={col.key} className="bg-stone-50/70 rounded-xl p-3 border border-stone-200/80 flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.headerColor}`} />
                  <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">{col.label}</h3>
                </div>
                <span className="text-xs font-medium text-stone-400 bg-white px-2 py-0.5 rounded-full border border-stone-200">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400 bg-white/50 rounded-lg border border-dashed border-stone-200">
                    No referrals
                  </div>
                ) : (
                  items.map((ref) => (
                    <Link
                      key={ref.id}
                      to={`/referrals/${ref.id}`}
                      className="block bg-white rounded-lg border border-stone-200 p-3 hover:border-emerald-500 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-stone-800 line-clamp-2">{ref.reason}</p>
                        <StatusBadge status={ref.priority} colorMap={PRIORITY_COLORS} />
                      </div>
                      {ref.patient && (
                        <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> {ref.patient.name}
                        </p>
                      )}
                      <p className="text-xs text-stone-500 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 shrink-0" /> {ref.referringFacilityId} → {ref.receivingFacilityId}
                      </p>
                      {ref.recommendationScore != null && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                          <Sparkles className="w-3 h-3 text-emerald-600" /> AI Match: {ref.recommendationScore}/100
                        </div>
                      )}
                      <p className="text-[11px] text-stone-400 mt-1">{formatDate(ref.createdAt)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Referral Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50">
              <div>
                <h2 className="text-base font-semibold text-stone-800">Create Patient Referral</h2>
                <p className="text-xs text-stone-500">Unifying Smart Referral AI with Live Hospital Resource Inventory</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 block">AI Smart Referral & Live Inventory Matching</span>
                    <span className="text-[11px] text-emerald-700">Ranks hospitals by diagnostic equipment, medicines in stock, and distance</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSmartMode(!isSmartMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSmartMode ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isSmartMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Patient */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Select Patient *</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender} · {p.village})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Clinical Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="LOW">Low (Routine Specialist Consultation)</option>
                  <option value="MEDIUM">Medium (Non-urgent Hospital Assessment)</option>
                  <option value="HIGH">High (Urgent Inpatient / High-Risk Care)</option>
                  <option value="EMERGENCY">Emergency (Immediate Life-saving Stabilization)</option>
                </select>
              </div>

              {/* SMART REFERRAL OPTIONS */}
              {isSmartMode ? (
                <div className="space-y-3 p-3.5 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Required Service */}
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Required Service</label>
                      <select
                        value={requiredService}
                        onChange={(e) => handleServiceChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        {AVAILABLE_SERVICES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Diagnostics Multi-select */}
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Required Diagnostics</label>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_DIAGNOSTICS.map((diag) => {
                          const active = selectedDiagnostics.includes(diag);
                          return (
                            <button
                              key={diag}
                              type="button"
                              onClick={() => handleToggleDiagnostic(diag)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                active
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                              }`}
                            >
                              {diag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Required Medicines Multi-select */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Required Medicines (Stock Check)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_MEDICINES.map((med) => {
                        const active = selectedMedicines.includes(med);
                        return (
                          <button
                            key={med}
                            type="button"
                            onClick={() => handleToggleMedicine(med)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              active
                                ? 'bg-sky-600 text-white'
                                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                            }`}
                          >
                            {med}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live AI Recommendation Result */}
                  {loadingRecommendation ? (
                    <div className="flex items-center justify-center p-3 text-xs text-stone-500">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Evaluating live hospital inventory and distances...
                    </div>
                  ) : recommendationPreview ? (
                    <div className="p-3 bg-white rounded-lg border border-emerald-300 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Recommended: {recommendationPreview.facilityName}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Score: {recommendationPreview.score}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {recommendationPreview.facilityType?.replace(/_/g, ' ')} · {recommendationPreview.distanceKm} km away · ~{recommendationPreview.waitingTimeMinutes || 30} min wait
                      </div>
                      <div className="text-[11px] text-stone-600 space-y-0.5 pt-1 border-t border-stone-100">
                        {(recommendationPreview.reasons || []).slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Manual Target Facility */
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Target Receiving Facility *</label>
                  <select
                    value={receivingFacilityId}
                    onChange={(e) => setReceivingFacilityId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id || f.name}>
                        {f.name} ({f.type?.replace(/_/g, ' ')} · {f.district})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Reason for Referral *</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Patient presenting with severe cardiac distress and elevated troponin; requiring urgent ECG and antibiotic prophylaxis"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submitting ? 'Creating...' : (isSmartMode ? 'Create Smart Referral' : 'Create Referral')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
