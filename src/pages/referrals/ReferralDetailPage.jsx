import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReferral, updateReferralStatus } from '../../api/referrals';
import { REFERRAL_STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import { ArrowLeft, Clock } from 'lucide-react';

const STATUS_FLOW = ['CREATED', 'ACCEPTED', 'PATIENT_ARRIVED', 'TREATED', 'COMPLETED'];

export default function ReferralDetailPage() {
  const { id } = useParams();
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [remarks, setRemarks] = useState('');

  const fetchReferral = async () => {
    try {
      const res = await getReferral(id);
      setReferral(res.data.data.referral);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReferral(); }, [id]);

  const getNextStatus = () => {
    if (!referral) return null;
    const idx = STATUS_FLOW.indexOf(referral.status);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const handleAdvance = async () => {
    const next = getNextStatus();
    if (!next) return;
    setUpdating(true);
    try {
      await updateReferralStatus(id, { newStatus: next, remarks: remarks || undefined });
      setRemarks('');
      await fetchReferral();
    } catch (err) {
      console.error('Error advancing status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!referral) return <div className="text-center py-12 text-stone-500">Referral not found.</div>;

  const nextStatus = getNextStatus();

  return (
    <div>
      <Link to="/referrals" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Referral Board
      </Link>

      {/* Info Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-lg font-semibold text-stone-800">Referral Details</h1>
          <div className="flex gap-2">
            <StatusBadge status={referral.priority} colorMap={PRIORITY_COLORS} />
            <StatusBadge status={referral.status} colorMap={REFERRAL_STATUS_COLORS} />
          </div>
        </div>
        <p className="text-sm text-stone-600 mb-3">{referral.reason}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stone-500">
          <div>From: <span className="text-stone-700">{referral.referringFacilityId}</span></div>
          <div>To: <span className="text-stone-700">{referral.receivingFacilityId}</span></div>
          {referral.patient && (
            <div>Patient: <Link to={`/patients/${referral.patient.id}`} className="text-emerald-600 hover:text-emerald-700 font-medium">{referral.patient.name}</Link></div>
          )}
          <div>Created: <span className="text-stone-700">{formatDateTime(referral.createdAt)}</span></div>
        </div>
      </div>

      {/* Advance Status */}
      {nextStatus && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
          <h3 className="text-sm font-medium text-stone-700 mb-3">Advance Status → {nextStatus.replace(/_/g, ' ')}</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks (optional)..."
              className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleAdvance}
              disabled={updating}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : `Mark ${nextStatus.replace(/_/g, ' ')}`}
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="text-sm font-medium text-stone-700 mb-4">Audit Trail</h3>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-200" />
          <div className="space-y-4">
            {(referral.events || []).map((event) => (
              <div key={event.id} className="relative flex gap-3 pl-0">
                <div className="relative z-10 w-[15px] h-[15px] rounded-full bg-white border-2 border-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={event.newStatus} colorMap={REFERRAL_STATUS_COLORS} />
                    <span className="text-xs text-stone-400">{formatDateTime(event.createdAt)}</span>
                  </div>
                  {event.remarks && <p className="text-sm text-stone-600 mt-1">{event.remarks}</p>}
                  {event.updatedBy && <p className="text-xs text-stone-400 mt-0.5">By: {event.updatedBy.name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
