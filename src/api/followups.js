import api from './axios';

export const getAssignedFollowUps = (params) => api.get('/followups/assigned', { params });
export const getOverdueFollowUps = () => api.get('/followups/overdue');
export const getFollowUp = (id) => api.get(`/followups/${id}`);
export const createFollowUp = (data) => api.post('/followups', data);
export const updateFollowUp = (id, data) => api.patch(`/followups/${id}`, data);
