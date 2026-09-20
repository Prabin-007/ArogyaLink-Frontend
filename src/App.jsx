import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PlaceholderPage from './components/PlaceholderPage';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PatientListPage from './pages/patients/PatientListPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import RegisterPatientPage from './pages/patients/RegisterPatientPage';
import RecordVitalsPage from './pages/vitals/RecordVitalsPage';
import NewEncounterPage from './pages/encounters/NewEncounterPage';
import ReferralBoardPage from './pages/referrals/ReferralBoardPage';
import ReferralDetailPage from './pages/referrals/ReferralDetailPage';
import AssignedFollowUpsPage from './pages/followups/AssignedFollowUpsPage';
import OverdueFollowUpsPage from './pages/followups/OverdueFollowUpsPage';
import FacilityListPage from './pages/facilities/FacilityListPage';
import UserManagementPage from './pages/admin/UserManagementPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Shell */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Patients & Timeline (Person 3 Showpiece) */}
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/register" element={<RegisterPatientPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />

            {/* Vitals & Encounters */}
            <Route path="/vitals/record" element={<RecordVitalsPage />} />
            <Route path="/encounters/new" element={<NewEncounterPage />} />

            {/* Referrals & Continuity */}
            <Route path="/referrals" element={<ReferralBoardPage />} />
            <Route path="/referrals/:id" element={<ReferralDetailPage />} />

            {/* Follow-up Tasks */}
            <Route path="/followups/assigned" element={<AssignedFollowUpsPage />} />
            <Route path="/followups/overdue" element={<OverdueFollowUpsPage />} />

            {/* Network Facilities */}
            <Route path="/facilities" element={<FacilityListPage />} />

            {/* Teammate Integration Placeholders */}
            <Route
              path="/teleconsult"
              element={
                <PlaceholderPage
                  title="Teleconsultation Center"
                  personNumber="2"
                  personRole="Doctor Portal & Teleconsultation"
                  description="Real-time WebRTC audio/video teleconsultation interface between rural PHCs and hospital specialists."
                />
              }
            />
            <Route
              path="/triage"
              element={
                <PlaceholderPage
                  title="AI Emergency Triage"
                  personNumber="5"
                  personRole="Digital Triage & Emergency Escalation"
                  description="Machine learning-driven patient symptom risk scoring and automatic protocol escalation."
                />
              }
            />
            <Route
              path="/pharmacy"
              element={
                <PlaceholderPage
                  title="Pharmacy & Diagnostic Stock"
                  personNumber="6"
                  personRole="Medicines, Diagnostics & Alerts"
                  description="Essential drug inventory tracking, prescription fulfillment, and SMS/WhatsApp alert dispatch."
                />
              }
            />

            {/* Admin */}
            <Route path="/admin/users" element={<UserManagementPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}