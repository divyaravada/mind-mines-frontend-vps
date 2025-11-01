// src/services/http.js
import axios from "axios";

const RAW = (
  process.env.REACT_APP_API_URL || "https://mindmines.eu/api"
).trim();
export const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

const http = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true, // mirrors credentials:"include"
});

// Attach Bearer token from localStorage if present
http.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("authTokens");
      if (raw) {
        const { access } = JSON.parse(raw);
        if (access) {
          config.headers.Authorization = `Bearer ${access}`;
        }
      }
    } catch {
      // ignore JSON parse issues
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default http;
