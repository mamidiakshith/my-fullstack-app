import React, { useEffect, useState } from "react";
import "../styles/UserList.css";

function UserList({ users, activeUser, onSelectUser, currentUser }) {
  const [unreadCounts, setUnreadCounts] = useState({});

  // 🔄 Fetch unread counts
  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem("token");

    const fetchUnread = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/auth/messages/unread/${currentUser._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();

        // Convert [{_id, count}] into { senderId: count }
        const counts = {};
        data.payload.forEach((item) => {
          counts[item._id] = item.count;
        });
        setUnreadCounts(counts);
      } catch (err) {
        console.error("Failed to fetch unread counts", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 5000); // refresh every 5 sec
    return () => clearInterval(interval);
  }, [currentUser]);

  // ✅ Mark messages as read when selecting a user
  const handleSelectUser = async (user) => {
    onSelectUser(user);

    const token = localStorage.getItem("token");
    try {
      await fetch(`http://localhost:5000/auth/messages/read/${user._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      // remove unread badge immediately (optimistic update)
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[user._id];
        return updated;
      });
    } catch (err) {
      console.error("Failed to mark messages as read", err);
    }
  };

  return (
    <div className="userlist-container">
      <h3>Friends</h3>
      <div className="userlist">
        {users.length === 0 ? (
          <p className="empty">No users online</p>
        ) : (
          users.map((user) => {
            const unread = unreadCounts[user._id] || 0;
            const isActive = activeUser && activeUser._id === user._id;

            return (
              <div
                key={user._id}
                className={`user-item ${isActive ? "active" : ""}`}
                onClick={() => handleSelectUser(user)}
              >
                <span
                  className={`status ${user.isOnline ? "online" : "offline"}`}
                />
                <span className="username">{user.username}</span>
                {unread > 0 && (
                  <span className="unread-badge">{unread}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default UserList;
