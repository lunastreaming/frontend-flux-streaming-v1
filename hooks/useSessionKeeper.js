// hooks/useSessionKeeper.js
import { useEffect, useRef } from 'react';
import jwt_decode from 'jwt-decode';
import api from '../lib/api';
import { getAccessToken, setAccessToken, clearAccess } from '../lib/token';

export function useSessionKeeper() {
  const timerRef = useRef(null);

  useEffect(() => {
    function scheduleRefreshFromToken(token) {
      if (!token) return;
      let expMs;
      try {
        expMs = jwt_decode(token).exp * 1000;
      } catch (e) {
        return;
      }
      const now = Date.now();
      const msUntilExp = expMs - now;
      const advance = 60 * 1000; // renovar 60s antes
      const delay = Math.max(5000, msUntilExp - advance);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const r = await api.post('/auth/refresh', {}, { withCredentials: true });
          const newTok = r.data.accessToken;
          setAccessToken(newTok, jwt_decode(newTok).exp * 1000);
          scheduleRefreshFromToken(newTok);
        } catch (e) {
          clearAccess();
          window.dispatchEvent(new CustomEvent('session:logout'));
        }
      }, delay);
    }

    const tok = getAccessToken();
    if (tok) scheduleRefreshFromToken(tok);

    const onActivity = () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const exp = jwt_decode(token).exp * 1000;
        const timeLeft = exp - Date.now();
        if (timeLeft < 2 * 60 * 1000) { // < 2 minutos
          api.post('/auth/refresh', {}, { withCredentials: true })
            .then(res => {
              const nt = res.data.accessToken;
              setAccessToken(nt, jwt_decode(nt).exp * 1000);
              scheduleRefreshFromToken(nt);
            })
            .catch(() => { clearAccess(); window.dispatchEvent(new CustomEvent('session:logout')); });
        }
      } catch (e) {}
    };

    const events = ['mousemove','keydown','click','touchstart','visibilitychange'];
    events.forEach(e => window.addEventListener(e, onActivity));
    window.addEventListener('storage', onActivity);

    const logoutListener = () => { clearTimeout(timerRef.current); clearAccess(); };
    window.addEventListener('session:logout', logoutListener);

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, onActivity));
      window.removeEventListener('storage', onActivity);
      window.removeEventListener('session:logout', logoutListener);
    };
  }, []);
}