// src/Components/Chat.jsx
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import "../styles/Chat.css";
import UserList from "./UserList";
import MessagePanel from "./MessagePanel";

// ✅ Use environment variable for backend URL
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Chat({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  // fetch users (exclude self)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/auth/users`);
        const list = res.data.payload || [];
        setUsers(list.filter((u) => String(u._id) !== String(user.id)));
      } catch (err) {
        console.error("fetch users error", err);
      }
    };
    fetchUsers();
  }, [user.id]);

  // connect socket once when user logs in
  useEffect(() => {
    if (!user) return;

    const s = io(BASE_URL, { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => {
      console.log("socket connected", s.id);
      s.emit("user:online", { userId: user.id });
    });

    s.on("message:new", (msg) => {
      const partnerId = activeUser?._id;
      if (!partnerId) return;
      const matchesConversation =
        String(msg.sender) === String(partnerId) ||
        String(msg.receiver) === String(partnerId);
      if (matchesConversation) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    s.on("message:sent", (msg) => {
      const partnerId = activeUser?._id;
      if (
        String(msg.receiver) === String(partnerId) ||
        String(msg.sender) === String(partnerId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id || m.id) === String(msg._id || msg.id)))
            return prev;
          return [...prev, msg];
        });
      }
    });

    s.on("message:edited", (msg) => {
      setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? msg : m)));
    });

    s.on("message:deleted", (msg) => {
      setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? msg : m)));
    });

    s.on("disconnect", () => {
      console.log("socket disconnected");
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user.id, activeUser?._id]);

  // load conversation when user selects someone
  useEffect(() => {
    const loadConversation = async () => {
      if (!activeUser) {
        setMessages([]);
        return;
      }
      try {
        const res = await axios.get(
          `${BASE_URL}/auth/conversations/${activeUser._id}/messages`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setMessages(res.data.payload || []);
      } catch (err) {
        console.error("fetch conversation error", err);
        setMessages([]);
      }
    };
    loadConversation();
  }, [activeUser]);

  const handleSendMessage = async (text) => {
    if (!activeUser) return;

    if (socket) {
      socket.emit("message:send", {
        sender: user.id,
        receiver: activeUser._id,
        text,
      });
      return;
    }

    try {
      const res = await axios.post(
        `${BASE_URL}/auth/messages/send`,
        { receiver: activeUser._id, text },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (res.data && res.data.payload) {
        setMessages((prev) => [...prev, res.data.payload]);
      }
    } catch (err) {
      console.error("fallback send error", err);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!messageId) return;
    if (socket) {
      socket.emit("message:edit", { messageId, newText, editor: user.id });
      return;
    }
    try {
      const res = await axios.put(
        `${BASE_URL}/auth/messages/${messageId}`,
        { text: newText },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (res.data && res.data.payload) {
        setMessages((prev) =>
          prev.map((m) => (String(m._id) === String(messageId) ? res.data.payload : m))
        );
      }
    } catch (err) {
      console.error("edit fallback error", err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    if (socket) {
      socket.emit("message:delete", { messageId, requester: user.id });
      return;
    }
    try {
      const res = await axios.delete(`${BASE_URL}/auth/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data && res.data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === String(messageId)
              ? { ...m, deleted: true, text: "This message was deleted" }
              : m
          )
        );
      }
    } catch (err) {
      console.error("delete fallback error", err);
    }
  };

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <div className="sidebar-logo">💬 Bixby</div>
        <div className="sidebar-header">
          <img
            src="https://mir-s3-cdn-cf.behance.net/project_modules/2800_opt_1/25f510147375075.62c199e816ab5.png"
            alt="me"
            className="profile-pic"
          />
          <h4>{user.username}</h4>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
        <UserList
          users={users}
          onSelectUser={setActiveUser}
          activeUser={activeUser}
          currentUser={user}
        />
      </aside>

      <main className="chat-main">
        {activeUser ? (
          <MessagePanel
            messages={messages}
            activeUser={activeUser}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={user}
            socket={socket}
            setMessages={setMessages}
          />
        ) : (
          <div className="chat-placeholder">👈 Select a user to start chatting</div>
        )}
      </main>
    </div>
  );
}

export default Chat;
