import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
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
import ResourceManagementPage from './pages/resources/ResourceManagementPage';
import TriageAssessmentPage from './pages/triage/TriageAssessmentPage';
import TeleconsultationPage from './pages/teleconsult/TeleconsultationPage';
import TeleconsultationRoomPage from './pages/teleconsult/TeleconsultationRoomPage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Fullscreen WebRTC Video Call Room */}
          <Route
            path="/teleconsult/room/:roomId"
            element={
              <ProtectedRoute>
                <TeleconsultationRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <TeleconsultationRoomPage />
              </ProtectedRoute>
            }
          />

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

            {/* Teleconsultation Hub (Person 2 - Gopal's Module) */}
            <Route path="/teleconsult" element={<TeleconsultationPage />} />

            {/* Person 5: AI Clinical & Emergency Triage */}
            <Route path="/triage" element={<TriageAssessmentPage />} />
            {/* Person 6: Resource & Availability Management (Shruti) */}
            <Route path="/resources" element={<ResourceManagementPage />} />
            <Route path="/pharmacy" element={<Navigate to="/resources" replace />} />

            {/* Admin */}
            <Route path="/admin/users" element={<UserManagementPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}