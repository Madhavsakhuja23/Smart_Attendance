import { SMART_ATTENDANCE_ADDON_URL } from "../config";

export default function GoogleSheets() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Smart Attendance System for Google Sheets™</h1>
                <p className="subtitle">Learn how Smart Attendance System integrates with your Google Spreadsheets.</p>

                <div style={{ marginTop: "20px", marginBottom: "30px" }}>
                    <a
                        href={SMART_ATTENDANCE_ADDON_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ display: "inline-block", padding: "12px 24px", borderRadius: "8px", textDecoration: "none" }}
                    >
                        Install Add-on from Google Workspace Marketplace ↗
                    </a>
                </div>

                <section style={{ marginTop: "25px" }}>
                    <h2>How the Add-on Integration Works</h2>
                    <p>
                        The Smart Attendance System Google Sheets™ Add-on acts as a background command listener. Once paired with your account, 
                        it polls pending commands (such as fetching student lists or recording present students) and executes them directly inside your Google Sheet.
                    </p>
                </section>

                <section>
                    <h2>Setup Instructions</h2>
                    <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                        <li>Open your Google Spreadsheet containing class rosters (each sheet tab named after a class).</li>
                        <li>Go to <strong>Extensions → Smart Attendance → Connect Smart Attendance</strong> inside Google Sheets™.</li>
                        <li>Log into your account on the Smart Attendance System Web Portal and navigate to Setup.</li>
                        <li>Click <strong>Generate Pairing Code</strong> on the website and enter the 6-digit code inside the Google Sheets™ Add-on sidebar.</li>
                        <li>Click <strong>Pair Add-on</strong>. Your spreadsheet is now securely linked!</li>
                    </ol>
                </section>

                <section>
                    <h2>Spreadsheet Structure Guidelines</h2>
                    <p>Each sheet tab should represent a class with column headers: <strong>Roll No</strong>, <strong>Name</strong>, <strong>Email</strong>.</p>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ and Google Workspace™ are trademarks of Google LLC. Smart Attendance System is an independent application designed for use with Google Sheets™.
                </p>
            </div>
        </div>
    );
}
