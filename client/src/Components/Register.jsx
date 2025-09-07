import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ for redirect
import "../styles/Login.css"; // Reuse same form styles

function Register({ onRegisterSuccess, onSwitch }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate(); // ✅ hook for navigation

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // ✅ Save JWT token
      localStorage.setItem("token", data.token);

      // ✅ Save user to app state
      onRegisterSuccess(data.user);

      // ✅ Redirect to home/dashboard
      navigate("/home"); 
    } catch (err) {
      console.error("Register error:", err);
      setError("Something unexpected happened");
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Register</h2>
      <form onSubmit={handleRegister} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="login-input"
        />
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
        <button type="submit" className="login-btn">Register</button>
      </form>
      <p className="switch-auth">
        Already have an account?{" "}
        <span onClick={onSwitch} className="switch-link">Login</span>
      </p>
    </div>
  );
}

export default Register;
