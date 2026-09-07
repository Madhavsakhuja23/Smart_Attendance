import { useCallback, useEffect, useState } from "react";

import Login from "./components/Login";
import QRGenerator from "./components/QRGenerator";
import QRScanner from "./components/QRScanner";

import {
    getTeacherClasses,
    getTeacherProfile
} from "./api/backendApi";

import {
    fetchStudents,
    createSession,
    sendEmails,
    markPresent,
    finalizeDay,
    getAttendanceStatus
} from "./services/api";

import "./App.css";


function App() {

    // =========================
    // TEACHER STATE
    // =========================

    const [teacher, setTeacher] = useState(null);

    const [classes, setClasses] = useState([]);

    const [checkingAuth, setCheckingAuth] = useState(true);

    const [loadingClasses, setLoadingClasses] =
        useState(false);

    const [classError, setClassError] =
        useState("");

        useEffect(() => {

    const restoreLogin = async () => {

        const token =
            sessionStorage.getItem("token");

        // No token means the teacher is not logged in.
        if (!token) {

            setCheckingAuth(false);

            return;
        }


        try {

            // Ask backend who owns this JWT.
            const profile =
                await getTeacherProfile(token);


            // Restore teacher information.
            setTeacher(
                profile.teacher
            );


            // Load this teacher's classes.
            setLoadingClasses(true);

            setClassError("");


            const classesResult =
                await getTeacherClasses(token);


            setClasses(
                classesResult.classes || []
            );


        } catch (error) {

            console.error(
                "Session restore error:",
                error
            );


            // Token may be expired/invalid.
            sessionStorage.removeItem("token");

            setTeacher(null);

            setClasses([]);


        } finally {

            setLoadingClasses(false);

            setCheckingAuth(false);
        }
    };


    restoreLogin();

}, []);

    // =========================
    // ATTENDANCE STATE
    // =========================

    const [className, setClassName] =
        useState("");

    const [students, setStudents] =
        useState([]);

    const [session, setSession] =
        useState(null);

    const [scannerOpen, setScannerOpen] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [scanHistory, setScanHistory] =
        useState([]);

    const [finalized, setFinalized] =
        useState(false);

    const [attendanceSummary, setAttendanceSummary] =
        useState(null);


    // =========================
    // COUNTS
    // =========================

    const presentCount =
        students.filter(
            student => student.status === "PRESENT"
        ).length;


    const pendingCount =
        students.filter(
            student =>
                !student.status ||
                student.status === "PENDING"
        ).length;


    const absentCount =
        students.filter(
            student => student.status === "ABSENT"
        ).length;


    // =========================
    // LOGIN
    // =========================

    const handleLogin = async (teacherData) => {

        setTeacher(teacherData);

        const token =
            sessionStorage.getItem("token");

        if (!token) {
            setClassError(
                "Login token not found."
            );
            return;
        }

        try {

            setLoadingClasses(true);
            setClassError("");

            const result =
                await getTeacherClasses(token);

            setClasses(
                result.classes || []
            );

        } catch (error) {

            console.error(
                "Class loading error:",
                error
            );

            setClassError(
                error.message
            );

        } finally {

            setLoadingClasses(false);
        }
    };


    // =========================
    // LOGOUT
    // =========================

    const handleLogout = () => {

        sessionStorage.removeItem("token");

        setTeacher(null);
        setClasses([]);
        setClassName("");
        setStudents([]);
        setSession(null);
        setScannerOpen(false);
        setScanHistory([]);
        setFinalized(false);
        setAttendanceSummary(null);
        setMessage("");
        setClassError("");
    };


    // =========================
    // SELECT CLASS
    // =========================

    const handleClassChange = (event) => {

        const selectedClass =
            event.target.value;

        setClassName(selectedClass);

        // Reset previous attendance
        // whenever teacher changes class.

        setStudents([]);
        setSession(null);
        setScannerOpen(false);
        setScanHistory([]);
        setFinalized(false);
        setAttendanceSummary(null);
        setMessage("");
    };


    // =========================
    // GET STUDENTS
    // =========================

    async function handleGetStudents() {

        if (!className) {

            setMessage(
                "Please select a class first."
            );

            return;
        }


        try {

            setLoading(true);
            setMessage("");


            // Load the roster and today's existing attendance
            // independently from the Google Sheet.
            const [studentsResult, statusResult] =
                await Promise.all([
                    fetchStudents(className),
                    getAttendanceStatus(className)
                ]);


            const attendanceMap = new Map(
                (statusResult.students || []).map(student => [
                    String(student.roll).trim(),
                    student.status || "PENDING"
                ])
            );


            const formatted =
                (studentsResult.students || []).map(student => ({
                    ...student,
                    status:
                        attendanceMap.get(
                            String(student.roll).trim()
                        ) || "PENDING"
                }));


            setStudents(formatted);
            setAttendanceSummary(statusResult);


            // The sheet is the source of truth. If today's
            // attendance is already finalized, keep the page
            // read-only until another date is used.
            setFinalized(Boolean(statusResult.finalized));


            setSession(null);
            setScannerOpen(false);
            setScanHistory([]);


            if (statusResult.finalized) {

                setMessage(
                    `Today's attendance is already finalized. Present: ${statusResult.present}, Absent: ${statusResult.absent}.`
                );

            } else {

                setMessage(
                    `${formatted.length} students loaded. Present: ${statusResult.present}, Absent: ${statusResult.absent}, Pending: ${statusResult.pending}.`
                );
            }


        } catch (error) {

            console.error(
                "Fetch students/attendance status error:",
                error
            );


            setMessage(
                `❌ ${error.message}`
            );


        } finally {

            setLoading(false);
        }
    }


    // =========================
    // CREATE ATTENDANCE SESSION
    // =========================

    async function handleCreateSession() {

        if (!students.length) {

            setMessage(
                "Please load student details first."
            );

            return;
        }

        if (finalized) {

            setMessage(
                "Today's attendance has already been finalized."
            );

            return;
        }


        try {

            setLoading(true);
            setMessage("");


            const result =
                await createSession(
                    className
                );


            setSession(
                result.session
            );


            setMessage(
                "Attendance session created successfully. You can now generate and dispatch QR codes."
            );


        } catch (error) {

            console.error(
                "Create session error:",
                error
            );

            setMessage(
                `❌ ${error.message}`
            );


        } finally {

            setLoading(false);
        }
    }


    // =========================
    // QR SCAN
    // =========================

    const handleScan = useCallback(
        async (qrData) => {

            if (!session || finalized) {

                throw new Error(
                    "Attendance session is not active."
                );
            }


            try {

                setMessage(
                    "Verifying attendance..."
                );


                const result =
                    await markPresent({

                        className,

                        rollNumber:
                            qrData.rollNumber,

                        date:
                            qrData.date,

                        sessionId:
                            qrData.sessionId
                    });


                // Update student status

                setStudents(previous =>
                    previous.map(student =>
                        String(student.roll) ===
                        String(result.student.roll)

                            ? {
                                ...student,
                                status: "PRESENT"
                            }

                            : student
                    )
                );

                setAttendanceSummary(previous => previous ? ({
                    ...previous,
                    present: Math.min(
                        previous.total,
                        (previous.present || 0) + 1
                    ),
                    pending: Math.max(
                        0,
                        (previous.pending || 0) - 1
                    )
                }) : previous);


                // Add scan history

                setScanHistory(previous => [

                    {
                        roll:
                            result.student.roll,

                        name:
                            result.student.name,

                        time:
                            new Date()
                                .toLocaleTimeString()
                    },

                    ...previous

                ]);


                setMessage(
                    `✅ Attendance marked for Roll ${result.student.roll}`
                );


                return result;


            } catch (error) {

                console.error(
                    "Attendance error:",
                    error
                );


                setMessage(
                    `❌ ${error.message}`
                );


                throw error;
            }

        },

        [
            className,
            session,
            finalized
        ]
    );


    // =========================
    // FINALIZE ATTENDANCE
    // =========================

    async function handleFinalize() {

        if (!session) {

            setMessage(
                "Create an attendance session first."
            );

            return;
        }


        const confirmed =
            window.confirm(
                `Finalize attendance?\n\nPresent: ${presentCount}\nPending: ${pendingCount}\n\nAll pending students will be marked absent.`
            );


        if (!confirmed) {
            return;
        }


        try {

            setLoading(true);
            setMessage("");


            const result =
                await finalizeDay({

                    className,

                    sessionId:
                        session.sessionId
                });


            setFinalized(true);

            setScannerOpen(false);


            // Pending → Absent

            setStudents(previous =>
                previous.map(student => ({

                    ...student,

                    status:
                        student.status === "PRESENT"
                            ? "PRESENT"
                            : "ABSENT"

                }))
            );

            setAttendanceSummary(previous => previous ? ({
                ...previous,
                present: result.present,
                absent: result.absent,
                pending: 0,
                finalized: true
            }) : previous);


            setMessage(
                `✅ Attendance finalized. Present: ${result.present}, Absent: ${result.absent}`
            );


        } catch (error) {

            console.error(
                "Finalize error:",
                error
            );

            setMessage(
                `❌ ${error.message}`
            );


        } finally {

            setLoading(false);
        }
    }


    // =========================
    // LOGIN PAGE
    // =========================

   if (checkingAuth) {

    return (
        <div className="auth-loading">

            <div className="auth-loading-spinner"></div>

            <h2>
                Smart Attendance
            </h2>

            <p>
                Checking your session...
            </p>

        </div>
    );
}


if (!teacher) {

    return (
        <Login
            onLogin={handleLogin}
        />
    );
}

    // =========================
    // DASHBOARD
    // =========================

    return (

        <div className="app">

            {/* =========================
                HEADER
            ========================= */}

            <header className="header">

                <div className="brand-area">

                    <div className="brand-icon">
                        ✓
                    </div>

                    <div>

                        <h1>
                            Smart Attendance
                        </h1>

                        <p>
                            QR-Based Attendance Management
                        </p>

                    </div>

                </div>


                <div className="header-right">

                    <div className="teacher-mini">

                        <div className="teacher-avatar">
                            {teacher.name
                                ?.charAt(0)
                                ?.toUpperCase()}
                        </div>

                        <div>

                            <strong>
                                {teacher.name}
                            </strong>

                            <span>
                                {teacher.teacherId}
                            </span>

                        </div>

                    </div>


                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            <main className="dashboard-main">

                {/* =========================
                    WELCOME
                ========================= */}

                <section className="welcome-section">

                    <div>

                        <p className="welcome-label">
                            TEACHER DASHBOARD
                        </p>

                        <h2>
                            Good to see you,{" "}
                            {teacher.name?.split(" ")[0]} 👋
                        </h2>

                        <p>
                            Manage your classroom attendance
                            quickly and securely.
                        </p>

                    </div>


                    <div className="today-card">

                        <span>
                            TODAY
                        </span>

                        <strong>
                            {new Date().toLocaleDateString(
                                "en-IN",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                }
                            )}
                        </strong>

                    </div>

                </section>


                {/* =========================
                    TEACHER INFORMATION
                ========================= */}

                <section className="teacher-info-card">

                    <div className="section-title">

                        <div className="section-icon">
                            👤
                        </div>

                        <div>

                            <h3>
                                Teacher Profile
                            </h3>

                            <p>
                                Your account information
                            </p>

                        </div>

                    </div>


                    <div className="teacher-details">

                        <div>

                            <span>
                                NAME
                            </span>

                            <strong>
                                {teacher.name}
                            </strong>

                        </div>


                        <div>

                            <span>
                                TEACHER ID
                            </span>

                            <strong>
                                {teacher.teacherId}
                            </strong>

                        </div>


                        <div>

                            <span>
                                EMAIL
                            </span>

                            <strong>
                                {teacher.email}
                            </strong>

                        </div>


                        <div>

                            <span>
                                LOGIN TIME
                            </span>

                            <strong>

                                {teacher.lastLoginAt
                                    ? new Date(
                                        teacher.lastLoginAt
                                    ).toLocaleTimeString(
                                        "en-IN",
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        }
                                    )
                                    : "Just now"}

                            </strong>

                        </div>

                    </div>

                </section>


                {/* =========================
                    CLASS SELECTION
                ========================= */}

                <section className="card">

                    <div className="card-heading">

                        <div className="step-number">
                            1
                        </div>

                        <div>

                            <h2>
                                Select Class
                            </h2>

                            <p>
                                Choose the class you want
                                to take attendance for.
                            </p>

                        </div>

                    </div>


                    {loadingClasses && (

                        <div className="loading-box">

                            <div className="spinner"></div>

                            Loading your classes...

                        </div>

                    )}


                    {classError && (

                        <div className="error-message">

                            ❌ {classError}

                        </div>

                    )}


                    {!loadingClasses &&
                        !classError && (

                            <div className="class-controls">

                                <div className="select-wrapper">

                                    <label>
                                        CLASS GROUP
                                    </label>

                                    <select
                                        value={className}
                                        onChange={
                                            handleClassChange
                                        }
                                        disabled={loading}
                                    >

                                        <option value="">
                                            Select a class
                                        </option>


                                        {classes.map(
                                            classItem => (

                                                <option
                                                    value={classItem}
                                                    key={classItem}
                                                >
                                                    {classItem}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                <button
                                    className="primary-button"
                                    onClick={
                                        handleGetStudents
                                    }
                                    disabled={
                                        loading ||
                                        !className
                                    }
                                >

                                    {loading
                                        ? "Loading..."
                                        : "Load Students"}

                                </button>

                            </div>

                        )}

                </section>


                {/* =========================
                    STATISTICS
                ========================= */}

                {students.length > 0 && (

                    <section className="stats">

                        <div className="stat-card">

                            <div className="stat-icon total-icon">
                                👥
                            </div>

                            <div>

                                <span>
                                    TOTAL STUDENTS
                                </span>

                                <strong>
                                    {attendanceSummary?.total ?? students.length}
                                </strong>

                            </div>

                        </div>


                        <div className="stat-card">

                            <div className="stat-icon present-icon">
                                ✓
                            </div>

                            <div>

                                <span>
                                    PRESENT
                                </span>

                                <strong>
                                    {attendanceSummary?.present ?? presentCount}
                                </strong>

                            </div>

                        </div>


                        <div className="stat-card">

                            <div className="stat-icon pending-icon">
                                ◷
                            </div>

                            <div>

                                <span>
                                    PENDING
                                </span>

                                <strong>
                                    {attendanceSummary?.pending ?? pendingCount}
                                </strong>

                            </div>

                        </div>


                        <div className="stat-card">

                            <div className="stat-icon absent-icon">
                                !
                            </div>

                            <div>

                                <span>
                                    ABSENT
                                </span>

                                <strong>
                                    {attendanceSummary?.absent ?? absentCount}
                                </strong>

                            </div>

                        </div>

                    </section>

                )}


                {/* =========================
                    ATTENDANCE SESSION
                ========================= */}

                {students.length > 0 && !finalized && (

                    <section className="card">

                        <div className="card-heading">

                            <div className="step-number">
                                2
                            </div>

                            <div>

                                <h2>
                                    Attendance Session
                                </h2>

                                <p>
                                    Start a new attendance
                                    session for {className}.
                                </p>

                            </div>

                        </div>


                        {!session ? (

                            <div className="session-start-box">

                                <div className="session-icon">
                                    📋
                                </div>

                                <div className="session-content">

                                    <h3>
                                        Ready to take attendance?
                                    </h3>

                                    <p>
                                        Create a session first.
                                        After that, you can
                                        generate personalized
                                        QR codes for your students.
                                    </p>

                                </div>


                                <button
                                    className="primary-button"
                                    onClick={
                                        handleCreateSession
                                    }
                                    disabled={loading}
                                >

                                    {loading
                                        ? "Creating..."
                                        : "Create Attendance Session"}

                                </button>

                            </div>

                        ) : (

                            <div className="session-active-box">

                                <div className="success-icon">
                                    ✓
                                </div>

                                <div>

                                    <span className="session-status">
                                        SESSION ACTIVE
                                    </span>

                                    <h3>
                                        Attendance session is ready
                                    </h3>

                                    <p>
                                        You can now generate
                                        and dispatch QR codes.
                                    </p>

                                </div>

                            </div>

                        )}

                    </section>

                )}


                {/* =========================
                    QR GENERATOR
                ========================= */}

                {session && !finalized && (

                    <section className="card qr-card">

                        <div className="card-heading">

                            <div className="step-number">
                                3
                            </div>

                            <div>

                                <h2>
                                    QR Code Distribution
                                </h2>

                                <p>
                                    Send personalized QR codes
                                    to students.
                                </p>

                            </div>

                        </div>


                        <QRGenerator

                            students={students}

                            className={className}

                            date={session.date}

                            sessionId={
                                session.sessionId
                            }

                            onComplete={() => {

                                setMessage(
                                    "✅ QR codes have been dispatched successfully."
                                );

                            }}

                        />

                    </section>

                )}


                {/* =========================
                    LIVE SCANNER
                ========================= */}

                {session && !finalized && (

                    <section className="card">

                        <div className="card-heading">

                            <div className="step-number">
                                4
                            </div>

                            <div>

                                <h2>
                                    Live Attendance
                                </h2>

                                <p>
                                    Scan student QR codes
                                    to mark attendance.
                                </p>

                            </div>

                        </div>


                        {!scannerOpen ? (

                            <button
                                className="scanner-button"
                                onClick={() =>
                                    setScannerOpen(true)
                                }
                            >

                                <span>
                                    📷
                                </span>

                                Open Live QR Scanner

                            </button>

                        ) : (

                            <div className="scanner-area">

                                <div className="scanner-header">

                                    <div>

                                        <span className="live-dot"></span>

                                        <strong>
                                            Scanner Active
                                        </strong>

                                    </div>


                                    <button
                                        className="close-button"
                                        onClick={() =>
                                            setScannerOpen(false)
                                        }
                                    >
                                        Close Scanner
                                    </button>

                                </div>


                                <QRScanner
                                    onScan={handleScan}
                                />

                            </div>

                        )}

                    </section>

                )}


                {/* =========================
                    MESSAGE
                ========================= */}

                {message && (

                    <div
                        className={
                            message.startsWith("❌")
                                ? "error-message"
                                : "success-message"
                        }
                    >

                        {message}

                    </div>

                )}


                {/* =========================
                    FINALIZED STATUS BANNER
                ========================= */}

                {students.length > 0 && finalized && (

                    <div className="success-message">
                        🔒 Today's attendance is finalized.
                        The status below is loaded directly
                        from the attendance sheet.
                    </div>

                )}


                {/* =========================
                    STUDENT TABLE
                ========================= */}

                {students.length > 0 && (

                    <section className="card">

                        <div className="card-heading table-heading">

                            <div className="step-number">
                                5
                            </div>

                            <div>

                                <h2>
                                    Student Attendance
                                </h2>

                                <p>
                                    Live attendance status
                                    for {className}.
                                </p>

                            </div>

                        </div>


                        <div className="table-container">

                            <table>

                                <thead>

                                    <tr>

                                        <th>
                                            ROLL NO
                                        </th>

                                        <th>
                                            STUDENT NAME
                                        </th>

                                        <th>
                                            EMAIL
                                        </th>

                                        <th>
                                            STATUS
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {students.map(
                                        student => (

                                            <tr
                                                key={
                                                    student.roll
                                                }
                                            >

                                                <td>
                                                    <strong>
                                                        {student.roll}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {student.name}
                                                </td>

                                                <td className="email-cell">
                                                    {student.email}
                                                </td>

                                                <td>

                                                    <span
                                                        className={
                                                            `status-badge ${(
                                                                student.status ||
                                                                "PENDING"
                                                            ).toLowerCase()}`
                                                        }
                                                    >

                                                        {student.status ===
                                                            "PRESENT"
                                                            ? "✓ Present"
                                                            : student.status ===
                                                                "ABSENT"
                                                                ? "✕ Absent"
                                                                : "◷ Pending"}

                                                    </span>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </section>

                )}


                {/* =========================
                    SCAN HISTORY
                ========================= */}

                {scanHistory.length > 0 && (

                    <section className="card">

                        <div className="card-heading">

                            <div className="section-icon">
                                ✓
                            </div>

                            <div>

                                <h2>
                                    Recent Attendance
                                </h2>

                                <p>
                                    Latest students marked present.
                                </p>

                            </div>

                        </div>


                        <div className="history">

                            {scanHistory.map(
                                (scan, index) => (

                                    <div
                                        className="history-item"
                                        key={
                                            `${scan.roll}-${index}`
                                        }
                                    >

                                        <div className="history-check">
                                            ✓
                                        </div>


                                        <div className="history-info">

                                            <strong>
                                                {scan.roll} —{" "}
                                                {scan.name}
                                            </strong>

                                            <span>
                                                Marked present at{" "}
                                                {scan.time}
                                            </span>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </section>

                )}


                {/* =========================
                    FINALIZE
                ========================= */}

                {students.length > 0 && session && (

                    <section
                        className={
                            finalized
                                ? "finalize-card finalized-card"
                                : "finalize-card"
                        }
                    >

                        {!finalized ? (

                            <>

                                <div>

                                    <span className="finalize-label">
                                        FINAL STEP
                                    </span>

                                    <h3>
                                        Finish today's attendance
                                    </h3>

                                    <p>
                                        Students who are still
                                        pending will automatically
                                        be marked absent.
                                    </p>

                                </div>


                                <button
                                    className="danger-button"
                                    onClick={
                                        handleFinalize
                                    }
                                    disabled={loading}
                                >

                                    {loading
                                        ? "Finalizing..."
                                        : "Submit & Mark Absentees"}

                                </button>

                            </>

                        ) : (

                            <div className="finalized-content">

                                <div className="finalized-icon">
                                    🔒
                                </div>

                                <div>

                                    <span>
                                        ATTENDANCE CLOSED
                                    </span>

                                    <h3>
                                        Today's attendance
                                        has been finalized.
                                    </h3>

                                </div>

                            </div>

                        )}

                    </section>

                )}

            </main>


            {/* =========================
                FOOTER
            ========================= */}

            <footer className="footer">

                <p>
                    Smart Attendance System
                </p>

                <span>
                    Teacher: {teacher.teacherId}
                </span>

            </footer>

        </div>
    );
}


export default App;