import axios from "axios";
import { API_BASE, defaultHeaders } from "./config";

const http = axios.create({
  baseURL: API_BASE,
  headers: defaultHeaders,
  withCredentials: true,
});

// Attach Bearer token from localStorage if present
http.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("authTokens");
      if (raw) {
        const { access } = JSON.parse(raw);
        if (access) config.headers.Authorization = `Bearer ${access}`;
      }
    } catch {
      /* ignore */
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default http;
export { API_BASE };
