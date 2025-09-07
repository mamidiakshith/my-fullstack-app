// api.js
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/auth",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ---------- AUTH ----------
export const registerUser = (userData) => API.post("/users/register", userData);
export const loginUser = (userData) => API.post("/users/login", userData);

// ---------- USERS ----------
export const fetchUsers = () => API.get("/users");

// ---------- MESSAGES ----------
export const fetchMessages = (receiverId) => API.get(`/messages/${receiverId}`);
export const sendMessage = (receiverId, text) =>
  API.post("/messages", { receiverId, text });
