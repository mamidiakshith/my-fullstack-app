import { useState } from "react";
import "../styles/Login.css";

function Login({ onLoginSuccess, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const res = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // backend always returns { error: "..." } for failures
      setError(data.error || "Login failed");
      return;
    }

    // Save JWT token in localStorage
    localStorage.setItem("token", data.token);

    // Notify parent App.jsx about successful login
    onLoginSuccess(data.user);

  } catch (err) {
    console.error("Login request failed:", err);
    setError("Network error, please try again");
  }
};


  return (
    <div className="login-container">
      <h2 className="login-title">Login</h2>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-btn">Login</button>
      </form>
      <p className="switch-auth">
        Don’t have an account?{" "}
        <span onClick={onSwitch} className="switch-link">Register</span>
      </p>
    </div>
  );
}

export default Login;
