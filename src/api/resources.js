import api from './axios';

export const getResourceAvailability = (params) => api.get('/resources/availability', { params });
export const listMedicines = () => api.get('/medicines');
export const getMedicineAvailability = (id, params) => api.get(`/medicines/${id}/availability`, { params });
export const listDiagnostics = () => api.get('/diagnostics');
export const getDiagnosticAvailability = (id) => api.get(`/diagnostics/${id}/availability`);
export const listServices = () => api.get('/services');
export const getServiceAvailability = (id) => api.get(`/services/${id}/availability`);
export const listNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
