import api from './axios';

export const createEncounter = (data) => api.post('/encounters', data);
