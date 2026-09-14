export default function About() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>About Smart Attendance System</h1>
                <p className="subtitle">Smart Attendance System is designed for use with Google Sheets™ to modernize classroom management.</p>

                <section style={{ marginTop: "25px" }}>
                    <h2>Our Mission</h2>
                    <p>
                        Smart Attendance System was built to eliminate paper-based roll calls and tedious manual data entry. 
                        By seamlessly bridging Google Sheets™ with real-time web tools, educators save valuable classroom time 
                        while maintaining total control over their student records.
                    </p>
                </section>

                <section>
                    <h2>Key Features</h2>
                    <ul>
                        <li><strong>Google Sheets™ Native Integration:</strong> Roster data stays in your spreadsheet; attendance is recorded directly into your sheet tabs.</li>
                        <li><strong>Instant QR Attendance:</strong> High-speed QR scanner marks attendance in seconds.</li>
                        <li><strong>Automated Email Dispatch:</strong> Generate and distribute unique QR codes to students automatically.</li>
                        <li><strong>Secure Command Bridge:</strong> Enterprise-grade security with SHA-256 pairing and JWT protection.</li>
                    </ul>
                </section>

                <p style={{ marginTop: "30px", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    Google Sheets™ is a trademark of Google LLC. Smart Attendance System is an independent application designed for integration with Google Sheets™.
                </p>
            </div>
        </div>
    );
}
