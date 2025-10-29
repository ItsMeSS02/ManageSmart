import axios from "axios";

const API_URL = "http://localhost:5000/api";

const getToken = () => localStorage.getItem("token");

export const api = axios.create({
  baseURL: API_URL,
});

// Add auth header automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
