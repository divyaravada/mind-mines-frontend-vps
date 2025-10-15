// src/services/http.js
import axios from "axios";

const RAW = (
  process.env.REACT_APP_API_URL || "https://mindmines.eu/api"
).trim();
export const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

const http = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("authTokens");
    if (raw) {
      const { access } = JSON.parse(raw);
      if (access) config.headers.Authorization = `Bearer ${access}`;
    }
  } catch {}
  return config;
});

// Optional: auto refresh once on 401
let refreshing = false;
let queued = [];

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (refreshing) {
          await new Promise((res) => queued.push(res));
        } else {
          refreshing = true;
          const raw = localStorage.getItem("authTokens");
          const tokens = raw ? JSON.parse(raw) : null;
          const refresh = tokens?.refresh;
          if (!refresh) throw new Error("No refresh token");

          const res = await axios.post(`${API_BASE}auth/jwt/refresh/`, {
            refresh,
          });
          const newAccess = res.data?.access;
          if (!newAccess) throw new Error("No access token");

          const newTokens = { ...(tokens || {}), access: newAccess };
          localStorage.setItem("authTokens", JSON.stringify(newTokens));
        }
        queued.forEach((fn) => fn());
        queued = [];
        refreshing = false;

        // retry with new access
        const raw2 = localStorage.getItem("authTokens");
        const { access: a2 } = raw2 ? JSON.parse(raw2) : {};
        if (a2)
          original.headers = {
            ...(original.headers || {}),
            Authorization: `Bearer ${a2}`,
          };
        return http(original);
      } catch (e) {
        refreshing = false;
        queued.forEach((fn) => fn());
        queued = [];
        // optional: logout
        try {
          localStorage.removeItem("authTokens");
        } catch {}
      }
    }
    return Promise.reject(error);
  }
);
export default http;
