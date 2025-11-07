import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccess } from './token';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true, // necesario si refresh usa cookie httpOnly
});

// Attach Authorization header
api.interceptors.request.use(cfg => {
  const t = getAccessToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Response interceptor: on 401 try refresh once
let isRefreshing = false;
let refreshQueue = [];

function processQueue(err, token = null) {
  refreshQueue.forEach(p => (err ? p.reject(err) : p.resolve(token)));
  refreshQueue = [];
}

api.interceptors.response.use(
  res => res,
  async err => {
    const { config, response } = err;
    if (!config || !response) return Promise.reject(err);

    if (response.status === 401 && !config._retry) {
      if (isRefreshing) {
        // push request into queue to be retried after refresh
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          config.headers.Authorization = `Bearer ${token}`;
          return axios(config);
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        // refresh token endpoint; credentials: cookie included by axios via withCredentials
        const r = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        const newAccess = r.data.accessToken;
        // opcional: decode exp del JWT o recibir exp en payload
        setAccessToken(newAccess, /*exp*/ Date.now() + 15 * 60 * 1000);
        processQueue(null, newAccess);
        config.headers.Authorization = `Bearer ${newAccess}`;
        return axios(config);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAccess();
        // opcional: emitir evento global de logout
        window.dispatchEvent(new CustomEvent('session:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;