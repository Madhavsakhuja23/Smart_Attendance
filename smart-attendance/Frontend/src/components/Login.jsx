import { useState } from "react";
import { Link } from "react-router-dom";
import { loginTeacher } from "../api/backendApi";

export default function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await loginTeacher(email.trim(), password);
      sessionStorage.setItem("token", res.token);
      onLogin(res.teacher);
    } catch (err) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">✓</div>
          <h1 className="auth-title">Smart Attendance</h1>
          <p className="auth-subtitle">Teacher Portal Authentication</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-switch" role="tablist">
          <button
            type="button"
            className="auth-tab active"
            role="tab"
            aria-selected="true"
          >
            Sign In
          </button>
          <button
            type="button"
            className="auth-tab"
            role="tab"
            aria-selected="false"
            onClick={onSwitchToRegister}
          >
            Create Account
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email">WORK / UNIVERSITY EMAIL</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@university.edu"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">PASSWORD</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert error auth-alert" role="alert">
              <span>⚠ {error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading-content">
                <span className="spinner" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Switch Link */}
        <div className="auth-footer-prompt">
          <p>
            Don't have an account?{" "}
            <button
              type="button"
              className="auth-link-btn"
              onClick={onSwitchToRegister}
            >
              Register here
            </button>
          </p>
        </div>

        {/* Legal Disclaimer */}
        <div className="auth-legal-note">
          By signing in, you agree to our{" "}
          <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}