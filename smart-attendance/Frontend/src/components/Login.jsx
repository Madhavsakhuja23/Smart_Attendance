import { useState } from "react";
import { loginTeacher } from "../api/backendApi";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Enter email and password."); return; }

    try {
      setLoading(true);
      const res = await loginTeacher(email, password);
      sessionStorage.setItem("token", res.token);
      onLogin(res.teacher);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Smart Attendance</h1>
        <p className="login-subtitle">Teacher Login</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        </form>

        <div className="request-access">
          <p>Don't have an account?</p>
          <button type="button" className="request-button">Request Access</button>
        </div>
      </div>
    </div>
  );
}