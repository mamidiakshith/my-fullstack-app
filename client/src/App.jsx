import { useState } from "react";
import "./styles/global.css";

// Import pages (we will create these later)
import Login from "./Components/Login";
import Register from "./Components/Register";
import Chat from "./Components/Chat";

function App() {
  const [user, setUser] = useState(null);     // will store logged in user
  const [showRegister, setShowRegister] = useState(false);
  return (
    <div className="app-container">
      {!user ? (
        <div className="auth-container">
          {showRegister ? (
            <Register onRegisterSuccess={(u) => setUser(u)} onSwitch={() => setShowRegister(false)} />
          ) : (
            <Login onLoginSuccess={(u) => setUser(u)} onSwitch={() => setShowRegister(true)} />
          )}
        </div>
      ) : (
        <Chat user={user} onLogout={() => setUser(null)} />
      )}
    </div>
  );
}

export default App;
