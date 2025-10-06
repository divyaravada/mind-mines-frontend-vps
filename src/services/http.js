// src/services/http.js
import axios from "axios";

const RAW = (
  process.env.REACT_APP_API_URL || "http://localhost:8000/api"
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

export default http;
