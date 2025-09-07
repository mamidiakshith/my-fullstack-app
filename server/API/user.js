const express = require('express');
const useapp = express.Router();
useapp.use(express.json());

const asynced = require('express-async-handler');
const User = require('../Models/usermodel');
const Message = require('../Models/message');
const authMiddleware = require('../Middlewares/authmiddleware');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
useapp.post('/register', asynced(async (req, res) => {
    const data = req.body;

    const ext = await User.findOne({ email: data.email });
    if (ext) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(7);
    data.password = await bcrypt.hash(data.password, salt);

    const newUser = new User(data);
    const savedUser = await newUser.save();

    // ✅ create JWT right after registration
    const token = jwt.sign(
        { id: savedUser._id, email: savedUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.status(201).json({
        message: "User registered",
        token,    // ✅ frontend can now save this
        user: {   // ✅ match login response
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email
        }
    });
}));



// LOGIN
useapp.post('/login', asynced(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const udata = await User.findOne({ email });
    if (!udata) {
        return res.status(401).json({ error: 'Email not found' });
    }

    const match = await bcrypt.compare(password, udata.password);
    if (!match) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign(
        { id: udata._id, email: udata.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.send({
        message: 'Login successful',
        token,
        user: {
            id: udata._id,
            username: udata.username,
            email: udata.email
        }
    });
}));

// GET ALL USERS (exclude passwords)
useapp.get('/users', asynced(async (req, res) => {
    const users = await User.find({}, '-password');
    res.send({ message: "User list", payload: users });
}));

// DELETE USER BY USERNAME
useapp.delete('/users/:username', asynced(async (req, res) => {
    const username = req.params.username;
    const deleted = await User.deleteOne({ username });
    res.send({ message: "User deleted", payload: deleted });
}));

// GET CONVERSATION MESSAGES
useapp.get('/conversations/:userId/messages', authMiddleware, asynced(async (req, res) => {
    const userId = req.params.userId;
    const loggedInUserId = req.user.id;

    const messages = await Message.find({
        $or: [
            { sender: loggedInUserId, receiver: userId },
            { sender: userId, receiver: loggedInUserId }
        ]
    }).sort({ createdAt: 1 });

    res.json({ message: 'Conversation messages', payload: messages });
}));

// ✅ SINGLE SEND MESSAGE ROUTE
useapp.post('/messages/send', authMiddleware, asynced(async (req, res) => {
    const { receiver, text } = req.body;
    const sender = req.user.id; // from JWT

    if (!receiver || !text) {
        return res.status(400).json({ error: "Receiver and text are required" });
    }

    const newMessage = new Message({
        sender,
        receiver,
        text,
        delivered: true
    });

    const savedMessage = await newMessage.save();

    res.status(201).json({
        message: "Message sent",
        payload: savedMessage
    });
}));
// Get unread message counts for a user
useapp.get('/messages/unread/:userId', asynced(async (req, res) => {
  const { userId } = req.params;

  const unread = await Message.aggregate([
    { $match: { receiver: userId, read: false } },
    { $group: { _id: "$sender", count: { $sum: 1 } } }
  ]);

  res.json({ payload: unread }); 
}));

// Mark all messages from sender as read when user opens chat
useapp.patch('/messages/read/:senderId', authMiddleware, asynced(async (req, res) => {
  const { senderId } = req.params;
  const userId = req.user.id; // logged-in receiver

  await Message.updateMany(
    { sender: senderId, receiver: userId, read: false },
    { $set: { read: true } }
  );

  res.json({ message: "Messages marked as read" });
}));


module.exports = useapp;
