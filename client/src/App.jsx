import { useState, useEffect } from "react";
import "./styles/global.css";

import Login from "./Components/Login";
import Register from "./Components/Register";
import Chat from "./Components/Chat";

function App() {
  const [user, setUser] = useState(null);     // Logged-in user
  const [showRegister, setShowRegister] = useState(false);

  // ✅ Optional: persist user session on page reload
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !user) {
      // Here, you could call backend to fetch user details if needed
      setUser({ id: "me", username: "Me" }); // placeholder
    }
  }, [user]);

  return (
    <div className="app-container">
      {!user ? (
        <div className="auth-container">
          {showRegister ? (
            <Register
              onRegisterSuccess={(u) => setUser(u)}
              onSwitch={() => setShowRegister(false)}
            />
          ) : (
            <Login
              onLoginSuccess={(u) => setUser(u)}
              onSwitch={() => setShowRegister(true)}
            />
          )}
        </div>
      ) : (
        <Chat
          user={user}
          onLogout={() => {
            localStorage.removeItem("token"); // ✅ clear JWT
            setUser(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
