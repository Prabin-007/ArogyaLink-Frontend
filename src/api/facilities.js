import api from './axios';

export const listFacilities = (params) => api.get('/facilities', { params });
