import api from './axios';

export const recordVitals = (data) => api.post('/vitals', data);
