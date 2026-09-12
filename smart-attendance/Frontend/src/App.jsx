import { useCallback, useEffect, useMemo, useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import SetupPage from "./components/SetupPage";
import QRGenerator from "./components/QRGenerator";
import QRScanner from "./components/QRScanner";
import { getTeacherClasses, getTeacherProfile } from "./api/backendApi";
import { fetchStudents, createSession, markPresent, finalizeDay, getAttendanceStatus } from "./services/api";
import "./App.css";

function App() {
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState("");
  const [authView, setAuthView] = useState("login");

  const [className, setClassName] = useState("");
  const [students, setStudents] = useState([]);
  const [session, setSession] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scanHistory, setScanHistory] = useState([]);
  const [finalized, setFinalized] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    (async () => {
      const token = sessionStorage.getItem("token");
      if (!token) { setCheckingAuth(false); return; }

      try {
        setLoadingClasses(true);
        setClassError("");
        const [profile, classesRes] = await Promise.all([
          getTeacherProfile(token),
          getTeacherClasses(token),
        ]);
        setTeacher(profile.teacher);
        setClasses(classesRes.classes || []);
      } catch {
        sessionStorage.removeItem("token");
        setTeacher(null);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
        setCheckingAuth(false);
      }
    })();
  }, []);

  const presentCount = useMemo(() => students.filter(s => s.status === "PRESENT").length, [students]);
  const pendingCount = useMemo(() => students.filter(s => !s.status || s.status === "PENDING").length, [students]);
  const absentCount = useMemo(() => students.filter(s => s.status === "ABSENT").length, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        String(s.roll).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PRESENT") return s.status === "PRESENT";
      if (statusFilter === "PENDING") return !s.status || s.status === "PENDING";
      if (statusFilter === "ABSENT") return s.status === "ABSENT";
      return true;
    });
  }, [students, searchQuery, statusFilter]);

  const handleLogin = async (teacherData) => {
    setTeacher(teacherData);
    const token = sessionStorage.getItem("token");
    if (!token) { setClassError("Login token not found."); return; }
    try {
      setLoadingClasses(true); setClassError("");
      const res = await getTeacherClasses(token);
      setClasses(res.classes || []);
    } catch (e) { setClassError(e.message); }
    finally { setLoadingClasses(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    setTeacher(null); setClasses([]); setClassName(""); setStudents([]);
    setSession(null); setScannerOpen(false); setScanHistory([]);
    setFinalized(false); setAttendanceSummary(null); setMessage(""); setClassError("");
    setAuthView("login");
  };

  const handleSetupComplete = (setupData) => {
    setTeacher(prev => ({
        ...prev,
        setupCompleted: true
    }));

    if (setupData?.teacher?.classes) {
        setClasses(setupData.teacher.classes);
    }
};

  const handleClassChange = (e) => {
    setClassName(e.target.value);
    setStudents([]); setSession(null); setScannerOpen(false);
    setScanHistory([]); setFinalized(false); setAttendanceSummary(null); setMessage("");
  };

  async function handleGetStudents() {
    if (!className) { setMessage("Please select a class first."); return; }
    try {
      setLoading(true); setMessage("");
      const [studentsRes, statusRes] = await Promise.all([
        fetchStudents(className), getAttendanceStatus(className),
      ]);

      const attMap = new Map(
        (statusRes.students || []).map(s => [String(s.roll).trim(), s.status || "PENDING"])
      );
      const formatted = (studentsRes.students || []).map(s => ({
        ...s, status: attMap.get(String(s.roll).trim()) || "PENDING",
      }));

      setStudents(formatted);
      setAttendanceSummary(statusRes);
      setFinalized(Boolean(statusRes.finalized));
      setSession(null); setScannerOpen(false); setScanHistory([]);

      setMessage(statusRes.finalized
        ? `Today's attendance is finalized. Present: ${statusRes.present}, Absent: ${statusRes.absent}.`
        : `${formatted.length} students loaded. Present: ${statusRes.present}, Absent: ${statusRes.absent}, Pending: ${statusRes.pending}.`
      );
    } catch (e) { setMessage(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }

  async function handleCreateSession() {
    if (!students.length) { setMessage("Load students first."); return; }
    if (finalized) { setMessage("Attendance already finalized."); return; }
    try {
      setLoading(true); setMessage("");
      const res = await createSession(className);
      setSession(res.session);
      setMessage("Session created — you can now generate QR codes.");
    } catch (e) { setMessage(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }

  const handleScan = useCallback(async (qrData) => {
    if (!session || finalized) throw new Error("Session not active.");
    try {
      setMessage("Verifying...");
      const res = await markPresent({
        className, rollNumber: qrData.rollNumber, date: qrData.date, sessionId: qrData.sessionId,
      });

      setStudents(prev => prev.map(s =>
        String(s.roll) === String(res.student.roll) ? { ...s, status: "PRESENT" } : s
      ));
      setAttendanceSummary(prev => prev ? {
        ...prev,
        present: Math.min(prev.total, (prev.present || 0) + 1),
        pending: Math.max(0, (prev.pending || 0) - 1),
      } : prev);
      setScanHistory(prev => [
        { roll: res.student.roll, name: res.student.name, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      setMessage(`✅ Marked present — Roll ${res.student.roll}`);
      return res;
    } catch (e) { setMessage(`❌ ${e.message}`); throw e; }
  }, [className, session, finalized]);

  async function handleFinalize() {
    if (!session) { setMessage("Create a session first."); return; }
    if (!window.confirm(`Finalize attendance?\n\nPresent: ${presentCount}\nPending: ${pendingCount}\n\nPending students will be marked absent.`)) return;

    try {
      setLoading(true); setMessage("");
      const res = await finalizeDay({ className, sessionId: session.sessionId });
      setFinalized(true); setScannerOpen(false);
      setStudents(prev => prev.map(s => ({ ...s, status: s.status === "PRESENT" ? "PRESENT" : "ABSENT" })));
      setAttendanceSummary(prev => prev ? { ...prev, present: res.present, absent: res.absent, pending: 0, finalized: true } : prev);
      setMessage(`✅ Finalized. Present: ${res.present}, Absent: ${res.absent}`);
    } catch (e) { setMessage(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }

  // ── Loading screen ──
  if (checkingAuth) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <h2>Smart Attendance</h2>
        <p>Checking your session...</p>
      </div>
    );
  }

  // ── Login / Register ──
  if (!teacher) {
    if (authView === "register") {
      return (
        <Register
          onRegister={(teacherData) => setTeacher(teacherData)}
          onSwitchToLogin={() => setAuthView("login")}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView("register")}
      />
    );
  }

  // ── Setup Required (new teachers with setupCompleted: false) ──
 if (teacher.setupCompleted === false) {
    return (
        <SetupPage
            teacher={teacher}
            onLogout={handleLogout}
            onSetupComplete={handleSetupComplete}
        />
    );
}

  // ── Dashboard ──
  return (
    <div className="app">
      <header className="header">
        <div className="brand-area">
          <div className="brand-icon">✓</div>
          <div>
            <h1>Smart Attendance</h1>
            <p>QR-Based Attendance</p>
          </div>
        </div>
        <div className="header-right">
          <div className="teacher-mini">
            <div className="teacher-avatar">{teacher.name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <strong>{teacher.name}</strong>
              <span>{teacher.teacherId}</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Welcome */}
        <section className="welcome-section">
          <div>
            <p className="welcome-label">TEACHER DASHBOARD</p>
            <h2>Welcome back, {teacher.name?.split(" ")[0]} 👋</h2>
            <p>Manage your classroom attendance quickly and securely.</p>
          </div>
          <div className="today-card">
            <span>TODAY</span>
            <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
          </div>
        </section>

        {/* Teacher Profile */}
        <section className="teacher-info-card">
          <div className="section-title">
            <div className="section-icon">👤</div>
            <div><h3>Profile</h3><p>Your account details</p></div>
          </div>
          <div className="teacher-details">
            <div><span>NAME</span><strong>{teacher.name}</strong></div>
            <div><span>ID</span><strong>{teacher.teacherId}</strong></div>
            <div><span>EMAIL</span><strong>{teacher.email}</strong></div>
            <div><span>LOGGED IN</span><strong>{teacher.lastLoginAt ? new Date(teacher.lastLoginAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Just now"}</strong></div>
          </div>
        </section>

        {/* Class Selection */}
        <section className="card">
          <div className="card-heading">
            <div className="section-icon">🏫</div>
            <div><h2>Select Classroom</h2><p>Choose your target class to load active students</p></div>
          </div>

          {loadingClasses && (
            <div className="loading-box"><div className="spinner" /> Loading classes...</div>
          )}
          {classError && <div className="error-message">⚠ {classError}</div>}
          {!loadingClasses && !classError && (
            <div className="class-controls">
              <div className="select-wrapper">
                <label>CLASS</label>
                <select value={className} onChange={handleClassChange} disabled={loading}>
                  <option value="">Select a class</option>
                  {classes.map(c => <option value={c} key={c}>{c}</option>)}
                </select>
              </div>
              <button className="primary-button" onClick={handleGetStudents} disabled={loading || !className}>
                {loading ? "Loading..." : "Load Students"}
              </button>
            </div>
          )}
        </section>

        {/* Stats & Progress */}
        {students.length > 0 && (
          <section className="card stats-section">
            <div className="stats">
              <div className="stat-card">
                <div className="stat-icon total-icon">👥</div>
                <div><span>TOTAL</span><strong>{attendanceSummary?.total ?? students.length}</strong></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon present-icon">✓</div>
                <div><span>PRESENT</span><strong>{attendanceSummary?.present ?? presentCount}</strong></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon pending-icon">◷</div>
                <div><span>PENDING</span><strong>{attendanceSummary?.pending ?? pendingCount}</strong></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon absent-icon">!</div>
                <div><span>ABSENT</span><strong>{attendanceSummary?.absent ?? absentCount}</strong></div>
              </div>
            </div>

            {/* Attendance Progress Bar */}
            <div className="attendance-progress-box">
              <div className="progress-label-row">
                <span>Attendance Progress</span>
                <strong>
                  {Math.round(((attendanceSummary?.present ?? presentCount) / (attendanceSummary?.total ?? students.length)) * 100) || 0}% Completed
                </strong>
              </div>
              <div className="attendance-progress-track">
                <div
                  className="attendance-progress-fill"
                  style={{
                    width: `${Math.round(((attendanceSummary?.present ?? presentCount) / (attendanceSummary?.total ?? students.length)) * 100) || 0}%`
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Session Card */}
        {students.length > 0 && !finalized && (
          <section className="card">
            <div className="card-heading">
              <div className="section-icon">📋</div>
              <div><h2>Attendance Session</h2><p>Create & manage active session for {className}</p></div>
            </div>
            {!session ? (
              <div className="session-start-box">
                <div className="session-icon">📋</div>
                <div className="session-content">
                  <h3>Ready to take attendance?</h3>
                  <p>Create a session, then generate personalized QR codes for students.</p>
                </div>
                <button className="primary-button" onClick={handleCreateSession} disabled={loading}>
                  {loading ? "Creating..." : "Create Session"}
                </button>
              </div>
            ) : (
              <div className="session-active-box">
                <div className="success-icon">✓</div>
                <div>
                  <span className="session-status">SESSION ACTIVE</span>
                  <h3>Session ready for {className}</h3>
                  <p>Dispatch QR codes to student emails or launch camera scanner.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* QR Dispatcher */}
        {session && !finalized && (
          <section className="card qr-card">
            <div className="card-heading">
              <div className="section-icon">📤</div>
              <div><h2>Dispatch QR Codes</h2><p>Send personalized QR codes directly to student emails</p></div>
            </div>
            <QRGenerator
              students={students} className={className}
              date={session.date} sessionId={session.sessionId}
              onComplete={() => setMessage("✅ QR codes dispatched successfully.")}
            />
          </section>
        )}

        {/* Camera Scanner */}
        {session && !finalized && (
          <section className="card">
            <div className="card-heading">
              <div className="section-icon">📷</div>
              <div><h2>Camera QR Scanner</h2><p>Scan student attendance badges in real-time</p></div>
            </div>
            {!scannerOpen ? (
              <button className="scanner-button" onClick={() => setScannerOpen(true)}>
                <span>📷</span> Launch Camera Scanner
              </button>
            ) : (
              <div className="scanner-area">
                <div className="scanner-header">
                  <div>
                    <span className="live-dot" />
                    <strong>Camera Active</strong>
                  </div>
                  <button className="close-button" onClick={() => setScannerOpen(false)}>Close Scanner</button>
                </div>
                <QRScanner onScan={handleScan} />
              </div>
            )}
          </section>
        )}

        {/* Message */}
        {message && (
          <div className={message.startsWith("❌") ? "error-message" : "success-message"}>
            {message}
          </div>
        )}

        {/* Finalized banner */}
        {students.length > 0 && finalized && (
          <div className="success-message">
            🔒 Attendance is finalized. Status below is from the sheet.
          </div>
        )}

        {/* Student Table */}
        {students.length > 0 && (
          <section className="card">
            <div className="table-header-row">
              <div className="card-heading">
                <div className="section-icon">👥</div>
                <div><h2>Class Roster</h2><p>{students.length} students loaded for {className}</p></div>
              </div>
              <div className="table-controls">
                <input
                  type="text"
                  className="search-input"
                  placeholder="🔍 Search name, roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="filter-tabs">
                  {["ALL", "PRESENT", "PENDING", "ABSENT"].map(tab => (
                    <button
                      key={tab}
                      className={statusFilter === tab ? "filter-tab active" : "filter-tab"}
                      onClick={() => setStatusFilter(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr><th>ROLL</th><th>NAME</th><th>EMAIL</th><th>STATUS</th></tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-table-msg">
                        No students match your filter search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => (
                      <tr key={s.roll}>
                        <td><strong>{s.roll}</strong></td>
                        <td>{s.name}</td>
                        <td className="email-cell">{s.email}</td>
                        <td>
                          <span className={`status-badge ${(s.status || "PENDING").toLowerCase()}`}>
                            {s.status === "PRESENT" ? "✓ Present" : s.status === "ABSENT" ? "✕ Absent" : "◷ Pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <section className="card">
            <div className="card-heading">
              <div className="section-icon">✓</div>
              <div><h2>Recent Scans</h2><p>Students marked present this session</p></div>
            </div>
            <div className="history">
              {scanHistory.map((s, i) => (
                <div className="history-item" key={`${s.roll}-${i}`}>
                  <div className="history-check">✓</div>
                  <div className="history-info">
                    <strong>{s.roll} — {s.name}</strong>
                    <span>at {s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Finalize */}
        {students.length > 0 && session && (
          <section className={finalized ? "finalize-card finalized-card" : "finalize-card"}>
            {!finalized ? (
              <>
                <div>
                  <span className="finalize-label">FINAL STEP</span>
                  <h3>Finish today's attendance</h3>
                  <p>Pending students will be marked absent.</p>
                </div>
                <button className="danger-button" onClick={handleFinalize} disabled={loading}>
                  {loading ? "Finalizing..." : "Submit & Mark Absent"}
                </button>
              </>
            ) : (
              <div className="finalized-content">
                <div className="finalized-icon">🔒</div>
                <div>
                  <span>CLOSED</span>
                  <h3>Today's attendance is finalized</h3>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Smart Attendance System</p>
        <span>Teacher: {teacher.teacherId}</span>
      </footer>
    </div>
  );
}

export default App;