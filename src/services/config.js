// Centralize API base + common headers

const RAW = (
  process.env.REACT_APP_API_URL || "https://mindmines.eu/api"
).trim();
export const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

export const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};
