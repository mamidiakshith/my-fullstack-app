// src/api.js
import axios from "axios";

// ✅ Base Axios instance with deployed backend support
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const API = axios.create({
  baseURL: `${BASE_URL}/auth`, // all routes under /auth
});

// ✅ Automatically attach JWT token
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ---------- AUTH ----------
export const registerUser = (userData) => API.post("/register", userData);
export const loginUser = (userData) => API.post("/login", userData);

// ---------- USERS ----------
export const fetchUsers = () => API.get("/users");

// ---------- MESSAGES ----------
export const fetchMessages = (userId) => API.get(`/conversations/${userId}/messages`);
export const sendMessage = (receiverId, text) => API.post("/messages/send", { receiver: receiverId, text });
export const editMessage = (messageId, newText) => API.put(`/messages/${messageId}`, { text: newText });
export const deleteMessage = (messageId) => API.delete(`/messages/${messageId}`);
export const fetchUnreadCounts = (userId) => API.get(`/messages/unread/${userId}`);
export const markMessagesRead = (userId) => API.patch(`/messages/read/${userId}`);
