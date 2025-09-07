// src/Components/MessagePanel.jsx
import React, { useRef, useEffect, useState } from "react";
import "../styles/MessagePanel.css";

function MessagePanel({
  messages = [],
  activeUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  currentUser,
  socket,
  setMessages,
}) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If server emits edited/deleted via socket, Chat.jsx already updates `messages`.
  // But we keep local listeners only for safety (optional)
  useEffect(() => {
    if (!socket) return;
    const editedHandler = (msg) => {
      setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? msg : m)));
    };
    const deletedHandler = (msg) => {
      setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? msg : m)));
    };

    socket.on("message:edited", editedHandler);
    socket.on("message:deleted", deletedHandler);

    return () => {
      socket.off("message:edited", editedHandler);
      socket.off("message:deleted", deletedHandler);
    };
  }, [socket, setMessages]);

  const formatTime = (msg) => {
    const candidates = [msg.time, msg.createdAt, msg.timestamp];
    for (const c of candidates) {
      if (!c) continue;
      const d = new Date(c);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    }
    return "";
  };

  const isSentByCurrentUser = (msg) => {
    const sender = String(msg.sender || "");
    const curIds = [currentUser?.id, currentUser?._id, currentUser?.email].filter(Boolean).map(String);
    return curIds.includes(sender);
  };

  // Send (uses Chat.jsx handleSendMessage which uses socket or REST)
  const handleSend = (e) => {
    e?.preventDefault();
    if (!text.trim() || !activeUser) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleEdit = (msg) => {
    const newText = prompt("Edit your message:", msg.text);
    if (!newText || newText.trim() === msg.text) return;
    onEditMessage(msg._id, newText.trim());
  };

  const handleDelete = (msg) => {
    if (!window.confirm("Delete this message?")) return;
    onDeleteMessage(msg._id);
  };

  return (
    <div className="message-panel">
      <div className="message-header">
        <h3>{activeUser?.username || "No chat selected"}</h3>
      </div>

      <div className="message-list" role="log" aria-live="polite">
        {messages.length === 0 && <div className="empty">No messages yet</div>}
        {messages.map((msg, idx) => {
          const sent = isSentByCurrentUser(msg);
          const time = formatTime(msg);
          const key = msg._id || msg.id || idx;

          return (
            <div key={key} className={`message ${sent ? "sent" : "received"} ${msg.deleted ? "deleted" : ""}`}>
              <div className="message-text">
                {msg.deleted ? <i>{msg.text}</i> : msg.text}
                {msg.edited && !msg.deleted && <span className="edited-tag"> (edited)</span>}
              </div>

              {time && <div className="message-time">{time}</div>}

              {sent && !msg.deleted && (
                <div className="message-actions">
                  <button onClick={() => handleEdit(msg)} title="Edit">✏️</button>
                  <button onClick={() => handleDelete(msg)} title="Delete">🗑️</button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input" onSubmit={handleSend}>
        <input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">➤</button>
      </form>
    </div>
  );
}

export default MessagePanel;
