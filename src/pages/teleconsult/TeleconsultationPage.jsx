import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  PhoneCall,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  Activity,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  fetchIncomingTeleconsults,
  fetchMyTeleconsults,
  fetchTeleconsultDoctors,
  createTeleconsult,
  acceptTeleconsult,
  rejectTeleconsult,
} from '../../api/teleconsultation';
import { listPatients } from '../../api/patients';

export default function TeleconsultationPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const isClinical = ['DOCTOR', 'SPECIALIST', 'SYSTEM_ADMIN'].includes(user?.role);

  const [activeTab, setActiveTab] = useState(isClinical ? 'incoming' : 'request');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Doctor Incoming Queue
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [actingId, setActingId] = useState(null);

  // Requester (ASHA/Doctor) state
  const [myRequests, setMyRequests] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [consultReason, setConsultReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Manual room join
  const [customRoomId, setCustomRoomId] = useState('');

  // Live incoming call popup
  const [incomingCallBanner, setIncomingCallBanner] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [user?.role]);

  // Socket.io Real-time Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Doctor receives new request in real time
    const onNewRequest = (newReq) => {
      setIncomingRequests((prev) => [newReq, ...prev]);
      setIncomingCallBanner({
        title: 'New Teleconsultation Request',
        message: `Patient ${newReq.patient?.name || 'Unknown'} needs immediate consultation. Reason: ${newReq.reason}`,
        requestId: newReq.id,
      });
    };

    // Requester receives acceptance notification
    const onAccepted = (data) => {
      setIncomingCallBanner({
        title: 'Teleconsultation Accepted!',
        message: `Dr. ${data.doctor?.name || 'Specialist'} has accepted your call. Click to join room.`,
        roomId: data.roomId,
      });
      // Refresh my requests
      loadAllData();
    };

    socket.on('new-teleconsultation-request', onNewRequest);
    socket.on('teleconsultation-accepted', onAccepted);

    return () => {
      socket.off('new-teleconsultation-request', onNewRequest);
      socket.off('teleconsultation-accepted', onAccepted);
    };
  }, [socket]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (isClinical) {
        const [incomingRes, allRes] = await Promise.all([
          fetchIncomingTeleconsults('CREATED').catch(() => ({ data: { data: { requests: [] } } })),
          fetchIncomingTeleconsults('all').catch(() => ({ data: { data: { requests: [] } } })),
        ]);
        const inc = incomingRes.data?.data?.requests || incomingRes.data?.requests || [];
        const all = allRes.data?.data?.requests || allRes.data?.requests || [];
        setIncomingRequests(inc);
        setHistoryRequests(all.filter((r) => r.status !== 'CREATED'));
      }

      // Load directory, patients, and my requests
      const [docRes, patRes, mineRes] = await Promise.all([
        fetchTeleconsultDoctors().catch(() => ({ data: { data: { doctors: [] } } })),
        listPatients({ limit: 100 }).catch(() => ({ data: { data: { patients: [] } } })),
        fetchMyTeleconsults().catch(() => ({ data: { data: { requests: [] } } })),
      ]);

      const docs = docRes.data?.data?.doctors || docRes.data?.doctors || [];
      const pats = patRes.data?.data?.patients || [];
      const mine = mineRes.data?.data?.requests || mineRes.data?.requests || [];

      setDoctors(docs);
      setPatients(pats);
      setMyRequests(mine);

      if (docs.length > 0 && !selectedDoctorId) setSelectedDoctorId(docs[0].id);
      if (pats.length > 0 && !selectedPatientId) setSelectedPatientId(pats[0].id);
    } catch (err) {
      console.error('Failed to load teleconsultation data:', err);
      setErrorMessage('Could not load teleconsultation records from backend');
    } finally {
      setLoading(false);
    }
  };

  // Doctor Accepts Request
  const handleAccept = async (requestId) => {
    setActingId(requestId);
    setErrorMessage('');
    try {
      const res = await acceptTeleconsult(requestId);
      const data = res.data?.data || res.data;
      const targetRoomId = data.request?.roomId || data.roomId;
      if (targetRoomId) {
        navigate(`/teleconsult/room/${targetRoomId}`);
      } else {
        loadAllData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to accept consultation request');
    } finally {
      setActingId(null);
    }
  };

  // Doctor Rejects Request
  const handleReject = async (requestId) => {
    setActingId(requestId);
    try {
      await rejectTeleconsult(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      loadAllData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to reject consultation request');
    } finally {
      setActingId(null);
    }
  };

  // Requester Submits Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId || !consultReason.trim()) {
      setErrorMessage('Please select a patient, a doctor, and provide a clinical reason');
      return;
    }

    setSubmittingRequest(true);
    setErrorMessage('');
    try {
      const res = await createTeleconsult({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        reason: consultReason.trim(),
      });

      const reqData = res.data?.data?.request || res.data?.request;
      setSuccessMessage(`Teleconsultation request #${reqData?.id?.slice(-6)} sent successfully to doctor!`);
      setConsultReason('');
      setActiveTab('mine');
      loadAllData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to send teleconsultation request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Accepted
          </span>
        );
      case 'CREATED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Doctor
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Declined
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-stone-100 text-stone-700 border border-stone-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Live Push Banner */}
      {incomingCallBanner && (
        <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-400 text-blue-900 shadow-md flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">{incomingCallBanner.title}</div>
              <div className="text-xs text-blue-700">{incomingCallBanner.message}</div>
            </div>
          </div>
          {incomingCallBanner.roomId && (
            <button
              onClick={() => navigate(`/teleconsult/room/${incomingCallBanner.roomId}`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              Join Call Now <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">
                WebRTC Teleconsultation Hub
              </h1>
              <p className="text-sm text-stone-500">
                Person 2 Doctor Portal • Peer-to-Peer Video Call with Central Continuity Engine
              </p>
            </div>
          </div>
        </div>

        {/* Manual Room Quick-Join & Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>WebRTC Signaling Live</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customRoomId.trim()) navigate(`/teleconsult/room/${customRoomId.trim()}`);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Join by room code..."
              value={customRoomId}
              onChange={(e) => setCustomRoomId(e.target.value)}
              className="text-xs rounded-lg border border-stone-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
            <button
              type="submit"
              className="text-xs font-semibold px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-xs text-stone-400 hover:text-stone-700">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-600" />
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-6">
        {isClinical && (
          <button
            onClick={() => setActiveTab('incoming')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'incoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Live Incoming Queue</span>
            {incomingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {incomingRequests.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('request')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'request'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>New Request</span>
        </button>

        <button
          onClick={() => setActiveTab('mine')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'mine'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Consultations</span>
        </button>

        {isClinical && (
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Doctor History</span>
          </button>
        )}
      </div>

      {/* Tab 1: Doctor Incoming Queue */}
      {activeTab === 'incoming' && isClinical && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-800">
              Pending Consultation Requests ({incomingRequests.length})
            </h2>
            <button
              onClick={loadAllData}
              className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-400">Loading incoming calls...</div>
          ) : incomingRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-stone-400 space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-medium">No pending incoming requests</p>
              <p className="text-xs text-stone-400">
                When an ASHA or rural clinic raises a call for you, it will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border-2 border-blue-200 p-5 shadow-xs space-y-4 hover:border-blue-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Requested by: {req.requester?.name || 'Field Staff'} ({req.requester?.role || 'ASHA'})
                      </span>
                      <h3 className="text-lg font-bold text-stone-900 mt-2">
                        {req.patient?.name || 'Patient'}
                      </h3>
                      <p className="text-xs text-stone-500">
                        Village: {req.patient?.village || 'Unknown'}, {req.patient?.district || 'Pune'}
                      </p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-700 border border-stone-200">
                    <span className="font-semibold text-stone-500 block mb-0.5">Clinical Reason:</span>
                    {req.reason}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={actingId === req.id}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {actingId === req.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                      Accept & Start Video Call
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={actingId === req.id}
                      className="px-3 py-2.5 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-semibold rounded-lg transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: New Request Form */}
      {activeTab === 'request' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Request Teleconsultation</h2>
            <p className="text-xs text-stone-500 mt-1">
              Select an available specialist or doctor and initiate a remote clinical review for your patient.
            </p>
          </div>

          <form onSubmit={handleCreateRequest} className="space-y-4">
            {/* Select Doctor */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                Target Specialist / Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full text-sm rounded-lg border border-stone-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.role} ({d.identifier || d.phone || 'Available'})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Patient */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full text-sm rounded-lg border border-stone-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gender || 'Unknown'}, {p.village || 'Village'})
                  </option>
                ))}
              </select>
            </div>

            {/* Clinical Reason */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                Reason / Symptoms for Teleconsultation
              </label>
              <textarea
                rows={3}
                placeholder="E.g., High persistent fever, severe chest tightness, seeking specialist guidance on dosage..."
                value={consultReason}
                onChange={(e) => setConsultReason(e.target.value)}
                className="w-full text-sm rounded-lg border border-stone-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingRequest}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              {submittingRequest ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneCall className="w-4 h-4" />
              )}
              Send Teleconsultation Request
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: My Consultations */}
      {activeTab === 'mine' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-800">
              Your Requested Teleconsultations ({myRequests.length})
            </h2>
            <button
              onClick={loadAllData}
              className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-stone-400">
              No teleconsultations requested yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-stone-900">
                        {req.patient?.name || 'Patient'}
                      </h4>
                      <p className="text-xs text-stone-500">
                        Consultant: Dr. {req.doctor?.name || 'Specialist'} ({req.doctor?.role})
                      </p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    {req.reason}
                  </p>

                  {/* If Accepted, show Join Room Button */}
                  {req.status === 'ACCEPTED' && req.roomId && (
                    <div className="pt-2 border-t border-stone-100">
                      <button
                        onClick={() => navigate(`/teleconsult/room/${req.roomId}`)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm animate-pulse"
                      >
                        <Video className="w-4 h-4" />
                        Join Live Video Call (Room: {req.roomId})
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Doctor History */}
      {activeTab === 'history' && isClinical && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-stone-800">
            Consultation History ({historyRequests.length})
          </h2>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Requester</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {historyRequests.map((hr) => (
                  <tr key={hr.id} className="hover:bg-stone-50/50">
                    <td className="p-3 font-semibold text-stone-800">{hr.patient?.name || 'Patient'}</td>
                    <td className="p-3 text-stone-600">{hr.requester?.name || 'Staff'}</td>
                    <td className="p-3 text-stone-600 max-w-xs truncate">{hr.reason}</td>
                    <td className="p-3">{getStatusBadge(hr.status)}</td>
                    <td className="p-3 text-stone-400">{new Date(hr.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
