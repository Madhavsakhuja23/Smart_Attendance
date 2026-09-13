export default function About() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>About Smart Attendance</h1>
                <p className="subtitle">Modernizing classroom management with automated, real-time Google Sheets integration.</p>

                <section style={{ marginTop: "25px" }}>
                    <h2>Our Mission</h2>
                    <p>
                        Smart Attendance was built to eliminate paper-based roll calls and tedious manual data entry. By seamlessly bridging Google Sheets with real-time web tools, educators save valuable classroom time while maintaining total control over their student records.
                    </p>
                </section>

                <section>
                    <h2>Key Features</h2>
                    <ul>
                        <li><strong>Google Sheets Native Integration:</strong> Roster data stays in your spreadsheet; attendance is recorded directly into your sheet tabs.</li>
                        <li><strong>Instant QR Attendance:</strong> High-speed QR scanner marks attendance in seconds.</li>
                        <li><strong>Automated Email Dispatch:</strong> Generate and distribute unique QR codes to students automatically.</li>
                        <li><strong>Secure Command Bridge:</strong> Enterprise-grade security with SHA-256 pairing and JWT protection.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
