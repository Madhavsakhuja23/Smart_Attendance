import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { registerTeacher } from "../api/backendApi";

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live password validation checks
  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    };
  }, [password]);

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.hasUpper &&
    passwordChecks.hasLower &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial;

  // Email format check
  const isEmailFormatValid = useMemo(() => {
    if (!email) return true;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !teacherId.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setError("Please enter a valid email address (e.g., name@university.edu).");
      return;
    }

    if (!isPasswordValid) {
      setError("Password must meet all security criteria below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await registerTeacher(
        name.trim(),
        teacherId.trim(),
        email.trim(),
        password,
        confirmPassword
      );
      sessionStorage.setItem("token", res.token);
      onRegister(res.teacher);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card register-card">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">✓</div>
          <h1 className="auth-title">Smart Attendance</h1>
          <p className="auth-subtitle">Create Your Teacher Account</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-switch" role="tablist">
          <button
            type="button"
            className="auth-tab"
            role="tab"
            aria-selected="false"
            onClick={onSwitchToLogin}
          >
            Sign In
          </button>
          <button
            type="button"
            className="auth-tab active"
            role="tab"
            aria-selected="true"
          >
            Create Account
          </button>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-name">FULL NAME</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                autoComplete="name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-teacherid">TEACHER / STAFF ID</label>
              <input
                id="reg-teacherid"
                type="text"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="T-1042"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">INSTITUTIONAL EMAIL</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jsmith@university.edu"
              className={email && !isEmailFormatValid ? "input-error" : ""}
              autoComplete="email"
              required
            />
            {email && !isEmailFormatValid && (
              <span className="field-hint error-hint">Please enter a valid email format</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-password">PASSWORD</label>
              <div className="password-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create strong password"
                  autoComplete="new-password"
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

            <div className="form-group">
              <label htmlFor="reg-confirm-password">CONFIRM PASSWORD</label>
              <div className="password-input-wrapper">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={confirmPassword && password !== confirmPassword ? "input-error" : ""}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          </div>

          {confirmPassword && password !== confirmPassword && (
            <div className="field-hint error-hint">Passwords do not match</div>
          )}

          {/* Password Criteria Checklist */}
          <div className="password-criteria-box">
            <span className="criteria-title">PASSWORD REQUIREMENTS</span>
            <div className="criteria-grid">
              <div className={`criteria-item ${passwordChecks.minLength ? "met" : ""}`}>
                <span className="criteria-icon">{passwordChecks.minLength ? "✓" : "○"}</span>
                <span>At least 8 characters</span>
              </div>
              <div className={`criteria-item ${passwordChecks.hasUpper ? "met" : ""}`}>
                <span className="criteria-icon">{passwordChecks.hasUpper ? "✓" : "○"}</span>
                <span>Uppercase letter (A-Z)</span>
              </div>
              <div className={`criteria-item ${passwordChecks.hasLower ? "met" : ""}`}>
                <span className="criteria-icon">{passwordChecks.hasLower ? "✓" : "○"}</span>
                <span>Lowercase letter (a-z)</span>
              </div>
              <div className={`criteria-item ${passwordChecks.hasNumber ? "met" : ""}`}>
                <span className="criteria-icon">{passwordChecks.hasNumber ? "✓" : "○"}</span>
                <span>At least one number (0-9)</span>
              </div>
              <div className={`criteria-item ${passwordChecks.hasSpecial ? "met" : ""}`}>
                <span className="criteria-icon">{passwordChecks.hasSpecial ? "✓" : "○"}</span>
                <span>Special character (!@#$%^&*)</span>
              </div>
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
                Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Switch Prompt */}
        <div className="auth-footer-prompt">
          <p>
            Already have an account?{" "}
            <button
              type="button"
              className="auth-link-btn"
              onClick={onSwitchToLogin}
            >
              Sign in here
            </button>
          </p>
        </div>

        {/* Legal Disclaimer */}
        <div className="auth-legal-note">
          By registering, you agree to our{" "}
          <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
