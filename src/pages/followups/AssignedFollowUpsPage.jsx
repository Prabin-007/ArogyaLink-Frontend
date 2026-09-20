import { useState, useEffect } from 'react';
import { getAssignedFollowUps, updateFollowUp } from '../../api/followups';
import { FOLLOWUP_STATUS_COLORS } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function AssignedFollowUpsPage() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [outcomeNotes, setOutcomeNotes] = useState({});

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await getAssignedFollowUps();
      setFollowups(res.data.data.followUps || []);
    } catch (err) {
      console.error('Error fetching assigned follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setUpdatingId(id);
      const outcome = outcomeNotes[id] || 'Visit completed as scheduled';
      await updateFollowUp(id, { status: newStatus, outcome });
      await fetchFollowUps();
    } catch (err) {
      console.error('Error updating follow-up:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">My Assigned Follow-ups</h1>
        <p className="text-sm text-stone-500 mt-1">Field visits and follow-up duties assigned to you</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : followups.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500 text-sm">
          No assigned follow-ups found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {followups.map((fu) => (
            <div key={fu.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-medium text-stone-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    {fu.patient?.name || 'Patient'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {fu.patient?.village ? `${fu.patient.village}, ${fu.patient.district || ''}` : 'Village care'}
                  </p>
                </div>
                <StatusBadge status={fu.status} colorMap={FOLLOWUP_STATUS_COLORS} />
              </div>

              <div className="text-xs text-stone-600 space-y-1.5 mb-4 bg-stone-50 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-stone-500">
                  <Calendar className="w-3.5 h-3.5" /> Due Date: <span className="text-stone-800 font-medium">{formatDate(fu.dueDate)}</span>
                </div>
                {fu.notes && (
                  <div>
                    <span className="font-medium text-stone-700">Doctor Instructions:</span> {fu.notes}
                  </div>
                )}
                {fu.outcome && (
                  <div className="text-emerald-700 font-medium">
                    <span>Outcome:</span> {fu.outcome}
                  </div>
                )}
              </div>

              {fu.status === 'PENDING' && (
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <input
                    type="text"
                    placeholder="Visit outcome / patient condition notes..."
                    value={outcomeNotes[fu.id] || ''}
                    onChange={(e) => setOutcomeNotes({ ...outcomeNotes, [fu.id]: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(fu.id, 'COMPLETED')}
                      disabled={updatingId === fu.id}
                      className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(fu.id, 'MISSED')}
                      disabled={updatingId === fu.id}
                      className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-200 disabled:opacity-50"
                    >
                      Missed
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}