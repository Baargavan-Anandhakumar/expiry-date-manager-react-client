import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const baseURL = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

const api = axios.create({
  baseURL,
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
});

// Interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Possibly dispatch a logout event or clear state if token expires
    }
    return Promise.reject(error);
  }
);

export default api;
