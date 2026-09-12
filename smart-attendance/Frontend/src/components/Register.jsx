import { useState, useMemo } from "react";
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card register-card">
        <div className="auth-header">
          <div className="auth-logo-badge">✓</div>
          <h1>Smart Attendance</h1>
          <p className="login-subtitle">Create Your Teacher Account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. John Doe"
                required
              />
            </div>
            <div className="form-group">
              <label>Teacher ID</label>
              <input
                type="text"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="T001"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className={email && !isEmailFormatValid ? "input-error" : ""}
              required
            />
            {email && !isEmailFormatValid && (
              <span className="field-hint error-hint">Please enter a valid email format</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create strong password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={
                    confirmPassword && password !== confirmPassword ? "input-error" : ""
                  }
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
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
                <span>Special char (!@#$%^&*)</span>
              </div>
            </div>
          </div>

          {error && <div className="login-error">⚠ {error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="request-access">
          <p>Already have an account?</p>
          <button type="button" className="request-button" onClick={onSwitchToLogin}>
            Login Instead
          </button>
        </div>
      </div>
    </div>
  );
}
