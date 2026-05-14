import axios from 'axios';

const api = axios.create({ 
  baseURL: 'https://revenueiq-api.onrender.com/api' 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getSales = (params) => api.get('/sales', { params });
export const addSale = (data) => api.post('/sales', data);
export const deleteSale = (id) => api.delete(`/sales/${id}`);
export const uploadCSV = (formData) => api.post('/sales/upload-csv', formData);
export const getForecast = (days) => api.post('/predictions/forecast', { forecast_days: days });
export const getAnomalies = () => api.post('/predictions/anomalies');
export const getInventory = () => api.post('/predictions/inventory');
export const getAlerts = () => api.get('/predictions/alerts');
export const markAlertRead = (id) => api.patch(`/predictions/alerts/${id}/read`);
export const getInsights = () => api.get('/insights/summary');
export const getAIExplanation = (type, data) => api.post('/insights/ai-explain', { prediction_type: type, data });