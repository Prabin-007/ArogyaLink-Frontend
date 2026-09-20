// PatientDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPatient, getPatientTimeline, getPatientReferrals, getPatientFollowUps } from '../../api/patients';
import { TIMELINE_ICONS, REFERRAL_STATUS_COLORS, FOLLOWUP_STATUS_COLORS, GENDER_LABELS } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import { ArrowLeft, Calendar, MapPin, Phone, User, Clock } from 'lucide-react';

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, tRes, rRes, fRes] = await Promise.all([
          getPatient(id),
          getPatientTimeline(id),
          getPatientReferrals(id).catch(() => ({ data: { data: { referrals: [] } } })),
          getPatientFollowUps(id).catch(() => ({ data: { data: { followUps: [] } } })),
        ]);
        setPatient(pRes.data.data.patient);
        setTimeline(tRes.data.data.timeline || []);
        setReferrals(rRes.data.data.referrals || []);
        setFollowups(fRes.data.data.followUps || []);
      } catch (err) {
        console.error('Error loading patient:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getAge = (dob) => {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return <div className="text-center py-12 text-stone-500">Patient not found.</div>;
  }

  const tabs = [
    { key: 'timeline', label: 'Timeline', count: timeline.length },
    { key: 'referrals', label: 'Referrals', count: referrals.length },
    { key: 'followups', label: 'Follow-ups', count: followups.length },
  ];

  return (
    <div>
      {/* Back Link */}
      <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </Link>

      {/* Patient Info Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-stone-800">{patient.name}</h1>
              {patient.isHighRisk && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">High Risk</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-stone-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{getAge(patient.dateOfBirth)} yrs · {GENDER_LABELS[patient.gender] || patient.gender}</span>
              {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>}
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{patient.village}, {patient.district}, {patient.state}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-stone-200" />

          <div className="space-y-0">
            {timeline.slice().reverse().map((event, i) => {
              const iconInfo = TIMELINE_ICONS[event.eventType] || { color: 'bg-stone-400', label: event.eventType };
              return (
                <div key={event.id} className="relative flex gap-4 pb-6">
                  {/* Dot */}
                  <div className={`relative z-10 w-[10px] h-[10px] rounded-full mt-1.5 shrink-0 ring-4 ring-white ${iconInfo.color}`} />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-800">{iconInfo.label}</span>
                      <span className="text-xs text-stone-400">{formatDate(event.createdAt)} · {formatTime(event.createdAt)}</span>
                    </div>
                    <p className="text-sm text-stone-600 mt-0.5 leading-relaxed">{event.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {timeline.length === 0 && (
            <div className="text-center py-8 text-stone-500 text-sm">No timeline events yet.</div>
          )}
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="space-y-3">
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">No referrals for this patient.</div>
          ) : (
            referrals.map((ref) => (
              <Link key={ref.id} to={`/referrals/${ref.id}`} className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{ref.reason}</p>
                    <p className="text-xs text-stone-500 mt-1">{ref.referringFacilityId} → {ref.receivingFacilityId}</p>
                    <p className="text-xs text-stone-400 mt-1">{formatDate(ref.createdAt)}</p>
                  </div>
                  <StatusBadge status={ref.status} colorMap={REFERRAL_STATUS_COLORS} />
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="space-y-3">
          {followups.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">No follow-ups for this patient.</div>
          ) : (
            followups.map((fu) => (
              <div key={fu.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800">Due: {formatDate(fu.dueDate)}</p>
                    {fu.notes && <p className="text-xs text-stone-500 mt-1">{fu.notes}</p>}
                    {fu.outcome && <p className="text-xs text-emerald-600 mt-1">Outcome: {fu.outcome}</p>}
                  </div>
                  <StatusBadge status={fu.status} colorMap={FOLLOWUP_STATUS_COLORS} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
