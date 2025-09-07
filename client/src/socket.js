import { io } from "socket.io-client";

// ✅ Use environment variable for backend URL
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const socket = io(BASE_URL, {
  autoConnect: false,
  transports: ["websocket"], // ensures only websocket transport
});
