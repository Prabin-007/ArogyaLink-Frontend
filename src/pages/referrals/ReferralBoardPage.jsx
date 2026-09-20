import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listReferrals } from '../../api/referrals';
import { REFERRAL_STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import { ArrowRightLeft } from 'lucide-react';

const BOARD_COLUMNS = [
  { key: 'CREATED', label: 'Created', headerColor: 'bg-amber-500' },
  { key: 'ACCEPTED', label: 'Accepted', headerColor: 'bg-emerald-500' },
  { key: 'PATIENT_ARRIVED', label: 'Patient Arrived', headerColor: 'bg-sky-500' },
  { key: 'TREATED', label: 'Treated', headerColor: 'bg-teal-500' },
];

export default function ReferralBoardPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await listReferrals();
        setReferrals(res.data.data.referrals || []);
      } catch (err) {
        console.error('Error fetching referrals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">Referral Board</h1>
        <p className="text-sm text-stone-500 mt-1">Track patient referrals across their lifecycle</p>
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
                <span className="ml-auto text-xs bg-white text-stone-500 px-1.5 py-0.5 rounded-full">{items.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-400">No referrals</div>
                ) : (
                  items.map((ref) => (
                    <Link
                      key={ref.id}
                      to={`/referrals/${ref.id}`}
                      className="block bg-white rounded-lg border border-stone-200 p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-stone-800 line-clamp-2">{ref.reason}</p>
                        <StatusBadge status={ref.priority} colorMap={PRIORITY_COLORS} />
                      </div>
                      <p className="text-xs text-stone-500 truncate">{ref.referringFacilityId} → {ref.receivingFacilityId}</p>
                      <p className="text-xs text-stone-400 mt-1">{formatDate(ref.createdAt)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
