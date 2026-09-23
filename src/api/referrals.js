import api from './axios';

export const listReferrals = (params) => api.get('/referrals', { params });
export const getReferral = (id) => api.get(`/referrals/${id}`);
export const createReferral = (data) => api.post('/referrals', data);
export const getReferralRecommendations = (data) => api.post('/referrals/recommend', data);
export const updateReferralStatus = (id, data) => api.patch(`/referrals/${id}/status`, data);
