export default function SetupPage({ teacher, onLogout }) {
  return (
    <div className="setup-page">
      <div className="setup-container">

        {/* Header */}
        <div className="setup-header">
          <div className="setup-brand">
            <div className="brand-icon">✓</div>
            <h1>Smart Attendance</h1>
          </div>
          <button className="logout-button" onClick={onLogout}>Logout</button>
        </div>

        {/* Welcome Card */}
        <div className="setup-welcome-card">
          <div className="setup-welcome-icon">🎉</div>
          <div>
            <h2>Welcome, {teacher.name?.split(" ")[0]}!</h2>
            <p>Your account has been created successfully. Before you can access the attendance dashboard, you need to complete the initial setup.</p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="setup-steps-card">
          <div className="setup-steps-heading">
            <div className="section-icon">⚙️</div>
            <div>
              <h3>Setup Required</h3>
              <p>Complete these steps to activate your dashboard</p>
            </div>
          </div>

          <div className="setup-steps-list">
            <div className="setup-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Google Apps Script Configuration</h4>
                <p>Link your Google Spreadsheet with the attendance system</p>
              </div>
              <span className="step-status coming-soon">Coming Soon</span>
            </div>

            <div className="setup-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Spreadsheet Setup</h4>
                <p>Configure your class sheets and student data</p>
              </div>
              <span className="step-status coming-soon">Coming Soon</span>
            </div>

            <div className="setup-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Verification</h4>
                <p>Test the connection and finalize your setup</p>
              </div>
              <span className="step-status coming-soon">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="setup-info-banner">
          <div className="setup-info-icon">ℹ️</div>
          <div>
            <strong>Setup will be available soon</strong>
            <p>The guided setup wizard is currently under development. You will be notified when it's ready. In the meantime, your account is secure and ready.</p>
          </div>
        </div>

        {/* Account Info */}
        <div className="setup-account-card">
          <h4>Your Account</h4>
          <div className="setup-account-details">
            <div><span>NAME</span><strong>{teacher.name}</strong></div>
            <div><span>ID</span><strong>{teacher.teacherId}</strong></div>
            <div><span>EMAIL</span><strong>{teacher.email}</strong></div>
            <div><span>STATUS</span><strong className="setup-status-active">Active</strong></div>
          </div>
        </div>

      </div>
    </div>
  );
}
