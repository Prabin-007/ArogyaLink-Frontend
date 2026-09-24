import api from './axios';

/**
 * Teleconsultation API Client (Person 2 - Gopal's Module)
 */

// ── Teleconsultation Requests ────────────────────────────────────────────────
export const createTeleconsult = (data) => api.post('/teleconsultations', data);
export const fetchMyTeleconsults = () => api.get('/teleconsultations/mine');
export const fetchIncomingTeleconsults = (status = 'CREATED') =>
  api.get(`/teleconsultations/incoming${status === 'all' ? '?status=all' : ''}`);
export const getTeleconsultById = (id) => api.get(`/teleconsultations/${id}`);
export const acceptTeleconsult = (id) => api.patch(`/teleconsultations/${id}/accept`);
export const rejectTeleconsult = (id) => api.patch(`/teleconsultations/${id}/reject`);
export const cancelTeleconsult = (id) => api.patch(`/teleconsultations/${id}/cancel`);
export const completeTeleconsult = (id) => api.patch(`/teleconsultations/${id}/complete`);

// ── Doctor / Specialist Directory ────────────────────────────────────────────
export const fetchTeleconsultDoctors = (role) =>
  api.get('/teleconsult-doctors', { params: role ? { role } : {} });
export const fetchTeleconsultDoctor = (id) => api.get(`/teleconsult-doctors/${id}`);
