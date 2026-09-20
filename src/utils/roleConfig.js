import {
  LayoutDashboard, Users, UserPlus, Activity, Stethoscope,
  ArrowRightLeft, ClipboardCheck, Building2, Video, Brain,
  Pill, UserCog,
} from 'lucide-react';

// Sidebar navigation items per role
// 'placeholder' marks screens that are integration points for teammates
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ASHA', 'ANM', 'DOCTOR', 'SPECIALIST', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'] },
  { label: 'All Patients', path: '/patients', icon: Users, roles: ['DOCTOR', 'SPECIALIST', 'SYSTEM_ADMIN', 'HOSPITAL_ADMIN'] },
  { label: 'Register Patient', path: '/patients/register', icon: UserPlus, roles: ['ASHA', 'ANM', 'DOCTOR'] },
  { label: 'Record Vitals', path: '/vitals/record', icon: Activity, roles: ['ASHA', 'ANM', 'DOCTOR'] },
  { label: 'New Consultation', path: '/encounters/new', icon: Stethoscope, roles: ['DOCTOR', 'SPECIALIST'] },
  { label: 'Referral Board', path: '/referrals', icon: ArrowRightLeft, roles: ['DOCTOR', 'SPECIALIST', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'] },
  { label: 'My Follow-ups', path: '/followups/assigned', icon: ClipboardCheck, roles: ['ASHA', 'ANM'] },
  { label: 'Overdue Follow-ups', path: '/followups/overdue', icon: ClipboardCheck, roles: ['DOCTOR', 'SPECIALIST', 'SYSTEM_ADMIN'] },
  { label: 'Facilities', path: '/facilities', icon: Building2, roles: ['DOCTOR', 'SPECIALIST', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'] },
  { label: 'Teleconsult', path: '/teleconsult', icon: Video, roles: ['DOCTOR', 'SPECIALIST'], placeholder: true },
  { label: 'AI Triage', path: '/triage', icon: Brain, roles: ['DOCTOR', 'SPECIALIST'], placeholder: true },
  { label: 'Pharmacy', path: '/pharmacy', icon: Pill, roles: ['SYSTEM_ADMIN'], placeholder: true },
  { label: 'Manage Users', path: '/admin/users', icon: UserCog, roles: ['SYSTEM_ADMIN'] },
];

export const ROLE_LABELS = {
  ASHA: 'ASHA Worker',
  ANM: 'Auxiliary Nurse Midwife',
  DOCTOR: 'PHC Doctor',
  SPECIALIST: 'Specialist',
  HOSPITAL_ADMIN: 'Hospital Admin',
  SYSTEM_ADMIN: 'System Admin',
};
