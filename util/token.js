// token.js
let accessToken = null;
let accessExp = 0;

export function setAccessToken(token, exp) {
  accessToken = token;
  accessExp = exp || 0;
}
export function getAccessToken() { return accessToken; }
export function getAccessExpiry() { return accessExp; }
export function clearAccess() { accessToken = null; accessExp = 0; }