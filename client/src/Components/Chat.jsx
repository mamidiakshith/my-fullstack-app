// src/Components/Chat.jsx
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import "../styles/Chat.css";
import UserList from "./UserList";
import MessagePanel from "./MessagePanel";

const SOCKET_URL = "http://localhost:5000";

function Chat({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  // fetch users (exclude self)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auth/users");
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
    const s = io(SOCKET_URL, { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => {
      console.log("socket connected", s.id);
      // notify server who is online (server expects this)
      s.emit("user:online", { userId: user.id });
    });

    // someone sent a new message to me
    s.on("message:new", (msg) => {
      // if the incoming message belongs to the currently opened chat -> append
      const partnerId = activeUser?._id;
      if (!partnerId) return; // if no chat open, you may decide to show notifications instead
      const matchesConversation =
        String(msg.sender) === String(partnerId) ||
        String(msg.receiver) === String(partnerId);
      if (matchesConversation) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // acknowledgement sent back to the sender with DB-saved message
    s.on("message:sent", (msg) => {
      // append only if it belongs to active conversation
      const partnerId = activeUser?._id;
      if (String(msg.receiver) === String(partnerId) || String(msg.sender) === String(partnerId)) {
        setMessages((prev) => {
          // avoid duplicates: if message id already present, skip
          if (prev.some((m) => String(m._id || m.id) === String(msg._id || msg.id))) return prev;
          return [...prev, msg];
        });
      }
    });

    // edits / deletes — replace the message in state
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, activeUser?._id]); // reconnect / re-register user:online if activeUser changes

  // load conversation when user selects someone
  useEffect(() => {
    const loadConversation = async () => {
      if (!activeUser) {
        setMessages([]);
        return;
      }
      try {
        // your existing route: /auth/conversations/:userId/messages
        const res = await axios.get(
          `http://localhost:5000/auth/conversations/${activeUser._id}/messages`,
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

  // central send method used by MessagePanel
  const handleSendMessage = async (text) => {
    if (!activeUser) return;

    // prefer socket (real-time)
    if (socket) {
      socket.emit("message:send", {
        sender: user.id,
        receiver: activeUser._id,
        text,
      });
      // do not add locally here — server will emit 'message:sent' back and 'message:new' to receiver
      return;
    }

    // fallback REST if socket not present
    try {
      const res = await axios.post(
        "http://localhost:5000/auth/messages/send",
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

  // send edit/delete through socket if possible or REST fallback
  const handleEditMessage = async (messageId, newText) => {
    if (!messageId) return;
    if (socket) {
      socket.emit("message:edit", { messageId, newText, editor: user.id });
      return;
    }
    // REST fallback
    try {
      const res = await axios.put(
        `http://localhost:5000/auth/messages/${messageId}`,
        { text: newText },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (res.data && res.data.payload) {
        setMessages((prev) => prev.map((m) => (String(m._id) === String(messageId) ? res.data.payload : m)));
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
    // REST fallback
    try {
      const res = await axios.delete(
        `http://localhost:5000/auth/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (res.data && res.data.success) {
        setMessages((prev) => prev.map((m) => (String(m._id) === String(messageId) ? { ...m, deleted: true, text: "This message was deleted" } : m)));
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
          <img src="https://mir-s3-cdn-cf.behance.net/project_modules/2800_opt_1/25f510147375075.62c199e816ab5.png" alt="me" className="profile-pic" />
          <h4>{user.username}</h4>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
<UserList
  users={users}
  onSelectUser={setActiveUser}
  activeUser={activeUser}
  currentUser={user}   // 🔥 add this
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
