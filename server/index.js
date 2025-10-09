// ===============================
// ✅ Imports and Configuration
// ===============================
require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const socketIO = require("socket.io");
const cors = require("cors");

// Models & Routes
const User = require("./Models/usermodel");
const Message = require("./Models/message");
const userRoutes = require("./API/user");
const authMiddleware = require("./Middlewares/authmiddleware");

const app = express();
const server = http.createServer(app);

// ===============================
// ✅ Allowed Origins (Frontend URLs)
// ===============================
const allowedOrigins = [
  "http://localhost:5173"
];

// ===============================
// ✅ CORS Configuration (Safe & Flexible)
// ===============================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Also use express.json() to parse JSON bodies
app.use(express.json());

// ===============================
// ✅ MongoDB Connection
// ===============================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===============================
// ✅ API Routes
// ===============================
app.use("/auth", userRoutes);

// ===============================
// ✅ Online Users Tracking
// ===============================
const onlineUsers = new Map();

// ===============================
// ✅ Socket.IO Setup
// ===============================
const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // --- User Online ---
  socket.on("user:online", async ({ userId }) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: null });
    io.emit("user:status", { userId, isOnline: true });
  });

  // --- Message Sending ---
  socket.on("message:send", async ({ sender, receiver, text }) => {
    if (!sender || !receiver || !text) return;

    try {
      const message = new Message({ sender, receiver, text, delivered: true });
      await message.save();

      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) io.to(receiverSocketId).emit("message:new", message);

      socket.emit("message:sent", message);
    } catch (err) {
      console.error("❌ Error sending message:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // --- Message Editing ---
  socket.on("message:edit", async ({ messageId, newText, editor }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.sender.toString() !== editor) return;

      msg.text = newText;
      msg.edited = true;
      await msg.save();

      const receiverSocketId = onlineUsers.get(msg.receiver.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("message:edited", msg);

      socket.emit("message:edited", msg);
    } catch (err) {
      console.error("❌ Error editing message:", err);
      socket.emit("error", { message: "Failed to edit message" });
    }
  });

  // --- Message Deletion ---
  socket.on("message:delete", async ({ messageId, requester }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.sender.toString() !== requester) return;

      msg.deleted = true;
      msg.text = "This message was deleted";
      await msg.save();

      const receiverSocketId = onlineUsers.get(msg.receiver.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("message:deleted", msg);

      socket.emit("message:deleted", msg);
    } catch (err) {
      console.error("❌ Error deleting message:", err);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // --- Typing Indicator ---
  socket.on("typing:start", ({ sender, receiver }) => {
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId)
      io.to(receiverSocketId).emit("typing:start", { sender });
  });
  socket.on("typing:stop", ({ sender, receiver }) => {
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId)
      io.to(receiverSocketId).emit("typing:stop", { sender });
  });

  // --- Disconnect ---
  socket.on("disconnect", async () => {
    console.log("🔴 Client disconnected:", socket.id);
    const userId = [...onlineUsers.entries()].find(
      ([_, id]) => id === socket.id
    )?.[0];

    if (userId) {
      onlineUsers.delete(userId);
      const now = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now });
      io.emit("user:status", { userId, isOnline: false, lastSeen: now });
    }
  });
});

// ===============================
// ✅ Start Server
// ===============================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
