import api from './axios';

export const listPatients = (params) => api.get('/patients', { params });
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (data) => api.post('/patients', data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const getPatientTimeline = (id) => api.get(`/patients/${id}/timeline`);
export const getPatientFollowUps = (id) => api.get(`/patients/${id}/followups`);
export const getPatientReferrals = (id) => api.get(`/patients/${id}/referrals`);
