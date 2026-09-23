import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessEncounterTriage, assessAndRefer } from '../../api/triage';
import { listPatients } from '../../api/patients';
import { listFacilities } from '../../api/facilities';
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  HeartPulse,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
  Stethoscope,
  Pill,
  RefreshCw,
  Search,
  User,
  Info,
} from 'lucide-react';

const RED_FLAG_PRESETS = [
  'Severe breathing difficulty',
  'Airway obstruction',
  'Heavy bleeding',
  'Unresponsive',
  'Unconscious',
  'Acute seizure',
  'Dangerous poisoning',
  'High-risk trauma',
];

const HIGH_ATTENTION_PRESETS = [
  'Chest pain',
  'Shortness of breath',
  'Severe abdominal pain',
  'Stroke symptoms',
  'Weakness',
  'Fainting',
];

export default function TriageAssessmentPage() {
  const navigate = useNavigate();

  // Patient context
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');

  // Clinical inputs
  const [vitals, setVitals] = useState({
    temperature: 98.6,
    heartRate: 78,
    bpSystolic: 120,
    bpDiastolic: 80,
    oxygenSaturation: 98,
  });

  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');

  // Referral options for escalation
  const [requiredSpecialist, setRequiredSpecialist] = useState('');
  const [requiredDiagnostics, setRequiredDiagnostics] = useState([]);
  const [requiredMedicines, setRequiredMedicines] = useState([]);

  // Results
  const [evaluating, setEvaluating] = useState(false);
  const [referring, setReferring] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [referralResult, setReferralResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  useEffect(() => {
    loadPatientsAndFacilities();
  }, []);

  const loadPatientsAndFacilities = async () => {
    try {
      const [patRes, facRes] = await Promise.all([
        listPatients({ limit: 50 }),
        listFacilities(),
      ]);

      const pats = patRes.data?.data?.patients || [];
      setPatients(pats);
      if (pats.length > 0) setSelectedPatientId(pats[0].id);

      const facs = facRes.data?.data?.facilities || facRes.data?.data || [];
      setFacilities(facs);
      if (facs.length > 0) setSelectedFacilityId(facs[0].id);
    } catch (err) {
      console.error('Failed to load initial triage data:', err);
    }
  };

  // Toggle symptom chip
  const toggleSymptom = (sym) => {
    setSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddCustomSymptom = (e) => {
    e.preventDefault();
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  // Quick Demo Presets
  const applyPreset = (type) => {
    setReferralResult(null);
    setErrorMessage('');
    if (type === 'EMERGENCY') {
      setVitals({
        temperature: 98.4,
        heartRate: 135,
        bpSystolic: 82,
        bpDiastolic: 50,
        oxygenSaturation: 89,
      });
      setSymptoms(['Severe breathing difficulty', 'Unresponsive']);
      setRequiredSpecialist('CARDIOLOGIST');
      setRequiredDiagnostics(['ECG', 'OXYGEN_SUPPORT']);
      setRequiredMedicines(['OXYGEN', 'ADRENALINE']);
    } else if (type === 'HIGH') {
      setVitals({
        temperature: 103.5,
        heartRate: 128,
        bpSystolic: 88,
        bpDiastolic: 55,
        oxygenSaturation: 92,
      });
      setSymptoms(['Chest pain', 'Shortness of breath']);
      setRequiredSpecialist('PHYSICIAN');
      setRequiredDiagnostics(['ECG']);
      setRequiredMedicines(['PARACETAMOL_IV']);
    } else if (type === 'MEDIUM') {
      setVitals({
        temperature: 101.8,
        heartRate: 122,
        bpSystolic: 125,
        bpDiastolic: 82,
        oxygenSaturation: 97,
      });
      setSymptoms(['Body ache', 'Fever']);
      setRequiredSpecialist('');
      setRequiredDiagnostics([]);
      setRequiredMedicines([]);
    } else {
      setVitals({
        temperature: 98.6,
        heartRate: 72,
        bpSystolic: 118,
        bpDiastolic: 78,
        oxygenSaturation: 99,
      });
      setSymptoms(['Mild headache']);
      setRequiredSpecialist('');
      setRequiredDiagnostics([]);
      setRequiredMedicines([]);
    }
  };

  // Run Triage Evaluation
  const handleEvaluate = async () => {
    setEvaluating(true);
    setErrorMessage('');
    setReferralResult(null);
    try {
      const payload = {
        vitals: {
          temperature: parseFloat(vitals.temperature),
          heartRate: parseInt(vitals.heartRate, 10),
          bpSystolic: parseInt(vitals.bpSystolic, 10),
          bpDiastolic: parseInt(vitals.bpDiastolic, 10),
          oxygenSaturation: parseFloat(vitals.oxygenSaturation),
        },
        symptoms,
        patientId: selectedPatientId || undefined,
      };

      const res = await assessEncounterTriage('adhoc', payload);
      setTriageResult(res.data?.data?.triage || res.data?.data);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to calculate triage score'
      );
    } finally {
      setEvaluating(false);
    }
  };

  // Trigger Smart Referral Escalation
  const handleAutoRefer = async () => {
    if (!selectedPatientId) {
      setErrorMessage('Please select a patient to raise the emergency referral.');
      return;
    }

    setReferring(true);
    setErrorMessage('');
    try {
      const selectedFac = facilities.find((f) => f.id === selectedFacilityId);
      const payload = {
        patientId: selectedPatientId,
        referringFacilityId: selectedFacilityId || undefined,
        patientLatitude: selectedFac?.latitude || 18.5204,
        patientLongitude: selectedFac?.longitude || 73.8567,
        vitals: {
          temperature: parseFloat(vitals.temperature),
          heartRate: parseInt(vitals.heartRate, 10),
          bpSystolic: parseInt(vitals.bpSystolic, 10),
          bpDiastolic: parseInt(vitals.bpDiastolic, 10),
          oxygenSaturation: parseFloat(vitals.oxygenSaturation),
        },
        symptoms,
        requiredSpecialist: requiredSpecialist || undefined,
        requiredDiagnostics,
        requiredMedicines,
      };

      const res = await assessAndRefer('adhoc', payload);
      const data = res.data?.data || res.data;
      setReferralResult(data);
      setSuccessBanner(
        `🚨 Escalation Successful: Smart Referral #${data.referral?.id?.slice(-6)} created. Receiving hospital & ASHA notified!`
      );
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to auto-escalate referral'
      );
    } finally {
      setReferring(false);
    }
  };

  const getTriageBadge = (level) => {
    switch (level) {
      case 'EMERGENCY':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-bold text-sm animate-pulse border border-red-300">
            <Flame className="w-4 h-4 text-red-600" />
            EMERGENCY — Immediate Life Threat
          </div>
        );
      case 'HIGH':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 font-semibold text-sm border border-orange-300">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            HIGH — Significant Clinical Risk
          </div>
        );
      case 'MEDIUM':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-medium text-sm border border-amber-300">
            <Activity className="w-4 h-4 text-amber-600" />
            MEDIUM — Moderate Abnormality
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-sm border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            LOW — Routine / Stable
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">
                AI Emergency & Clinical Triage
              </h1>
              <p className="text-sm text-stone-500">
                Person 5 Clinical Rule Engine • Integrated with Person 4 Smart
                Referral & Person 6 Live Inventory
              </p>
            </div>
          </div>
        </div>

        {/* Demo Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-400">Simulation Presets:</span>
          <button
            onClick={() => applyPreset('EMERGENCY')}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition"
          >
            🚨 Emergency (SpO₂ 89%)
          </button>
          <button
            onClick={() => applyPreset('HIGH')}
            className="px-2.5 py-1 text-xs font-medium rounded bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition"
          >
            ⚠️ High (Fever + Hypotension)
          </button>
          <button
            onClick={() => applyPreset('MEDIUM')}
            className="px-2.5 py-1 text-xs font-medium rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition"
          >
            🟡 Moderate (Tachycardia)
          </button>
          <button
            onClick={() => applyPreset('LOW')}
            className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
          >
            🟢 Normal / Low
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            {successBanner}
          </div>
          {referralResult?.referral?.id && (
            <button
              onClick={() => navigate(`/referrals/${referralResult.referral.id}`)}
              className="text-xs font-bold underline hover:text-emerald-950 flex items-center gap-1"
            >
              View Referral <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Clinical Parameters (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Patient & Facility Selection */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              1. Patient & Facility Context
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Select Patient
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-stone-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Ad-hoc / Simulation Mode --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender || 'Unknown'}, {p.village || 'Pune'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Encounter Facility
                </label>
                <select
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-stone-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vitals Recording */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-red-500" />
              2. Patient Vitals
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Heart Rate (BPM)
                </label>
                <input
                  type="number"
                  value={vitals.heartRate}
                  onChange={(e) =>
                    setVitals({ ...vitals, heartRate: e.target.value })
                  }
                  className={`w-full text-sm rounded-lg border p-2 focus:outline-none ${
                    vitals.heartRate < 50 || vitals.heartRate > 120
                      ? 'border-red-400 bg-red-50/50 text-red-800 font-bold'
                      : 'border-stone-300'
                  }`}
                />
                <span className="text-[10px] text-stone-400">Flag if &lt;50 or &gt;120</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  SpO₂ Saturation (%)
                </label>
                <input
                  type="number"
                  value={vitals.oxygenSaturation}
                  onChange={(e) =>
                    setVitals({ ...vitals, oxygenSaturation: e.target.value })
                  }
                  className={`w-full text-sm rounded-lg border p-2 focus:outline-none ${
                    vitals.oxygenSaturation < 94
                      ? 'border-red-400 bg-red-50/50 text-red-800 font-bold'
                      : 'border-stone-300'
                  }`}
                />
                <span className="text-[10px] text-stone-400">Flag if &lt;94%</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) =>
                    setVitals({ ...vitals, temperature: e.target.value })
                  }
                  className={`w-full text-sm rounded-lg border p-2 focus:outline-none ${
                    vitals.temperature < 95 || vitals.temperature > 101
                      ? 'border-red-400 bg-red-50/50 text-red-800 font-bold'
                      : 'border-stone-300'
                  }`}
                />
                <span className="text-[10px] text-stone-400">Flag if &lt;95 or &gt;101</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  value={vitals.bpSystolic}
                  onChange={(e) =>
                    setVitals({ ...vitals, bpSystolic: e.target.value })
                  }
                  className={`w-full text-sm rounded-lg border p-2 focus:outline-none ${
                    vitals.bpSystolic < 90 || vitals.bpSystolic > 180
                      ? 'border-red-400 bg-red-50/50 text-red-800 font-bold'
                      : 'border-stone-300'
                  }`}
                />
                <span className="text-[10px] text-stone-400">Flag &lt;90 or &gt;180</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  value={vitals.bpDiastolic}
                  onChange={(e) =>
                    setVitals({ ...vitals, bpDiastolic: e.target.value })
                  }
                  className={`w-full text-sm rounded-lg border p-2 focus:outline-none ${
                    vitals.bpDiastolic < 60 || vitals.bpDiastolic > 120
                      ? 'border-red-400 bg-red-50/50 text-red-800 font-bold'
                      : 'border-stone-300'
                  }`}
                />
                <span className="text-[10px] text-stone-400">Flag &lt;60 or &gt;120</span>
              </div>
            </div>
          </div>

          {/* Symptoms Checklist */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              3. Symptoms & Clinical Red Flags
            </h2>

            <div>
              <span className="text-xs font-semibold text-red-700 block mb-2">
                🚨 Emergency Red Flags (Triggers Immediate EMERGENCY Triage)
              </span>
              <div className="flex flex-wrap gap-2">
                {RED_FLAG_PRESETS.map((rf) => {
                  const active = symptoms.includes(rf);
                  return (
                    <button
                      key={rf}
                      type="button"
                      onClick={() => toggleSymptom(rf)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                        active
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {rf}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-amber-700 block mb-2">
                ⚠️ High-Attention Symptoms
              </span>
              <div className="flex flex-wrap gap-2">
                {HIGH_ATTENTION_PRESETS.map((ha) => {
                  const active = symptoms.includes(ha);
                  return (
                    <button
                      key={ha}
                      type="button"
                      onClick={() => toggleSymptom(ha)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                        active
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {ha}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Symptom Input */}
            <form onSubmit={handleAddCustomSymptom} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Type additional clinical symptoms..."
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                className="flex-1 text-sm rounded-lg border border-stone-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-stone-800 text-white text-xs font-semibold rounded-lg hover:bg-stone-900 transition"
              >
                Add Symptom
              </button>
            </form>

            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-stone-500 mr-1 self-center">
                  Active:
                </span>
                {symptoms.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-full border border-stone-200"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className="text-stone-400 hover:text-stone-700 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="w-full py-3 bg-stone-900 text-white font-bold text-sm rounded-xl hover:bg-black transition shadow-sm flex items-center justify-center gap-2"
          >
            {evaluating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-400" />
            )}
            Run Clinical Triage Evaluation
          </button>
        </div>

        {/* Right Column: AI Triage Result & Smart Referral Bridge (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Triage Assessment Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Triage Evaluation
              </h2>
              {triageResult && getTriageBadge(triageResult.triageLevel)}
            </div>

            {!triageResult ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <ShieldAlert className="w-10 h-10 mx-auto text-stone-300" />
                <p className="text-sm">No evaluation performed yet.</p>
                <p className="text-xs text-stone-400">
                  Select vitals and symptoms, then click "Run Clinical Triage Evaluation".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score Summary */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <div>
                    <span className="text-xs text-stone-500 uppercase font-semibold">
                      Calculated Risk Score
                    </span>
                    <div className="text-2xl font-black text-stone-900 mt-0.5">
                      {triageResult.score} points
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 uppercase font-semibold">
                      Action Protocol
                    </span>
                    <div className="text-sm font-bold text-stone-800 mt-0.5">
                      {triageResult.triageLevel === 'EMERGENCY'
                        ? 'Immediate Referral'
                        : triageResult.triageLevel === 'HIGH'
                        ? 'Urgent Referral'
                        : triageResult.triageLevel === 'MEDIUM'
                        ? 'Clinical Observation'
                        : 'Routine PHC Care'}
                    </div>
                  </div>
                </div>

                {/* Red Flags List */}
                {triageResult.redFlags && triageResult.redFlags.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
                    <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-red-600" />
                      Critical Red Flags Detected:
                    </span>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
                      {triageResult.redFlags.map((rf, idx) => (
                        <li key={idx} className="font-semibold uppercase">
                          {rf}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clinical Reasons */}
                {triageResult.reasons && triageResult.reasons.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-stone-500 uppercase">
                      Clinical Scoring Reasons:
                    </span>
                    <div className="space-y-1">
                      {triageResult.reasons.map((r, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-stone-700 flex items-center gap-2 bg-stone-50 p-2 rounded-lg border border-stone-200"
                        >
                          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalation Section */}
                {(triageResult.triageLevel === 'EMERGENCY' ||
                  triageResult.triageLevel === 'HIGH') && (
                  <div className="pt-4 border-t border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">
                        Smart Referral Protocol Escalation
                      </span>
                      <span className="text-[11px] font-semibold text-red-600 uppercase">
                        AI Match Required
                      </span>
                    </div>

                    <p className="text-xs text-stone-500">
                      Person 4 Smart Referral AI will match the optimal
                      emergency hospital and Person 6 will verify live
                      medicines & diagnostics.
                    </p>

                    <button
                      onClick={handleAutoRefer}
                      disabled={referring}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
                    >
                      {referring ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Flame className="w-4 h-4 text-amber-300" />
                      )}
                      ⚡ Escalate & Auto-Refer via Smart Referral AI
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Recommended Facility Result Card */}
          {referralResult && (
            <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 text-red-700 rounded-md">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      AI Matched Emergency Facility
                    </h3>
                    <span className="text-xs text-emerald-600 font-medium">
                      Status: Active Referral Generated
                    </span>
                  </div>
                </div>
                {referralResult.recommendation?.score && (
                  <div className="px-2.5 py-1 rounded bg-stone-900 text-white font-black text-xs">
                    Score: {referralResult.recommendation.score}/100
                  </div>
                )}
              </div>

              {referralResult.recommendation ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-stone-500 font-medium">Recommended Hospital:</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">
                      {referralResult.recommendation.facilityName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                    <div>
                      <span className="text-stone-400">Distance:</span>
                      <div className="font-bold text-stone-800">
                        {referralResult.recommendation.distanceKm?.toFixed(1) || '0'} km
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-400">Waiting Time:</span>
                      <div className="font-bold text-stone-800">
                        {referralResult.recommendation.waitingTimeMinutes || '30'} mins
                      </div>
                    </div>
                  </div>

                  {referralResult.recommendation.reasons?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-stone-500 font-semibold">Match Reasons:</span>
                      <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                        {referralResult.recommendation.reasons.map((rs, idx) => (
                          <li key={idx}>{rs}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-stone-600">
                  Referral raised with priority: <span className="font-bold">{referralResult.referral?.priority}</span>
                </div>
              )}

              <button
                onClick={() => navigate(`/referrals/${referralResult.referral?.id}`)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                Go to Full Referral Journey <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
