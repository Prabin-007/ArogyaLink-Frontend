import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listReferrals, createReferral } from '../../api/referrals';
import { listPatients } from '../../api/patients';
import { listFacilities } from '../../api/facilities';
import { REFERRAL_STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import { Plus, X, Building2, User, AlertTriangle } from 'lucide-react';

const BOARD_COLUMNS = [
  { key: 'CREATED', label: 'Created', headerColor: 'bg-amber-500' },
  { key: 'ACCEPTED', label: 'Accepted', headerColor: 'bg-emerald-500' },
  { key: 'PATIENT_ARRIVED', label: 'Patient Arrived', headerColor: 'bg-sky-500' },
  { key: 'TREATED', label: 'Treated', headerColor: 'bg-teal-500' },
];

export default function ReferralBoardPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // New referral form state
  const [patientId, setPatientId] = useState('');
  const [receivingFacilityId, setReceivingFacilityId] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [reason, setReason] = useState('');

  const fetchReferrals = async () => {
    try {
      const res = await listReferrals();
      setReferrals(res.data.data.referrals || []);
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
      const pList = pRes.data.data.patients || [];
      const fList = fRes.data.data.facilities || [];
      setPatients(pList);
      setFacilities(fList);
      if (pList.length > 0 && !patientId) setPatientId(pList[0].id);
      if (fList.length > 0 && !receivingFacilityId) setReceivingFacilityId(fList[0].id || fList[0].name);
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!patientId || !reason.trim() || !receivingFacilityId) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createReferral({
        patientId,
        receivingFacilityId,
        referringFacilityId: 'Saswad PHC',
        priority,
        reason: reason.trim(),
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Referral Board</h1>
          <p className="text-sm text-stone-500 mt-1">Track patient referrals across their continuity lifecycle</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Referral
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {BOARD_COLUMNS.map((col) => {
          const items = referrals.filter((r) => r.status === col.key);
          return (
            <div key={col.key} className="bg-stone-100 rounded-xl p-3">
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${col.headerColor}`} />
                <span className="text-sm font-medium text-stone-700">{col.label}</span>
                <span className="ml-auto text-xs bg-white text-stone-500 px-1.5 py-0.5 rounded-full font-medium shadow-2xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-base font-semibold text-stone-800">Create Patient Referral</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

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

              {/* Receiving Facility */}
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
                  {facilities.length === 0 && (
                    <>
                      <option value="Pune District Hospital">Pune District Hospital (District Hospital)</option>
                      <option value="Bhor Sub-District Hospital">Bhor Sub-District Hospital (CHC)</option>
                      <option value="Baramati Sub-District Hospital">Baramati Sub-District Hospital (SDH)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Clinical Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="LOW">Low (Routine Specialist Consultation)</option>
                  <option value="MEDIUM">Medium (Non-urgent Hospital Assessment)</option>
                  <option value="HIGH">High (Urgent Inpatient / High-Risk Care)</option>
                  <option value="EMERGENCY">Emergency (Immediate Life-saving Stabilization)</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Reason for Referral *</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., High-risk pregnancy with severe anemia (Hb 7.2) requiring blood transfusion and OB-GYN evaluation"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
