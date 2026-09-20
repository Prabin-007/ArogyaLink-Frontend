import api from './axios';

export const loginUser = (identifier, password, role) =>
  api.post('/auth/login', { identifier, password, role });

export const getMe = () => api.get('/auth/me');

export const registerUser = (data) => api.post('/auth/register', data);
