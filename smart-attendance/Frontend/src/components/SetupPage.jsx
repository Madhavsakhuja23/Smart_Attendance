import { useEffect, useState } from "react";

import {
    generatePairingCode,
    getAddonConnectionStatus,
    createAttendanceCommand,
    getAttendanceCommandResult
} from "../services/api";


export default function SetupPage({
    teacher,
    onLogout,
    onSetupComplete
}) {

    const [pairingCode, setPairingCode] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    const [connected, setConnected] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState(null);

    const [loadingCode, setLoadingCode] = useState(false);
    const [checkingConnection, setCheckingConnection] =
        useState(false);

    const [error, setError] = useState("");


    // ==========================================
    // CHECK CURRENT CONNECTION
    // ==========================================

const checkConnection = async () => {

    setCheckingConnection(true);
    setError("");

    try {

        // ==========================================
        // STEP 1: CHECK CONNECTION
        // ==========================================

        const result =
            await getAddonConnectionStatus();


        if (!result.connected) {

            setConnected(false);
            setConnectionInfo(null);

            return;
        }


        // ==========================================
        // STEP 2: CONNECTION EXISTS
        // ==========================================

        setConnected(true);


        // ==========================================
        // STEP 3: ASK ADD-ON TO SYNC CLASSES
        // ==========================================

        const command =
            await createAttendanceCommand(
                "SYNC_CLASSES",
                {}
            );


        if (
            !command ||
            !command.commandId
        ) {
            throw new Error(
                "Unable to start class synchronization."
            );
        }


        // ==========================================
        // STEP 4: WAIT FOR ADD-ON
        // ==========================================

        let commandResult = null;

        const maxAttempts = 40;

        for (
            let attempt = 0;
            attempt < maxAttempts;
            attempt++
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );


            commandResult =
                await getAttendanceCommandResult(
                    command.commandId
                );


            if (
                commandResult.commandStatus ===
                "COMPLETED"
            ) {
                break;
            }


            if (
                commandResult.commandStatus ===
                "FAILED"
            ) {
                throw new Error(
                    commandResult.errorMessage ||
                    "Class synchronization failed."
                );
            }
        }


        // ==========================================
        // STEP 5: VERIFY RESULT
        // ==========================================

        if (
            !commandResult ||
            commandResult.commandStatus !==
            "COMPLETED"
        ) {
            throw new Error(
                "Class synchronization timed out. Please make sure the Smart Attendance add-on is open in Google Sheets."
            );
        }


        const syncedClasses =
            commandResult.result?.classes || [];


        // ==========================================
        // STEP 6: UPDATE UI
        // ==========================================

        setConnectionInfo({
            ...result.teacher,
            classes:
                syncedClasses
        });


        setConnected(true);


    } catch (error) {

        console.error(
            "Connection/sync error:",
            error
        );

        setError(
            error.message ||
            "Unable to check connection."
        );

    } finally {

        setCheckingConnection(false);

    }
};


    // ==========================================
    // CHECK ON PAGE LOAD
    // ==========================================

    useEffect(() => {
        checkConnection();
    }, []);


    // ==========================================
    // GENERATE PAIRING CODE
    // ==========================================

    const handleGenerateCode = async () => {

        setLoadingCode(true);
        setError("");

        try {

            const result =
                await generatePairingCode();

            setPairingCode(
                result.pairingCode
            );

            setExpiresAt(
                result.expiresAt
            );

        } catch (error) {

            setError(
                error.message ||
                "Unable to generate pairing code."
            );

        } finally {

            setLoadingCode(false);
        }
    };


    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="setup-page">

            <div className="setup-container">

                {/* Header */}

                <div className="setup-header">

                    <div className="setup-brand">

                        <div className="brand-icon">
                            ✓
                        </div>

                        <h1>
                            Smart Attendance
                        </h1>

                    </div>

                    <button
                        className="logout-button"
                        onClick={onLogout}
                    >
                        Logout
                    </button>

                </div>


                {/* Welcome */}

                <div className="setup-welcome-card">

                    <div className="setup-welcome-icon">
                        🎉
                    </div>

                    <div>

                        <h2>
                            Welcome,{" "}
                            {teacher.name?.split(" ")[0]}!
                        </h2>

                        <p>
                            Complete the setup below to
                            connect your Google Spreadsheet
                            with Smart Attendance.
                        </p>

                    </div>

                </div>


                {/* Error */}

                {error && (

                    <div
                        className="setup-error"
                        style={{
                            marginBottom: "20px",
                            padding: "15px",
                            borderRadius: "8px"
                        }}
                    >
                        {error}
                    </div>

                )}


                {/* Already Connected */}

                {connected ? (

                    <div className="setup-steps-card">

                        <div className="setup-steps-heading">

                            <div className="section-icon">
                                ✅
                            </div>

                            <div>

                                <h3>
                                    Setup Complete
                                </h3>

                                <p>
                                    Your Google Spreadsheet
                                    is connected.
                                </p>

                            </div>

                        </div>


                        <div
                            style={{
                                padding: "20px"
                            }}
                        >

                            <p>
                                <strong>
                                    Google Account:
                                </strong>
                                <br />
                                {connectionInfo?.googleEmail}
                            </p>

                            <p>
                                <strong>
                                    Spreadsheet:
                                </strong>
                                <br />
                                {connectionInfo?.spreadsheetName}
                            </p>

                            <p>
                                <strong>
                                    Classes:
                                </strong>
                                <br />
                                {connectionInfo?.classes?.length
                                    ? connectionInfo.classes.join(", ")
                                    : "No classes synchronized yet."
                                }
                            </p>

                            <button
                                onClick={() =>
                                    onSetupComplete &&
                                    onSetupComplete({
                                        connected: true,
                                        teacher: connectionInfo
                                    })
                                }
                            >
                                Go to Dashboard
                            </button>

                        </div>

                    </div>

                ) : (

                    <div className="setup-steps-card">

                        <div className="setup-steps-heading">

                            <div className="section-icon">
                                ⚙️
                            </div>

                            <div>

                                <h3>
                                    Setup Required
                                </h3>

                                <p>
                                    Connect your Google
                                    Spreadsheet in three steps.
                                </p>

                            </div>

                        </div>


                        <div className="setup-steps-list">


                            {/* STEP 1 */}

                            <div className="setup-step">

                                <div className="step-number">
                                    1
                                </div>

                                <div className="step-content">

                                    <h4>
                                        Install Smart Attendance
                                    </h4>

                                    <p>
                                        Install the Smart Attendance
                                        Google Sheets Add-on.
                                    </p>

                                    <a
                                        href="https://workspace.google.com/marketplace/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="setup-action-button"
                                    >
                                        Install Add-on
                                    </a>

                                </div>

                                <span className="step-status">
                                    Required
                                </span>

                            </div>


                            {/* STEP 2 */}

                            <div className="setup-step">

                                <div className="step-number">
                                    2
                                </div>

                                <div className="step-content">

                                    <h4>
                                        Generate Pairing Code
                                    </h4>

                                    <p>
                                        Generate a temporary code,
                                        then enter it in the
                                        Smart Attendance Add-on
                                        inside your Google Sheet.
                                    </p>


                                    <button
                                        onClick={
                                            handleGenerateCode
                                        }
                                        disabled={
                                            loadingCode
                                        }
                                        className="setup-action-button"
                                    >

                                        {loadingCode
                                            ? "Generating..."
                                            : "Generate Pairing Code"
                                        }

                                    </button>


                                    {pairingCode && (

                                        <div
                                            style={{
                                                marginTop: "15px"
                                            }}
                                        >

                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    marginBottom: "5px"
                                                }}
                                            >
                                                Your pairing code:
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: "28px",
                                                    fontWeight: "700",
                                                    letterSpacing: "2px"
                                                }}
                                            >
                                                {pairingCode}
                                            </div>

                                            {expiresAt && (

                                                <small>
                                                    Expires at:{" "}
                                                    {new Date(
                                                        expiresAt
                                                    ).toLocaleString()}
                                                </small>

                                            )}

                                        </div>

                                    )}

                                </div>

                                <span className="step-status">
                                    Required
                                </span>

                            </div>


                            {/* STEP 3 */}

                            <div className="setup-step">

                                <div className="step-number">
                                    3
                                </div>

                                <div className="step-content">

                                    <h4>
                                        Verify Connection
                                    </h4>

                                    <p>
                                        After entering the pairing
                                        code in Google Sheets,
                                        verify your connection.
                                    </p>


                                    <button
                                        onClick={
                                            checkConnection
                                        }
                                        disabled={
                                            checkingConnection
                                        }
                                        className="setup-action-button"
                                    >

                                        {checkingConnection
                                            ? "Checking..."
                                            : "Check Connection"
                                        }

                                    </button>

                                </div>

                                <span className="step-status">
                                    {checkingConnection
                                        ? "Checking"
                                        : "Waiting"
                                    }
                                </span>

                            </div>

                        </div>

                    </div>

                )}


                {/* Instructions */}

                {!connected && (

                    <div className="setup-info-banner">

                        <div className="setup-info-icon">
                            ℹ️
                        </div>

                        <div>

                            <strong>
                                How to connect your Google Sheet
                            </strong>

                            <p>
                                Open the Google Spreadsheet
                                where you keep your attendance
                                data. Then open:
                            </p>

                            <p>
                                <strong>
                                    Extensions → Smart Attendance
                                    → Connect Smart Attendance
                                </strong>
                            </p>

                            <p>
                                Enter the pairing code generated
                                above. Once connected, return here
                                and click "Check Connection".
                            </p>

                        </div>

                    </div>

                )}


                {/* Account Info */}

                <div className="setup-account-card">

                    <h4>
                        Your Account
                    </h4>

                    <div className="setup-account-details">

                        <div>
                            <span>NAME</span>
                            <strong>
                                {teacher.name}
                            </strong>
                        </div>

                        <div>
                            <span>ID</span>
                            <strong>
                                {teacher.teacherId}
                            </strong>
                        </div>

                        <div>
                            <span>EMAIL</span>
                            <strong>
                                {teacher.email}
                            </strong>
                        </div>

                        <div>
                            <span>STATUS</span>
                            <strong className="setup-status-active">
                                Active
                            </strong>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}