export const REFERRAL_STATUS_COLORS = {
  CREATED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  PATIENT_ARRIVED: 'bg-sky-100 text-sky-800',
  TREATED: 'bg-teal-100 text-teal-800',
  FOLLOW_UP_REQUIRED: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-stone-100 text-stone-700',
  CANCELLED: 'bg-stone-100 text-stone-400',
};

export const FOLLOWUP_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  MISSED: 'bg-red-100 text-red-800',
  ESCALATED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-stone-100 text-stone-400',
};

export const PRIORITY_COLORS = {
  LOW: 'bg-stone-100 text-stone-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

export const TIMELINE_ICONS = {
  PATIENT_REGISTERED: { color: 'bg-emerald-500', label: 'Registered' },
  ENCOUNTER_CREATED: { color: 'bg-sky-500', label: 'Consultation' },
  VITALS_RECORDED: { color: 'bg-teal-500', label: 'Vitals' },
  PRESCRIPTION_ISSUED: { color: 'bg-amber-500', label: 'Prescription' },
  REFERRAL_CREATED: { color: 'bg-orange-500', label: 'Referral Created' },
  REFERRAL_ACCEPTED: { color: 'bg-emerald-500', label: 'Referral Accepted' },
  REFERRAL_REJECTED: { color: 'bg-red-500', label: 'Referral Rejected' },
  PATIENT_ARRIVED_AT_HOSPITAL: { color: 'bg-sky-500', label: 'Patient Arrived' },
  TREATMENT_COMPLETED: { color: 'bg-teal-500', label: 'Treatment Done' },
  FOLLOWUP_SCHEDULED: { color: 'bg-amber-500', label: 'Follow-up Scheduled' },
  FOLLOWUP_COMPLETED: { color: 'bg-emerald-500', label: 'Follow-up Done' },
  FOLLOWUP_MISSED: { color: 'bg-red-500', label: 'Follow-up Missed' },
  FOLLOWUP_ESCALATED: { color: 'bg-rose-500', label: 'Escalated' },
  HIGH_RISK_FLAGGED: { color: 'bg-red-600', label: 'High Risk' },
  EMERGENCY_ESCALATED: { color: 'bg-red-600', label: 'Emergency' },
};

export const GENDER_LABELS = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };

export const ENCOUNTER_TYPE_LABELS = {
  PHC_VISIT: 'PHC Visit',
  TELECONSULTATION: 'Teleconsultation',
  EMERGENCY: 'Emergency',
  FOLLOW_UP_VISIT: 'Follow-up Visit',
  HOME_VISIT: 'Home Visit',
};
