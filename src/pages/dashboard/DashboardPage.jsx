import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listPatients } from '../../api/patients';
import { listReferrals } from '../../api/referrals';
import { getAssignedFollowUps, getOverdueFollowUps } from '../../api/followups';
import StatCard from '../../components/StatCard';
import { Users, ArrowRightLeft, ClipboardCheck, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = {};

        // Fetch patient count (doctors/admins)
        if (['DOCTOR', 'SPECIALIST', 'SYSTEM_ADMIN', 'HOSPITAL_ADMIN'].includes(user?.role)) {
          const pRes = await listPatients({ page: 1, limit: 1 });
          results.totalPatients = pRes.data.data.pagination?.total || pRes.data.data.patients?.length || 0;
        }

        // Fetch referrals
        if (['DOCTOR', 'SPECIALIST', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(user?.role)) {
          try {
            const rRes = await listReferrals();
            const referrals = rRes.data.data.referrals || [];
            results.activeReferrals = referrals.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length;
          } catch { results.activeReferrals = 0; }
        }

        // Fetch assigned follow-ups (ASHA/ANM)
        if (['ASHA', 'ANM'].includes(user?.role)) {
          try {
            const fRes = await getAssignedFollowUps();
            const followups = fRes.data.data.followUps || [];
            results.assignedFollowUps = followups.length;
            results.pendingFollowUps = followups.filter((f) => f.status === 'PENDING').length;
          } catch { results.assignedFollowUps = 0; results.pendingFollowUps = 0; }
        }

        // Fetch overdue (doctors/admins)
        if (['DOCTOR', 'SPECIALIST', 'SYSTEM_ADMIN'].includes(user?.role)) {
          try {
            const oRes = await getOverdueFollowUps();
            results.overdueFollowUps = oRes.data.data.followUps?.length || 0;
          } catch { results.overdueFollowUps = 0; }
        }

        setStats(results);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

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
        <h1 className="text-xl font-semibold text-stone-800">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">Overview of your healthcare operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.totalPatients !== undefined && (
          <StatCard label="Total Patients" value={stats.totalPatients} icon={Users} />
        )}
        {stats.activeReferrals !== undefined && (
          <StatCard label="Active Referrals" value={stats.activeReferrals} icon={ArrowRightLeft} color="text-amber-600" bgColor="bg-amber-50" />
        )}
        {stats.assignedFollowUps !== undefined && (
          <StatCard label="Assigned Follow-ups" value={stats.assignedFollowUps} icon={ClipboardCheck} />
        )}
        {stats.pendingFollowUps !== undefined && (
          <StatCard label="Pending Tasks" value={stats.pendingFollowUps} icon={ClipboardCheck} color="text-amber-600" bgColor="bg-amber-50" />
        )}
        {stats.overdueFollowUps !== undefined && (
          <StatCard label="Overdue Follow-ups" value={stats.overdueFollowUps} icon={AlertTriangle} color="text-red-600" bgColor="bg-red-50" />
        )}
      </div>
    </div>
  );
}
