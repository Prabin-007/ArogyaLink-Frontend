import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOverdueFollowUps } from '../../api/followups';
import { AlertTriangle, User, Calendar, ArrowRight } from 'lucide-react';

export default function OverdueFollowUpsPage() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverdue = async () => {
      try {
        setLoading(true);
        const res = await getOverdueFollowUps();
        setFollowups(res.data.data.followUps || []);
      } catch (err) {
        console.error('Error fetching overdue followups:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverdue();
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const diffTime = Date.now() - new Date(dueDate).getTime();
    return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h1 className="text-xl font-semibold text-stone-800">Overdue Follow-ups</h1>
        </div>
        <p className="text-sm text-stone-500 mt-1">
          High-priority missed and delayed follow-up visits requiring supervisor review
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : followups.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500 text-sm">
          No overdue follow-up tasks currently flagged. Good job!
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">Patient</th>
                <th className="px-4 py-3 font-medium text-stone-600">Assigned Worker</th>
                <th className="px-4 py-3 font-medium text-stone-600">Due Date</th>
                <th className="px-4 py-3 font-medium text-stone-600">Overdue By</th>
                <th className="px-4 py-3 font-medium text-stone-600">Instructions</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {followups.map((fu) => (
                <tr key={fu.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {fu.patient?.name}
                    <div className="text-xs text-stone-400">{fu.patient?.village}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs">
                    {fu.assignedTo?.name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs">
                    {formatDate(fu.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      {getDaysOverdue(fu.dueDate)} days
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs max-w-xs truncate">
                    {fu.notes || 'Routine follow-up'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/patients/${fu.patientId}`}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                    >
                      Patient Record <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}