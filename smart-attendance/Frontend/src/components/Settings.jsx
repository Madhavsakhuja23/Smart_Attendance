import { useState, useEffect } from "react";
import { getAddonConnectionStatus } from "../services/api";
import { disconnectGoogleSheets, changePassword } from "../api/backendApi";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "../context/ToastContext";

export default function Settings({ user, onDisconnectAddon }) {
  const token = sessionStorage.getItem("token");
  const { showToast } = useToast();

  // Connection state
  const [connection, setConnection] = useState(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoadingConn(true);
      const res = await getAddonConnectionStatus();
      setConnection(res);
    } catch (err) {
      setConnection(null);
    } finally {
      setLoadingConn(false);
    }
  }

  async function handleConfirmDisconnect() {
    try {
      setDisconnecting(true);
      await disconnectGoogleSheets(token);
      showToast("Google Sheets disconnected successfully.", "success");
      setConnection((prev) => (prev ? { ...prev, connected: false } : null));
      setShowDisconnectModal(false);
      if (onDisconnectAddon) onDisconnectAddon();
    } catch (err) {
      showToast(err.message || "Failed to disconnect Google Sheets.", "error");
    } finally {
      setDisconnecting(false);
    }
  }

  function handleCopySpreadsheetId(id) {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(true);
      showToast("Spreadsheet ID copied to clipboard", "info");
      setTimeout(() => setCopiedId(false), 2000);
    });
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPwdError("All password fields are required.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    try {
      setPwdLoading(true);
      const res = await changePassword(
        token,
        currentPassword,
        newPassword,
        confirmNewPassword
      );
      const successMsg = res.message || "Password changed successfully.";
      setPwdSuccess(successMsg);
      showToast(successMsg, "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      const errorMsg = err.message || "Failed to change password.";
      setPwdError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-header-icon">⚙</div>
        <div>
          <h2>Account Settings</h2>
          <p className="settings-subtitle">
            Manage your teacher profile credentials, connected Google Sheets, and account security.
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="card-icon-badge">👤</div>
          <div>
            <h3>Profile Information</h3>
            <p>Your institutional teacher profile details</p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="setting-item">
            <span className="setting-label">FULL NAME</span>
            <p className="setting-value">{user?.name || "N/A"}</p>
          </div>
          <div className="setting-item">
            <span className="setting-label">TEACHER ID</span>
            <p className="setting-value monospace-tag">{user?.teacherId || "N/A"}</p>
          </div>
          <div className="setting-item">
            <span className="setting-label">REGISTERED EMAIL</span>
            <p className="setting-value">{user?.email || "N/A"}</p>
          </div>
          <div className="setting-item">
            <span className="setting-label">ACCOUNT ROLE</span>
            <p className="setting-value role-badge">{user?.role || "Teacher"}</p>
          </div>
        </div>
      </div>

      {/* Google Integration Settings */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="card-icon-badge sheets-icon-badge">📊</div>
          <div>
            <h3>Google Sheets Connection</h3>
            <p>Live integration status with your Google Workspace Spreadsheet</p>
          </div>
        </div>

        {loadingConn ? (
          <div className="loading-box">
            <div className="spinner" />
            <span>Checking connection status...</span>
          </div>
        ) : connection?.connected ? (
          <div className="connection-details-box">
            <div className="connection-badge connected">
              <span className="status-dot green animate-pulse"></span>
              <span>Connected to Google Sheets</span>
            </div>

            <div className="settings-grid" style={{ marginTop: "16px" }}>
              <div className="setting-item">
                <span className="setting-label">CONNECTED SPREADSHEET</span>
                <p className="setting-value font-semibold">
                  {connection.teacher?.spreadsheetName || "Google Sheet"}
                </p>
              </div>

              <div className="setting-item">
                <span className="setting-label">SPREADSHEET ID</span>
                <div className="copyable-input-row">
                  <code className="monospace-tag spreadsheet-id-tag">
                    {connection.teacher?.spreadsheetId}
                  </code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopySpreadsheetId(connection.teacher?.spreadsheetId)}
                    title="Copy ID"
                  >
                    {copiedId ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="setting-item">
                <span className="setting-label">AUTHORIZED GOOGLE ACCOUNT</span>
                <p className="setting-value">
                  {connection.teacher?.googleEmail || "Connected via Add-on"}
                </p>
              </div>
            </div>

            <div className="danger-zone-box">
              <div className="danger-zone-info">
                <strong>Disconnect Google Sheets</strong>
                <p>
                  Disconnecting will revoke the current pairing token. You will need to pair again to manage attendance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDisconnectModal(true)}
                disabled={disconnecting}
                className="btn btn-danger"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect Google Sheets"}
              </button>
            </div>
          </div>
        ) : (
          <div className="connection-empty-box">
            <div className="connection-badge disconnected">
              <span className="status-dot red"></span>
              <span>Not Connected</span>
            </div>
            <p className="connection-empty-text">
              No Google Sheet is currently paired with your account. Open your spreadsheet, launch the Smart Attendance Add-on, and enter your 6-digit pairing code to connect.
            </p>
          </div>
        )}
      </div>

      {/* Change Password Form */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="card-icon-badge security-icon-badge">🔒</div>
          <div>
            <h3>Change Password</h3>
            <p>Update your teacher portal password regularly for enhanced security</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="settings-form">
          <div className="form-group">
            <label>CURRENT PASSWORD</label>
            <div className="password-input-wrapper">
              <input
                type={showCurrentPwd ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                title={showCurrentPwd ? "Hide" : "Show"}
              >
                {showCurrentPwd ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>NEW PASSWORD</label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  title={showNewPwd ? "Hide" : "Show"}
                >
                  {showNewPwd ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>CONFIRM NEW PASSWORD</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
          </div>

          <div className="password-guide-banner">
            <span className="guide-icon">ℹ</span>
            <span>
              Password must be at least 8 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.
            </span>
          </div>

          {pwdError && <div className="alert error">⚠ {pwdError}</div>}
          {pwdSuccess && <div className="alert success">✓ {pwdSuccess}</div>}

          <div className="settings-form-actions">
            <button type="submit" disabled={pwdLoading} className="btn btn-primary">
              {pwdLoading ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleConfirmDisconnect}
        title="Disconnect Google Sheets?"
        message="You will need to pair your Google Sheet again before you can manage attendance."
        confirmText="Disconnect"
        cancelText="Cancel"
        isDestructive={true}
        loading={disconnecting}
      />
    </div>
  );
}
