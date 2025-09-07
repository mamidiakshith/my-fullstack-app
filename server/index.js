const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const cors = require("cors");
require('dotenv').config();

const User = require('./Models/usermodel');
const Message = require('./Models/message');

// Express + HTTP + Socket setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://my-fullstack-app-lhlf-git-main-akshiths-projects-0e94275f.vercel.app"
    ],
    methods: ["GET","POST"],
    credentials: true
  }
});



// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://my-fullstack-app-lhlf-git-main-akshiths-projects-0e94275f.vercel.app"
  ],
  credentials: true
}));


app.use(express.json());

// Routes
const userRoutes = require('./API/user');
app.use('/auth', userRoutes);

// ✅ Fetch past conversation messages
app.get('/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ payload: messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log(err));

// Online users map
const onlineUsers = new Map();

// Socket.IO events
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User comes online
  socket.on('user:online', async ({ userId }) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: null });
    io.emit('user:status', { userId, isOnline: true });
  });

  // Send message
  socket.on('message:send', async ({ sender, receiver, text }) => {
    try {
      const message = new Message({ sender, receiver, text, delivered: true });
      await message.save();

      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:new', message);
      }
      socket.emit('message:sent', message);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // Typing indicators
  socket.on('typing:start', ({ sender, receiver }) => {
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) io.to(receiverSocketId).emit('typing:start', { sender });
  });

  socket.on('typing:stop', ({ sender, receiver }) => {
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) io.to(receiverSocketId).emit('typing:stop', { sender });
  });

  // Mark message as read
  socket.on('message:read', async ({ messageId, reader }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { read: true });
      const message = await Message.findById(messageId);
      const senderSocketId = onlineUsers.get(message.sender.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('message:read', { messageId, reader });
      }
    } catch (err) {
      console.error("Error marking message read:", err);
    }
  });

  // User disconnects
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    const userId = [...onlineUsers.entries()].find(([_, id]) => id === socket.id)?.[0];
    if (userId) {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit('user:status', { userId, isOnline: false, lastSeen: new Date() });
    }
  });
  // Edit message event
socket.on('message:edit', async ({ messageId, newText, editor }) => {
  try {
    const msg = await Message.findById(messageId);
    if (!msg) return;

    // only the sender is allowed to edit
    if (msg.sender.toString() !== editor) {
      return;
    }

    msg.text = newText;
    msg.edited = true;
    await msg.save();

    // send update to both users
    const receiverSocketId = onlineUsers.get(msg.receiver.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:edited', msg);
    }
    socket.emit('message:edited', msg);

  } catch (err) {
    console.error("Error editing message:", err);
  }
});
// Delete message event
socket.on('message:delete', async ({ messageId, requester }) => {
  try {
    const msg = await Message.findById(messageId);
    if (!msg) return;

    // only sender can delete their own message
    if (msg.sender.toString() !== requester) {
      return;
    }

    msg.deleted = true;
    msg.text = "This message was deleted"; // like WhatsApp style
    await msg.save();

    // notify both sender & receiver
    const receiverSocketId = onlineUsers.get(msg.receiver.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:deleted', msg);
    }
    socket.emit('message:deleted', msg);

  } catch (err) {
    console.error("Error deleting message:", err);
  }
});

});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
